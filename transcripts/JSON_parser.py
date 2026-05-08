import json
from pathlib import Path
from dataclasses import dataclass, asdict

JSON3_DIR   = Path(__file__).parent / "JSON3"
OUTPUT_FILE = Path(__file__).parent.parent / "embeddings" / "chunks.json"

CHUNK_SIZE = 200   # words per chunk
OVERLAP    = 40    # words overlap between consecutive chunks

# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class Chunk:
    video_number: int
    video_title:  str
    start: float
    end:   float
    text:  str

# ── Core parser ───────────────────────────────────────────────────────────────

def parse_json3(filepath: Path, chunk_size: int = CHUNK_SIZE) -> list[dict]:
    """Parse a single .json3 file and return a list of word dicts."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    words = []
    for event in data.get("events", []):
        if "segs" not in event or "tStartMs" not in event:
            continue

        event_start_ms = event["tStartMs"]

        for seg in event["segs"]:
            text = seg.get("utf8", "").strip()
            if not text or text.startswith("["):
                continue

            offset_ms    = seg.get("tOffsetMs", 0)
            word_start_s = round((event_start_ms + offset_ms) / 1000, 2)
            word_end_s   = round((event_start_ms + offset_ms + event.get("dDurationMs", 1000)) / 1000, 2)

            words.append({"text": text, "start": word_start_s, "end": word_end_s})

    return words


def chunk_words(
    words: list[dict],
    video_number: int,
    video_title: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = OVERLAP,
) -> list[Chunk]:
    """Sliding-window chunker with overlap."""
    chunks = []
    i = 0
    step = max(1, chunk_size - overlap)

    while i < len(words):
        window   = words[i : i + chunk_size]
        combined = " ".join(w["text"] for w in window)
        chunks.append(Chunk(
            video_number = video_number,
            video_title  = video_title,
            start        = window[0]["start"],
            end          = window[-1]["end"],
            text         = combined,
        ))
        i += step

    return chunks

# ── Batch pipeline ─────────────────────────────────────────────────────────────

def run_all():
    all_chunks: list[dict] = []

    json3_files = sorted(JSON3_DIR.glob("*.json3"))
    print(f"Found {len(json3_files)} JSON3 files.\n")

    for filepath in json3_files:
        # Parse video_number and video_title from filename
        # e.g. "01_1. Introduction and Scope.en.json3"
        stem         = filepath.name.split(".en.json3")[0]          # "01_1. Introduction and Scope"
        seq_str, _, title_part = stem.partition("_")                # "01", "1. Introduction and Scope"
        video_number = int(seq_str)
        video_title  = title_part.strip()

        words  = parse_json3(filepath)
        chunks = chunk_words(words, video_number=video_number, video_title=video_title)

        all_chunks.extend(asdict(c) for c in chunks)
        safe_name = filepath.name.encode("ascii", errors="replace").decode("ascii")
        print(f"  [{video_number:>2}] {safe_name:<58}  {len(words):>5} words  ->  {len(chunks):>3} chunks")

    # Save output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\nDone. {len(all_chunks)} total chunks saved to:\n  {OUTPUT_FILE}")


if __name__ == "__main__":
    run_all()