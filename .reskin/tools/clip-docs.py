"""Clip the very tall docs screenshots into reviewable slices."""
from pathlib import Path

from PIL import Image

CURRENT = Path(r"E:\workspace\chuangye\solana\zero\website\.reskin\current")
BASE = Path(r"E:\workspace\chuangye\solana\zero\website\.reskin\baseline")
OUT = Path(r"E:\workspace\chuangye\solana\zero\website\.reskin\review")
OUT.mkdir(parents=True, exist_ok=True)

plan = {
    "docs-desktop": [(0, 1500), (1500, 1500), (6800, 1600)],
    "docs-mobile": [(0, 1600), (4000, 1600)],
}


def clip(source: Path, stem: str, prefix: str) -> None:
    image = Image.open(source)
    for index, (top, height) in enumerate(plan[stem], start=1):
        box = (0, top, image.width, min(top + height, image.height))
        if box[1] <= box[3]:
            crop = image.crop(box)
            target = OUT / f"{prefix}-{stem}-part{index}.png"
            crop.save(target)
            print(target.name, crop.size)


for stem in plan:
    for folder in (CURRENT, BASE):
        source = folder / f"{stem}.png"
        if source.exists():
            prefix = "current" if folder == CURRENT else "baseline"
            clip(source, stem, prefix)
