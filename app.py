"""
app.py
──────
Flask API server for VoiceRAG.

Endpoints:
  POST /api/query   – receive a question, run RAG, return answer + sources
  GET  /api/health  – health check

Usage:
    pip install flask flask-cors
    python app.py
"""

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import json
from pathlib import Path

# ── Import the RAG pipeline from the 'embeddings' package ────────────────────
# embeddings/__init__.py makes this a proper package importable from the root.
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

# ── Flask setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)  # Allow React dev server (localhost:3000) to reach this API

# Load embeddings once at startup (avoid re-loading on every request)
print("Loading embeddings...")
META, MATRIX = load_embeddings(PARQUET_FILE)
print(f"Ready. {len(META)} chunks loaded.\n")


# ── Health check ──────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "chunks": len(META), "chat_model": CHAT_MODEL})


# ── Main query endpoint (non-streaming) ───────────────────────────────────────
@app.route("/api/query", methods=["POST"])
def query():
    data = request.get_json(force=True)
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    try:
        # 1. Retrieve relevant chunks
        results = search(question, META, MATRIX, top_k=TOP_K)

        # 2. Build sources list for the response
        sources = []
        for _, row in results.iterrows():
            sources.append({
                "video_number": int(row["video_number"]),
                "video_title":  str(row["video_title"]),
                "start":        float(row["start"]),
                "end":          float(row["end"]),
                "score":        float(row["score"]),
                "preview":      str(row["text"])[:300],
            })

        # 3. Generate answer from LLM (non-streaming, collect full response)
        prompt = build_prompt(question, results)
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model":  CHAT_MODEL,
                "system": SYSTEM_PROMPT,
                "prompt": prompt,
                "stream": False,
            },
            timeout=300,
        )
        resp.raise_for_status()
        answer = resp.json().get("response", "").strip()

        return jsonify({"answer": answer, "sources": sources})

    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Cannot connect to Ollama. Make sure Ollama is running on localhost:11434."
        }), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Streaming query endpoint ───────────────────────────────────────────────────
@app.route("/api/query/stream", methods=["POST"])
def query_stream():
    """
    Same as /api/query but streams the LLM answer token-by-token using
    Server-Sent Events (SSE).  The sources are sent first as a special event,
    then each token is sent as a 'token' event, and finally a 'done' event.
    """
    data = request.get_json(force=True)
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    def generate():
        try:
            results = search(question, META, MATRIX, top_k=TOP_K)

            sources = []
            for _, row in results.iterrows():
                sources.append({
                    "video_number": int(row["video_number"]),
                    "video_title":  str(row["video_title"]),
                    "start":        float(row["start"]),
                    "end":          float(row["end"]),
                    "score":        float(row["score"]),
                    "preview":      str(row["text"])[:300],
                })

            # Send sources first
            yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

            # Stream LLM tokens
            prompt = build_prompt(question, results)
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model":  CHAT_MODEL,
                    "system": SYSTEM_PROMPT,
                    "prompt": prompt,
                    "stream": True,
                },
                stream=True,
                timeout=300,
            )
            resp.raise_for_status()

            for line in resp.iter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                token = chunk.get("response", "")
                if token:
                    yield f"event: token\ndata: {json.dumps(token)}\n\n"
                if chunk.get("done"):
                    break

            yield "event: done\ndata: {}\n\n"

        except requests.exceptions.ConnectionError:
            msg = "Cannot connect to Ollama. Make sure it is running on localhost:11434."
            yield f"event: error\ndata: {json.dumps(msg)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
