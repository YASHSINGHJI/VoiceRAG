"""
app.py
──────
Flask API server for VoiceRAG.

Endpoints:
  GET  /api/health                    – health check
  POST /api/query                     – RAG query (non-streaming)
  POST /api/query/stream              – RAG query (SSE streaming)
  GET  /api/lectures                  – all lectures with metadata
  GET  /api/lectures/<vid>/chunks     – chunks for one lecture
  POST /api/search                    – similarity search only (no LLM)
  GET  /api/analytics                 – session analytics + static stats

Usage:
    pip install flask flask-cors
    python app.py
"""

from __future__ import annotations

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from typing import Iterator
import json
from datetime import datetime

# ── Import the RAG pipeline from the 'embeddings' package ────────────────────
from embeddings.retrieve import (
    load_embeddings,
    search,
    build_prompt,
    get_embedding,
    PARQUET_FILE,
    CHAT_MODEL,
    EMBED_MODEL,
    SYSTEM_PROMPT,
    OLLAMA_URL,
    TOP_K,
)

import requests
import numpy as np
import pandas as pd

# ── Flask setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# Load embeddings once at startup
print("Loading embeddings...")
META, MATRIX = load_embeddings(PARQUET_FILE)
print(f"Ready. {len(META)} chunks loaded.\n")

# ── Pre-compute lecture metadata from the META DataFrame ──────────────────────
_lecture_df = (
    META.groupby(["video_number", "video_title"])
    .agg(
        chunk_count=("text", "count"),
        duration_seconds=("end", "max"),
    )
    .reset_index()
    .sort_values("video_number")
)
LECTURES = _lecture_df.to_dict(orient="records")

# ── In-memory query log for analytics (resets on restart) ────────────────────
QUERY_LOG: list[dict] = []


# ── Helpers ───────────────────────────────────────────────────────────────────
def _rows_to_sources(df: pd.DataFrame, preview_len: int = 300) -> list[dict]:
    return [
        {
            "video_number": int(r["video_number"]),
            "video_title":  str(r["video_title"]),
            "start":        float(r["start"]),
            "end":          float(r["end"]),
            "score":        float(r["score"]),
            "preview":      str(r["text"])[:preview_len],
            "text":         str(r["text"]),
        }
        for _, r in df.iterrows()
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# Health
# ═══════════════════════════════════════════════════════════════════════════════
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "chunks": len(META), "chat_model": CHAT_MODEL})


# ═══════════════════════════════════════════════════════════════════════════════
# Lectures
# ═══════════════════════════════════════════════════════════════════════════════
@app.route("/api/lectures", methods=["GET"])
def lectures():
    """Return metadata for all 30 lectures."""
    return jsonify(LECTURES)


@app.route("/api/lectures/<int:video_number>/chunks", methods=["GET"])
def lecture_chunks(video_number: int):
    """Return transcript chunks for a single lecture (paginated)."""
    page  = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))

    subset = META[META["video_number"] == video_number].sort_values("start")
    total  = len(subset)

    start_idx = (page - 1) * limit
    page_df   = subset.iloc[start_idx : start_idx + limit]

    chunks = [
        {
            "start": float(r["start"]),
            "end":   float(r["end"]),
            "text":  str(r["text"]),
        }
        for _, r in page_df.iterrows()
    ]
    return jsonify({"total": total, "page": page, "limit": limit, "chunks": chunks})


# ═══════════════════════════════════════════════════════════════════════════════
# Search (no LLM generation)
# ═══════════════════════════════════════════════════════════════════════════════
@app.route("/api/search", methods=["POST"])
def similarity_search():
    """Embed query and return top-k ranked chunks — no LLM involved."""
    data  = request.get_json(force=True)
    query = (data.get("query") or "").strip()
    top_k = int(data.get("top_k", TOP_K))

    if not query:
        return jsonify({"error": "No query provided"}), 400

    try:
        results = search(query, META, MATRIX, top_k=min(top_k, 20))
        return jsonify({"results": _rows_to_sources(results)})
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to Ollama for embeddings."}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# Analytics
# ═══════════════════════════════════════════════════════════════════════════════
@app.route("/api/analytics", methods=["GET"])
def analytics():
    """Return session query log + static lecture stats."""
    # Aggregate query log
    total_queries = len(QUERY_LOG)
    avg_score = (
        round(sum(q["avg_score"] for q in QUERY_LOG) / total_queries, 4)
        if total_queries > 0 else 0
    )

    # Most queried lectures (from session)
    from collections import Counter
    lecture_hits: Counter = Counter()
    score_history = []
    for q in QUERY_LOG:
        for src in q.get("sources", []):
            lecture_hits[src["video_title"]] += 1
        score_history.append({"idx": q["idx"], "score": q["avg_score"],
                               "timestamp": q["timestamp"]})

    most_queried = [
        {"video_title": t, "hits": c}
        for t, c in lecture_hits.most_common(8)
    ]

    return jsonify({
        "total_queries":   total_queries,
        "avg_score":       avg_score,
        "lectures":        LECTURES,
        "query_log":       QUERY_LOG[-50:],   # last 50
        "most_queried":    most_queried,
        "score_history":   score_history,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# RAG Query  (non-streaming)
# ═══════════════════════════════════════════════════════════════════════════════
@app.route("/api/query", methods=["POST"])
def query():
    data     = request.get_json(force=True)
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "No question provided"}), 400

    try:
        results = search(question, META, MATRIX, top_k=TOP_K)
        sources = _rows_to_sources(results)

        prompt = build_prompt(question, results)
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": CHAT_MODEL, "system": SYSTEM_PROMPT,
                  "prompt": prompt, "stream": False},
            timeout=300,
        )
        resp.raise_for_status()
        answer = resp.json().get("response", "").strip()

        # Log to analytics
        avg_score = round(float(results["score"].mean()), 4) if len(results) else 0
        QUERY_LOG.append({
            "idx":       len(QUERY_LOG) + 1,
            "question":  question,
            "avg_score": avg_score,
            "sources":   sources[:3],
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })

        return jsonify({"answer": answer, "sources": sources})

    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to Ollama."}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# RAG Query  (SSE streaming)
# ═══════════════════════════════════════════════════════════════════════════════
@app.route("/api/query/stream", methods=["POST"])
def query_stream():
    data     = request.get_json(force=True)
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "No question provided"}), 400

    def generate() -> Iterator[str]:
        try:
            results = search(question, META, MATRIX, top_k=TOP_K)
            sources = _rows_to_sources(results)

            yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

            prompt = build_prompt(question, results)
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": CHAT_MODEL, "system": SYSTEM_PROMPT,
                      "prompt": prompt, "stream": True},
                stream=True, timeout=300,
            )
            resp.raise_for_status()

            full_answer = []
            for line in resp.iter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                token = chunk.get("response", "")
                if token:
                    full_answer.append(token)
                    yield f"event: token\ndata: {json.dumps(token)}\n\n"
                if chunk.get("done"):
                    break

            yield "event: done\ndata: {}\n\n"

            # Log to analytics
            avg_score = round(float(results["score"].mean()), 4) if len(results) else 0
            QUERY_LOG.append({
                "idx":       len(QUERY_LOG) + 1,
                "question":  question,
                "avg_score": avg_score,
                "sources":   sources[:3],
                "timestamp": datetime.now().isoformat(timespec="seconds"),
            })

        except requests.exceptions.ConnectionError:
            msg = "Cannot connect to Ollama. Make sure it is running on localhost:11434."
            yield f"event: error\ndata: {json.dumps(msg)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
