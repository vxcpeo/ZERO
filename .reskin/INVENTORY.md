# Reskin inventory — @cimela/website

Generated: 2026-11-09T16:47:29.066Z

## Project

| Field | Value |
|---|---|
| Root | `E:/workspace/chuangye/solana/zero/website` |
| Vue | ^3.5.13 |
| Package manager | pnpm |
| Nuxt | no |
| CSS frameworks | none detected |
| Files scanned | 26 (14 SFCs) |

## Original skeleton

- Archetype: **topnav-marketing** (editorial)
- Traits: topbar, cards, hero, table, grid, tabs, modal, charts, sticky, gallery
- Max template depth: 9
- Top-level tags: div, div, div, div, div, div, section, div, div, footer, article, div, div, div, div, div, div

The replacement skeleton must not be `topnav-marketing` and must not be in the same family (`editorial`).

## Routes

- `/`
- `/art`
- `/art/:id` _(dynamic)_
- `/dashboard`
- `/docs`
- `/mine`

## Palette (most used first)

`#40b3ff` (12) · `#ffffff` (8) · `#001018` (4) · `#05060b` (4) · `#0d0e16` (3) · `#12131d` (3) · `#5ce1a0` (3) · `#a78bfa` (3) · `#ff8a8a` (3) · `#a3a1b5` (2)

## Content lock

- Static visible text tokens: **1003**
- Binding expressions: **406**
- Event handlers: **43**
- Contract hash: `fd3681cef91aaf4c5c35c8c6dc2f45c47746cb37fcc2e62346f4631573dbc941`

Everything in `.reskin/content-contract.json` is immutable: visible copy, placeholders, labels, routes, link targets, asset sources, bindings, handlers, API endpoints and i18n values. A reskin may move these tokens to new markup but may not rewrite, remove or hide them.

## Next

```bash
node scripts/choose-style.mjs --project "E:/workspace/chuangye/solana/zero/website" --out .reskin
node scripts/verify.mjs baseline --project "E:/workspace/chuangye/solana/zero/website" --out .reskin
```

Then rewrite the UI and run `verify.mjs check`.
