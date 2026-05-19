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
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
if os.environ.get("GEMINI_API_KEY"):
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# ── Config ────────────────────────────────────────────────────────────────────

HERE            = Path(__file__).parent
PARQUET_FILE    = HERE / "embeddings.parquet"

OLLAMA_URL      = "http://localhost:11434"
EMBED_MODEL     = "bge-m3"
CHAT_MODEL      = "gemini-2.5-flash"

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
    embedding_matrix = np.stack(df["embedding"].tolist()).astype(np.float32)
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
    Uses Gemini API with stream=True.
    """
    prompt = build_prompt(query, results)

    print(f"\n{'='*70}")
    print(f"  ANSWER  (via {CHAT_MODEL})")
    print(f"{'='*70}\n")

    model = genai.GenerativeModel(
        model_name=CHAT_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )
    response = model.generate_content(prompt, stream=True)
    
    for chunk in response:
        print(chunk.text, end="", flush=True)

    print(f"\n\n{'='*70}")


# ── Display retrieved chunks ──────────────────────────────────────────────────

def pretty_print_sources(results: pd.DataFrame) -> None:
    """Print the retrieved source chunks used as context."""
    print(f"\n{'─'*70}")
    print(f"  SOURCES  (top {len(results)} retrieved chunks)")
    print(f"{'─'*70}")
    for i, (_, row) in enumerate(results.iterrows()):
        print(f"\n  #{i+1}  Score: {row['score']:.4f}  |  "
              f"[{int(row['video_number'])}] {row['video_title']}  |  "
              f"{row['start']}s -> {row['end']}s")
        preview = row["text"][:TEXT_PREVIEW].replace("\n", " ")
        if len(row["text"]) > TEXT_PREVIEW:
            preview += "..."
        print(f"  {preview}")
    print(f"{'─'*70}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def check_chat_model() -> bool:
    """Verify GEMINI_API_KEY is available."""
    if not os.environ.get("GEMINI_API_KEY"):
        print("[error] GEMINI_API_KEY not found in environment variables.")
        print("Please copy .env.example to .env and set your API key.")
        return False
    return True


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
