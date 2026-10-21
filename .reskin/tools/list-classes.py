import re
from collections import Counter
from pathlib import Path

ROOT = Path(r"E:\workspace\chuangye\solana\zero\website\src")
counter = Counter()
files = Counter()
for path in sorted(ROOT.rglob("*.vue")):
    text = path.read_text(encoding="utf-8")
    for match in re.finditer(r'class="([^"]*)"', text):
        for token in match.group(1).split():
            if token.startswith("po-"):
                counter[token] += 1
                files[token] += 0
print("unique", len(counter))
for name, count in sorted(counter.items()):
    print(f"{count:>3} {name}")
