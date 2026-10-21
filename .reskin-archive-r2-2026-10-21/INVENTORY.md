# Reskin inventory — @tessella/website

Generated: 2026-10-19T18:49:27.645Z

## Project

| Field | Value |
|---|---|
| Root | `E:/workspace/chuangye/solana/zero/website` |
| Vue | ^3.5.13 |
| Package manager | pnpm |
| Nuxt | no |
| CSS frameworks | none detected |
| Files scanned | 27 (15 SFCs) |

## Original skeleton

- Archetype: **orbital** (spatial)
- Traits: sidebar, cards, hero, table, grid, tabs, modal, charts, sticky, orbital, ticker, gallery
- Max template depth: 10
- Top-level tags: div, div, div, div, div, div, div, div, div, article, footer, nav, div, div, div, div, div, div

The replacement skeleton must not be `orbital` and must not be in the same family (`spatial`).

## Routes

- `/`
- `/art`
- `/art/:id` _(dynamic)_
- `/dashboard`
- `/docs`
- `/mine`

## Palette (most used first)

`#ffffff` (29) · `#e6006f` (9) · `#0f7b4d` (3) · `#0d0d0d` (2) · `#8a5a00` (2) · `#c2005d` (2) · `#fff5fa` (2) · `#fff8fb` (2) · `#0b5f3c` (1) · `#45424a` (1)

## Content lock

- Static visible text tokens: **1003**
- Binding expressions: **406**
- Event handlers: **43**
- Contract hash: `4fb49879ad0949de208520b1b4f90876d6962c0e6f88f6f0c5276c63b67ca0bd`

Everything in `.reskin/content-contract.json` is immutable: visible copy, placeholders, labels, routes, link targets, asset sources, bindings, handlers, API endpoints and i18n values. A reskin may move these tokens to new markup but may not rewrite, remove or hide them.

## Next

```bash
node scripts/choose-style.mjs --project "E:/workspace/chuangye/solana/zero/website" --out .reskin
node scripts/verify.mjs baseline --project "E:/workspace/chuangye/solana/zero/website" --out .reskin
```

Then rewrite the UI and run `verify.mjs check`.
