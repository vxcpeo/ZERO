"""Report classes used in templates that the new stylesheet does not style yet."""
import re
from pathlib import Path

SRC = Path(r"E:\workspace\chuangye\solana\zero\website\src")
css = (SRC / "styles/ct.css").read_text(encoding="utf-8")
defined = set(re.findall(r"\.(ct-[A-Za-z0-9_-]+)", css))
used = {}
for path in sorted(SRC.rglob("*.vue")):
    text = path.read_text(encoding="utf-8")
    start = text.find("<template>")
    if start == -1:
        continue
    body = text[start:]
    for match in re.finditer(r'class="([^"]*)"', body):
        for token in match.group(1).split():
            if token.startswith("ct-"):
                used.setdefault(token, set()).add(path.name)

missing = {k: v for k, v in used.items() if k not in defined}
print(f"defined {len(defined)} | used {len(used)} | missing {len(missing)}")
for name in sorted(missing):
    print(f"  {name:<22} {', '.join(sorted(missing[name]))}")
