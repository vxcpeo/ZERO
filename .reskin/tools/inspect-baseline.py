import json
from pathlib import Path

d = json.loads(Path(r"E:\workspace\chuangye\solana\zero\website\.reskin\baseline\pages.json").read_text(encoding="utf-8"))
for key, page in d["pages"].items():
    if page.get("skipped"):
        print(key, "SKIPPED")
        continue
    desktop = page["desktop"]
    marks = [f"{l['tag']}:{l['role']}" for l in desktop["landmarks"]]
    print(key, "->", marks)
    print(
        "   classes",
        len(desktop["classTokens"]),
        "fingerprint",
        len(desktop["fingerprint"]),
        "words",
        len(desktop["words"]),
        "attrs",
        len(desktop.get("attrs") or []),
    )
    print("   top classes:", ", ".join(desktop["classTokens"][:30]))
