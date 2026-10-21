"""Rename the presentation classes in the two long-form views (content untouched).

`DocsView.vue` (1,594 lines) and `ArtworkDetailView.vue` (941 lines) are documents: their prose,
tables, code blocks and conditional branches are content, so the reskin keeps the markup and the
class names are rewritten instead of the copy being retyped. `po-*` (the old poster layer) becomes
`ct-*` (the Cosmos Orbit / Documentary Ledger layer); every selector is new, so no old stylesheet
rule can reach them.

Only `<template>` is touched, and only inside class attributes (`class="…"` and `:class="…"`),
so prose, code samples and script logic are byte-identical.

The outer composition of both files is then edited by hand (masthead lede + marginal contents +
ledger chapters), because that is the part that has to change structurally.

Usage: python .reskin/tools/rename-classes.py
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

PROJECT = Path(r"E:\workspace\chuangye\solana\zero\website")
TARGETS = [
    PROJECT / "src/views/DocsView.vue",
    PROJECT / "src/views/ArtworkDetailView.vue",
]
CLASS_ATTR = re.compile(r'(?::?class)="([^"]*)"')


def rename_value(value: str) -> str:
    if "po-" not in value:
        return value
    return re.sub(r"(?<![\w-])po-", "ct-", value)


def main() -> int:
    produced: Counter[str] = Counter()
    for path in TARGETS:
        text = path.read_text(encoding="utf-8")
        start = text.index("<template>")
        head, body = text[:start], text[start:]
        body = CLASS_ATTR.sub(lambda m: m.group(0).replace(m.group(1), rename_value(m.group(1))), body)
        updated = head + body
        path.write_text(updated, encoding="utf-8", newline="")
        for match in CLASS_ATTR.finditer(body):
            for token in re.findall(r"[\w-]+", match.group(1)):
                if token.startswith("ct-"):
                    produced[token] += 1
        print(f"{path.name}: {len(CLASS_ATTR.findall(body))} class attributes rewritten")
    print("\nclasses now used by the long-form views:")
    for name, count in sorted(produced.items()):
        print(f"{count:>3} {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
