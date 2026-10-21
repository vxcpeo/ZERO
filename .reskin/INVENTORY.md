# Reskin inventory — @fractio/website

Generated: 2026-10-21T17:03:46.943Z

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

- Archetype: **gallery-scroll** (spatial)
- Traits: table, grid, tabs, modal, charts, sticky, gallery
- Max template depth: 10
- Top-level tags: div, div, div, div, div, div, section, div, div, nav, article, footer, div, div, div, div, div, div

The replacement skeleton must not be `gallery-scroll` and must not be in the same family (`spatial`).

## Routes

- `/`
- `/art`
- `/art/:id` _(dynamic)_
- `/dashboard`
- `/docs`
- `/mine`

## Palette (most used first)

`#fff6f0` (6) · `#ffffff` (6) · `#ffe3d6` (4) · `#161616` (3) · `#d3c1b7` (3) · `#0e3d26` (2) · `#6b0010` (2) · `#1e6b47` (1) · `#3d3733` (1) · `#4a2500` (1)

## Content lock

- Static visible text tokens: **1003**
- Binding expressions: **406**
- Event handlers: **43**
- Contract hash: `ebe0707becf28d063a0894f558fdb8f617fc98ed410a7bb4e9afe6a8ed466853`

Everything in `.reskin/content-contract.json` is immutable: visible copy, placeholders, labels, routes, link targets, asset sources, bindings, handlers, API endpoints and i18n values. A reskin may move these tokens to new markup but may not rewrite, remove or hide them.

## Next

```bash
node scripts/choose-style.mjs --project "E:/workspace/chuangye/solana/zero/website" --out .reskin
node scripts/verify.mjs baseline --project "E:/workspace/chuangye/solana/zero/website" --out .reskin
```

Then rewrite the UI and run `verify.mjs check`.
