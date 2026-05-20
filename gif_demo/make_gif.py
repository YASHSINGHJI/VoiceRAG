"""
make_gif.py — Stitches frames/*.png into voicerag_demo.gif using Pillow.
Usage:  python make_gif.py
Output: voicerag_demo.gif (in the gif_demo directory)
"""
import glob
import os
from PIL import Image

FRAMES_DIR = os.path.join(os.path.dirname(__file__), "frames")
OUT_PATH   = os.path.join(os.path.dirname(__file__), "voicerag_demo.gif")

# Collect frames sorted
frames = sorted(glob.glob(os.path.join(FRAMES_DIR, "frame_*.png")))
print(f"Found {len(frames)} frames")

if not frames:
    print("No frames found! Run capture.js first.")
    exit(1)

imgs = []
for f in frames:
    img = Image.open(f).convert("RGBA")
    img = img.resize((960, 540), Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)
    imgs.append(img)

print(f"Creating GIF at {OUT_PATH} ...")

# Save as GIF — frame duration ~80ms → ~12fps
imgs[0].save(
    OUT_PATH,
    save_all=True,
    append_images=imgs[1:],
    optimize=False,
    duration=80,       # ms per frame
    loop=0,            # infinite loop
)

size_mb = os.path.getsize(OUT_PATH) / (1024 * 1024)
print(f"OK Done! {OUT_PATH} ({size_mb:.1f} MB)")
