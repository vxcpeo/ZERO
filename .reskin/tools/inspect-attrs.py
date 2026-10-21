import json
from pathlib import Path

d = json.loads(Path(r"E:\workspace\chuangye\solana\zero\website\.reskin\baseline\pages.json").read_text(encoding="utf-8"))
for key, page in d["pages"].items():
    if page.get("skipped"):
        continue
    desktop = page["desktop"]
    print(f"== {key} ==")
    print("  attrs:")
    for item in desktop.get("attrs") or []:
        print(f"    {item['key']} x{item['count']}")
    print("  forms:")
    for item in desktop.get("forms") or []:
        print(f"    {item['key']} x{item['count']}")
    print("  links:")
    for item in desktop.get("links") or []:
        print(f"    {item['href']} x{item['count']}")
