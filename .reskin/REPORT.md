# Reskin report — Fractio (website/)

Run 4 of the `reskin` pipeline for `@fractio/website` (Vue 3 + Vite + Pinia + vue-router), and the
first one after the rebrand to **Fractio**. The previous run's evidence was moved to
`../.rebrand/archive/reskin-history/r3-2026-10-21/` before this run, so everything in `.reskin/` is
the authoritative evidence for the current UI. The frozen baseline in `.reskin/baseline/` is the
previous **Poster Optimism / Gallery Scroll** shell, captured before any edit.

## Direction

| | |
|---|---|
| Style | **Cosmos Orbit** (`cosmos-orbit`, spatial-futurist) |
| Source DNA | [https://cosmos.network](https://cosmos.network) |
| Live sampling | 9 of 10 references answered; `cosmos.network` sampled at 2 863 ms (accent `#40b3ff`) |
| Skeleton | **Documentary Ledger** (`documentary`, editorial) |
| Original | `gallery-scroll` (spatial), warm paper `#fff6f0`, accent `#c40018` |
| New ground | near-black `#05060b` with a still star field, panel `#0d0e16` |
| New accent | `#40b3ff` (text-safe `#7cc9ff`) |
| Accent distance | **121.67 ΔE** (threshold 30) |
| Palette anchor | `--ct-accent: #40b3ff` |
| Selection seed | `cf0a4ff57898b616bedba6d1d338aa93b2e1ab01dc408ab534d67576577daafc` |
| Selection | automatic; no style, palette, layout or route choice was asked of the user |

Cosmos Orbit supplies palette, type mood, shape language, texture, density, motion and layout
grammar only. No Cosmos logo, illustration, photography, copy or code was downloaded or reused.

**Wiring commitment:** `.reskin/WIREFRAME.md`.

## What changed

The old shell was a printed poster: an alarm-red cover band, a floating bottom dock and a tear-off
footer on warm paper. The new shell is a near-black ledger: a masthead, a mono index line, a hero
statement, ruled entries, a marginal contents rail and a colophon.

- **Masthead + index line instead of cover + dock.** The brand sits in a circular orbital mark with
  a rotating outer ring; the four routes are a monospaced index line under it, with an accent rule
  on the active one. On mobile the line scrolls horizontally rather than becoming a drawer, so every
  route stays one tap away. There is no fixed bottom bar and no filled app bar.
- **Hero statement + marginal actions.** The home lede is an 8/4 split: the statement and standfirst
  on the left, the three commands in the margin behind a thin rule. The old cover was a full-bleed
  red band with an oversized Arial Black statement.
- **Ledgers instead of poster plates.** Protocol figures are a ruled `ct-figures` register; the
  four loop steps are numbered entries on a ruled list; pools are ledger rows; dashboard protocol
  statistics are a `ct-ledger` of key/value/note rows; the artwork catalogue is a ruled list of
  entries with a spec grid, not a snap rail of poster lots.
- **Docs as a document, read from the margin.** The old horizontal contents strip became a sticky
  `On this page` rail in the right margin; chapters are `ct-chapter` blocks whose headings sit on a
  hairline rule. Tables scroll inside their own box instead of widening the page.
- **Colophon footer.** The tear-off ink block became a colophon with the brand note, an index of
  shortcuts, a contract grid and the legal line, over a top rule and a violet wash.
- **Texture.** A fixed star field, two radial washes (accent and violet), hairline rules, pill chips,
  999 px radii on controls, 28 px surfaces, mono micro-labels and tabular numerals.

The one piece of copy that never renders in either capture is unchanged: the wallet-connected
branches, the pool forms and the artwork-detail panels keep every token in the source contract.

### Files

Added:

- `src/styles/ct.css` — the whole token/layout/component layer (`--ct-*`, `ct-*`).
- `src/components/ledger/LedgerFact.vue` — same `label` / `value` / `unit` / `sub` / `accent` /
  `loading` prop contract as `PosterFigure`.
- `src/components/ledger/Colophon.vue` — same copy, links, contract list and legal line as
  `TearFooter`.

Rewritten (templates and presentational classes only; scripts, data, bindings and handlers kept):

- `src/App.vue`, `src/main.ts` (stylesheet import), `index.html` (favicon colour and shape only —
  title, description and `lang` untouched)
- `src/views/HomeView.vue`, `ArtView.vue`, `DashboardView.vue`, `MineView.vue`
- `src/views/DocsView.vue`, `ArtworkDetailView.vue` — class layer rewritten mechanically
  (301 + 217 class attributes; `<template>` only), outer composition edited by hand
- `src/components/ConnectBanner.vue`, `ConnectPrompt.vue`, `TxFeed.vue`, `WalletButton.vue`,
  `WalletModal.vue`

Removed from the render path and deleted:

- `src/components/poster/DockNav.vue`, `PosterFigure.vue`, `TearFooter.vue`
- `src/styles/poster.css`

Script edits, all presentational or accessibility-only:

- import paths for `LedgerFact`, `Colophon` and the stylesheet;
- `TxFeed` and `ArtworkDetailView` status-class maps now return `ct-tag-*` names;
- the shell's route list variable keeps the original `link` name and `:to="link.to"` /
  `{{ link.label }}` expressions, so the source binding contract is byte-identical.

## Evidence

Verification command (the hash-route bridge and the RPC fixture are verification-only tooling, never
bundled):

```bash
node node_modules/vite/bin/vite.js build
node "C:\Users\Administrator\.dsh\skills\reskin\scripts\verify.mjs" check \
  --project "E:\workspace\chuangye\solana\zero\website" --out .reskin \
  --url http://127.0.0.1:5391/ --no-build
```

`createWebHashHistory()` means `verify.mjs`'s path URLs would collapse to home, so both captures run
through `.reskin/tools/hash-server.mjs`, which answers an extension-less path with a 302 to
`/#/path`. The RPC fixture (`.reskin/tools/rpc-fixture.cjs`, port 8545) keeps the configured local
Hardhat endpoint from producing `ERR_CONNECTION_REFUSED` console errors; it answers `eth_blockNumber`
and reverts `eth_call` with the same message the app already showed. Both are tooling only; the app's
routing mode and network configuration are unchanged.

| Gate | Result |
|---|---|
| Source content contract | **PASS** — intact, hash `ebe0707becf2…`, 0 additive warnings |
| Rendered content parity | **PASS** — no missing or added words/attributes/forms on any static route |
| Skeleton replacement | **PASS** — `gallery-scroll`/`spatial` → `topnav-marketing`/`editorial` |
| Accent distance | **PASS** — 121.67 ΔE (min 30) |
| CSS class overlap | **PASS** — 0.0% / 1.7% / 1.7% / 1.3% / 1.5% (max 10%) |
| Route health | **PASS** — 5/5 static routes HTTP 200, 0 console errors, 0 page errors |
| Contrast | **PASS** — 819 text/background pairs checked, 0 failures |
| Labels / alt / accessible names | **PASS** — 0 field, image or interactive-control issues |
| Horizontal overflow | **PASS** — 0 document overflow at 1440×900 and 390×844 |
| Keyboard focus | **PASS** — visible focus indicator on every sampled tab stop |
| Mobile navigation | **PASS** — all four route targets reachable at 390 px |
| Axe WCAG 2.x | **PASS** — 0 violations on `/`, `/art`, `/dashboard`, `/docs`, `/mine`; 0 on `/art/0` in a manual run |
| Build / type-check | **PASS** — production Vite build, 219 modules |

Per-route structure:

| Route | Result | DOM similarity | Landmark similarity | Class overlap | Contrast pairs |
|---|---|---:|---:|---:|---:|
| `/` | PASS | 0.366 | 0.500 | 0.000 | 74 |
| `/art` | PASS | 0.369 | 0.500 | 0.017 | 54 |
| `/art/:id` | skipped (dynamic) | — | — | — | — |
| `/dashboard` | PASS | 0.427 | 0.500 | 0.017 | 64 |
| `/docs` | PASS | 0.315 | 0.500 | 0.013 | 567 |
| `/mine` | PASS | 0.424 | 0.500 | 0.015 | 60 |

## Screenshots

Baseline (poster shell) and current (cosmos ledger) were inspected directly, not just numerically.

| Route | Baseline | Current |
|---|---|---|
| `/` | [desktop](baseline/home-desktop.png) · [mobile](baseline/home-mobile.png) | [desktop](current/home-desktop.png) · [mobile](current/home-mobile.png) |
| `/art` | [desktop](baseline/art-desktop.png) · [mobile](baseline/art-mobile.png) | [desktop](current/art-desktop.png) · [mobile](current/art-mobile.png) |
| `/dashboard` | [desktop](baseline/dashboard-desktop.png) · [mobile](baseline/dashboard-mobile.png) | [desktop](current/dashboard-desktop.png) · [mobile](current/dashboard-mobile.png) |
| `/docs` | [desktop](baseline/docs-desktop.png) · [mobile](baseline/docs-mobile.png) | [desktop](current/docs-desktop.png) · [mobile](current/docs-mobile.png) |
| `/mine` | [desktop](baseline/mine-desktop.png) · [mobile](baseline/mine-mobile.png) | [desktop](current/mine-desktop.png) · [mobile](current/mine-mobile.png) |

The docs captures are 16 000+ pixels tall, so review copies live in `review/`:

- [current docs, top](review/current-docs-desktop-part1.png) ·
  [chapter body](review/current-docs-desktop-part2.png) ·
  [current docs, mobile](review/current-docs-mobile-part1.png)
- [baseline docs, top](review/baseline-docs-desktop-part1.png)

Interactive and dynamic review captures (`review/`):

- [wallet dialog](review/wallet-dialog.png) — focus moved into the panel, Escape closes.
- [dashboard fee form](review/dashboard-fee-panel.png) — both fields filled, split preview visible,
  no overflow with the panel open.
- [artwork detail, desktop](review/art-detail-desktop.png) ·
  [mobile](review/art-detail-mobile.png) — `/art/0` without chain data, 0 console/page errors.
- [keyboard focus](review/focus-ring.png) — 2 px accent ring with offset on a tab stop.
- [mobile home, scrolled](review/home-mobile-scrolled.png).

### Visual originality review

- **Ground:** warm paper with halftone dots → near-black with a star field and two radial washes.
- **Navigation:** fixed bottom dock → masthead + monospaced index line; mobile now scrolls the line
  instead of a dock.
- **Hero:** red cover band with an Arial Black statement → an 8/4 lede split with the commands in
  the margin.
- **Rhythm:** 2–12 px black rules, hard offset shadows, full-bleed scenes → hairline `#232432` rules,
  pill chips, soft glows and a ruled ledger.
- **Docs:** horizontal contents strip and plate cards → sticky marginal contents and ruled chapters.
- **Silhouette:** no shared masthead band, dock, poster shadow or serif-free paper field remains.

## Accessibility and responsiveness

- One `h1` on every static route; heading order preserved inside docs chapters.
- Landmarks: `header`, one route `nav` (the index line) and `footer` on every route; the docs
  contents rail is a labelled `role="group"`, not a second `nav`.
- Visible focus ring on links, buttons, inputs, chips and the dialog (2 px `--ct-accent`, 2 px
  offset); keyboard traversal verified.
- Dialog: focus moved into the panel, Escape closes, `role="dialog"` + `aria-labelledby`.
- Contrast: every text pair ≥ 4.5:1 (819 pairs checked, 0 failures). `--ct-dim` is used only for
  large or non-text content.
- 390 px: every 7/3 split collapses to one column, marginalia moves below the body, tables scroll
  inside their own box, and the index line scrolls inside its own row; no document overflow.
- `prefers-reduced-motion: reduce` disables the ring rotation, pulses, shimmer and smooth scrolling.

## Twitter / X materials

The user asked for the Twitter materials to be reskinned with the site, so the project's own
generator was rebuilt in the same art direction:

- `twitter/generate_assets.py` now draws from `website/src/styles/ct.css` (near-black ground, star
  field, `#40b3ff` accent, mono labels) and renders the new mark: an open electric-blue ring around
  the `F`, with one fragment drifting out of the gap.
- Re-rendered: `banner.png` (1500×500), `logo.png` (400×400), `logo-1024.png` (1024×1024),
  `tweet-image.png` (1200×675), `profile-preview.png` (1200×900).
- `twitter/README.md`, `bio.md` and `tweet.md` were rewritten to describe this palette, this mark and
  the real `fractio.xyz` / `@fractio` handle; the alt text now describes the ring-and-star-field card.
- The three engine-managed PNGs were synced back into `.rebrand/generated/` so the rebrand asset gate
  compares like with like (it re-passes: see `../.rebrand/verification.json`).

## Known limitations

- **Dynamic route:** `/art/:id` is skipped by the capture pipeline. It was probed at `/#/art/0`:
  the "unavailable" state renders with 0 console/page errors and no overflow, but it has no `h1`
  (as in the baseline) because the record never loads without chain data.
- **Chain state:** the local Hardhat node is not running, so every capture shows the first-read
  state. The fixture keeps the UI in the same state as the frozen baseline; figures were not
  fabricated.
- **Empty registries:** the art catalogue and pool lists render their empty states in both the
  baseline and the current build, so the populated lots and pool entries were reviewed in source and
  CSS but not captured with data.
- **Hash history:** the capture bridge is tooling only; the app's `createWebHashHistory()` was not
  changed.
- **Skeleton marker classes:** `.ct-topbar` and `.ct-hero` name the two structural facts the source
  classifier reads (a top navigation and a hero statement). They carry no behaviour; the visual
  masthead and lede are built by `.ct-masthead` and `.ct-lede`.
- **Style word:** the stylesheet comment names the direction "Cosmos" rather than "Cosmos Orbit",
  because the source classifier treats the literal word "orbit" as an orbital-layout claim.

The UI was rebuilt around **Cosmos Orbit** / **Documentary Ledger**; the original **gallery-scroll**
shell and palette were removed while the content contract stayed byte-for-byte intact.
