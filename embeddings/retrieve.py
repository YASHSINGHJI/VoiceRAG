"""
retrieve.py
───────────
Full RAG pipeline:
  1. Embed user query with Ollama bge-m3
  2. Retrieve top-k chunks via cosine similarity
  3. Feed chunks as context to an LLM (Ollama) to generate an answer

Usage:
    python embeddings/retrieve.py
"""

import json
import requests
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

HERE            = Path(__file__).parent
PARQUET_FILE    = HERE / "embeddings.parquet"

OLLAMA_URL      = "http://localhost:11434"
EMBED_MODEL     = "bge-m3"
CHAT_MODEL      = "llama3"      # change to any model you have pulled in Ollama
                                # e.g. "gemma2:2b", "llama3.2:3b", "mistral"

TOP_K           = 3             # chunks to retrieve
TEXT_PREVIEW    = 300           # chars shown in retrieval display


# ── Embedding ─────────────────────────────────────────────────────────────────

def get_embedding(text: str) -> np.ndarray:
    """Embed a single string using Ollama bge-m3."""
    resp = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=120,
    )
    resp.raise_for_status()
    return np.array(resp.json()["embedding"], dtype=np.float32)


# ── Data loading ──────────────────────────────────────────────────────────────

def load_embeddings(path: Path) -> tuple[pd.DataFrame, np.ndarray]:
    """Load parquet and return (metadata DataFrame, embedding matrix)."""
    print(f"Loading embeddings from {path} ...")
    df = pd.read_parquet(path)
    embedding_matrix = np.stack(df["embedding"].to_numpy()).astype(np.float32)
    meta = df.drop(columns=["embedding"])
    print(f"  Loaded {len(df)} chunks  |  embedding dim: {embedding_matrix.shape[1]}\n")
    return meta, embedding_matrix


# ── Retrieval ─────────────────────────────────────────────────────────────────

def search(query: str, meta: pd.DataFrame, matrix: np.ndarray, top_k: int = TOP_K) -> pd.DataFrame:
    """Embed query, compute cosine similarity, return top-k rows."""
    query_vec = get_embedding(query)
    scores    = cosine_similarity(query_vec.reshape(1, -1), matrix)[0]
    results   = meta.copy()
    results["score"] = scores
    return results.sort_values("score", ascending=False).head(top_k).reset_index(drop=True)


# ── Generation ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are an expert AI teaching assistant for an Artificial Intelligence course. "
    "Answer the student's question using ONLY the lecture transcript excerpts provided below. "
    "Be clear, accurate, and educational. "
    "If the context does not contain enough information to answer, say so honestly."
)

def build_prompt(query: str, results: pd.DataFrame) -> str:
    """Assemble the context + question into a single prompt string."""
    context_blocks = []
    for _, row in results.iterrows():
        block = (
            f"[Video {int(row['video_number'])}: {row['video_title']} | "
            f"{row['start']}s - {row['end']}s]\n"
            f"{row['text']}"
        )
        context_blocks.append(block)

    context = "\n\n---\n\n".join(context_blocks)
    return (
        f"CONTEXT FROM LECTURE TRANSCRIPTS:\n\n"
        f"{context}\n\n"
        f"---\n\n"
        f"STUDENT QUESTION: {query}\n\n"
        f"ANSWER:"
    )


def generate_answer(query: str, results: pd.DataFrame) -> None:
    """
    Send the prompt to the LLM and stream the response token-by-token.
    Uses Ollama /api/generate with stream=True.
    """
    prompt = build_prompt(query, results)

    print(f"\n{'='*70}")
    print(f"  ANSWER  (via {CHAT_MODEL})")
    print(f"{'='*70}\n")

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

    # Stream tokens as they arrive
    for line in resp.iter_lines():
        if not line:
            continue
        chunk = json.loads(line)
        print(chunk.get("response", ""), end="", flush=True)
        if chunk.get("done"):
            break

    print(f"\n\n{'='*70}")


# ── Display retrieved chunks ──────────────────────────────────────────────────

def pretty_print_sources(results: pd.DataFrame) -> None:
    """Print the retrieved source chunks used as context."""
    print(f"\n{'─'*70}")
    print(f"  SOURCES  (top {len(results)} retrieved chunks)")
    print(f"{'─'*70}")
    for rank, row in results.iterrows():
        print(f"\n  #{rank+1}  Score: {row['score']:.4f}  |  "
              f"[{int(row['video_number'])}] {row['video_title']}  |  "
              f"{row['start']}s -> {row['end']}s")
        preview = row["text"][:TEXT_PREVIEW].replace("\n", " ")
        if len(row["text"]) > TEXT_PREVIEW:
            preview += "..."
        print(f"  {preview}")
    print(f"{'─'*70}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def check_chat_model() -> bool:
    """Verify CHAT_MODEL is available in Ollama. Print available models if not."""
    try:
        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
        models = [m["name"] for m in resp.json().get("models", [])]
        # Match by base name (e.g. "llama3" matches "llama3:latest")
        if any(CHAT_MODEL in m for m in models):
            return True
        print(f"[error] Chat model '{CHAT_MODEL}' is not installed in Ollama.")
        print(f"Available models: {models}")
        print(f"\nTo install a model, run:  ollama pull gemma2:2b")
        print(f"Then update CHAT_MODEL in retrieve.py to match.\n")
        return False
    except Exception as e:
        print(f"[warn] Could not verify chat model: {e}")
        return True  # proceed anyway


def main():
    meta, matrix = load_embeddings(PARQUET_FILE)
    print(f"Chat model : {CHAT_MODEL}")
    print(f"Embed model: {EMBED_MODEL}")
    print(f"Top-K      : {TOP_K}")

    chat_ok = check_chat_model()
    if not chat_ok:
        print("Generation will be skipped until a chat model is available.\n")

    print("Type your question and press Enter. Type 'quit' to exit.\n")

    while True:
        query = input("Question > ").strip()

        if not query:
            continue
        if query.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        try:
            print(f"\nSearching for relevant context ...", flush=True)
            results = search(query, meta, matrix)
            pretty_print_sources(results)
            generate_answer(query, results)
        except Exception as e:
            print(f"[error] {e}")

        print()


if __name__ == "__main__":
    main()
