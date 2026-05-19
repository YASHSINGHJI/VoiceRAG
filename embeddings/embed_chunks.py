"""
embed_chunks.py
───────────────
Reads chunks.json, embeds every chunk with Ollama bge-m3,
and saves the result as a pandas DataFrame (Parquet + CSV preview).

Usage:
    python embeddings/embed_chunks.py
"""

import json
import time
import requests
import pandas as pd
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

HERE         = Path(__file__).parent
CHUNKS_FILE  = HERE / "chunks.json"
OUT_PARQUET  = HERE / "embeddings.parquet"
OUT_CSV      = HERE / "embeddings_preview.csv"   # first 10 rows, no embedding column (for quick inspection)

OLLAMA_URL   = "http://localhost:11434/api/embeddings"
MODEL        = "bge-m3"
RETRY_LIMIT  = 3
RETRY_DELAY  = 2   # seconds between retries

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_embedding(text: str) -> list[float]:
    """Call Ollama bge-m3 and return the embedding vector."""
    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            resp = requests.post(
                OLLAMA_URL,
                json={"model": MODEL, "prompt": text},
                timeout=120,
            )
            resp.raise_for_status()
            return resp.json()["embedding"]
        except Exception as e:
            print(f"    [warn] attempt {attempt}/{RETRY_LIMIT} failed: {e}")
            if attempt < RETRY_LIMIT:
                time.sleep(RETRY_DELAY)
    raise RuntimeError(f"Embedding failed after {RETRY_LIMIT} attempts.")


# ── Main pipeline ─────────────────────────────────────────────────────────────

def main():
    # 1. Load chunks
    print(f"Loading chunks from {CHUNKS_FILE} ...")
    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    print(f"  {len(chunks)} chunks loaded.\n")

    # 2. Build DataFrame skeleton
    df = pd.DataFrame(chunks)   # columns: video_number, video_title, start, end, text

    # 3. Embed each chunk
    embeddings = []
    total = len(df)

    for i, (_, row) in enumerate(df.iterrows(), start=1):
        label = f"[{i:>4}/{total}] video {row['video_number']:>2} | {float(row['start']):>8.2f}s"
        print(f"{label}  →  embedding ...", end="\r", flush=True)

        emb = get_embedding(row["text"])
        embeddings.append(emb)

    print(f"\nAll {total} chunks embedded. Embedding dimension: {len(embeddings[0])}")

    # 4. Add embedding column
    df["embedding"] = embeddings

    # 5. Save as Parquet (preserves list dtype efficiently)
    df.to_parquet(OUT_PARQUET, index=False)
    print(f"\nSaved full DataFrame (with embeddings) to:\n  {OUT_PARQUET}")

    # 6. Save a CSV preview (drop embedding column — too wide for CSV)
    df.drop(columns=["embedding"]).head(10).to_csv(OUT_CSV, index=False)
    print(f"Saved 10-row preview (no embeddings) to:\n  {OUT_CSV}")

    # 7. Print a quick summary
    print("\n── DataFrame info ──────────────────────────────")
    print(df.drop(columns=["embedding"]).to_string(max_rows=5, max_cols=10))
    print(f"\nShape: {df.shape}  |  columns: {list(df.columns)}")
    print(f"Embedding dim: {len(embeddings[0]) if embeddings else 0}")


if __name__ == "__main__":
    main()
