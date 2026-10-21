# Reskin report — Tessella (website/)

Run 3 of the `reskin` pipeline for `@tessella/website` (Vue 3 + Vite + Pinia + vue-router).
The previous ledger run (and its evidence) was moved to `../.reskin-archive-r2-2026-10-21/`
before this run; everything in this `.reskin/` directory is the authoritative evidence for the
current UI. The frozen baseline in `.reskin/baseline/` is the previous **Agora Violet / Documentary
Ledger** shell, captured before any edit.

## Direction

| | |
|---|---|
| Style | **Poster Optimism** (`optimism-poster`, performance-brutalist) |
| Source DNA | [https://www.optimism.io](https://www.optimism.io) |
| Live sampling | attempted across 10 references; 4 answered (Base, Polygon, Cosmos, Sui). `optimism.io` timed out, so its DNA was resolved from the bundled catalog — abstract tokens only, no asset or copy reuse |
| Skeleton | **Gallery Scroll** (`gallery-scroll`, spatial) |
| Original | `marketing-stack` (editorial), near-black `#000000`, accent `#670de5` |
| New ground | warm paper `#fff6f0`, deep peach `#ffe3d6`, ink `#161616` |
| New accent | `#c40018` (text-safe `#a80014`) |
| Accent distance | **133.68 ΔE** (threshold 30; the selector scored 128.7 with its own metric) |
| Palette anchor | `--po-accent: #c40018` |
| Selection seed | `0066e709ac83765d8411fadced2aca287d5e7f74e65d89b62da227f718f5bdc1` |
| Selection | automatic; no style, palette, layout or route choice was asked of the user |

Poster Optimism supplies palette, type mood, shape language, texture, density, motion and layout
grammar only. No Optimism logo, illustration, photography, copy or code was downloaded or reused.

## What changed

The old shell was a near-black **documentary ledger**: a ruled masthead, an uppercase mono index
line, hairline rules, square figures, a colophon and violet accents. The new shell is a printed
poster with a floating dock:

- **Cover + dock instead of masthead + index.** A full-bleed alarm-red band carries the stamp
  monogram, wordmark, chain chip and wallet. Navigation moved from a top index line to a fixed
  bottom dock with a geometric mark, an accessible name for every route and a red active cell.
  There is no conventional header, no filled app bar and no sidebar.
- **Scenes instead of ledger chapters.** Routes are sequences of full-bleed bands: paper, deep
  peach and ink. The home loop is four full-width step panels on the ink band; figures are a
  snap-scrolling rail; the art catalogue is a snap rail of poster lots.
- **Poster surfaces, not cards.** Zero radii, 2–3 px black rules, 8–12 px hard offset shadows,
  diagonal stripe bands, halftone paper, oversized Arial Black statements, Courier labels and
  tabular figures.
- **Docs as plates.** The sticky contents strip is a compact index; chapters are plates with a red
  bar on the heading, code blocks are ink plates with a red offset shadow, and the live figures are
  eight poster facts.
- **Colophon replaced by a tear-off.** The footer is an ink block with a red top rule, a large
  stamp, route shortcuts, contract chips and the legal line, with room for the dock underneath.

### Files

Added:

- `src/styles/poster.css` — the single token/layout/component stylesheet (`--po-*`, `po-*`).
- `src/components/poster/DockNav.vue` — fixed route dock (same four labels and `:to` bindings).
- `src/components/poster/TearFooter.vue` — same copy, contract links and legal line.
- `src/components/poster/PosterFigure.vue` — same `label` / `value` / `unit` / `sub` / `accent` /
  `loading` prop contract.

Rewritten (templates and presentational classes only; scripts, data, bindings and handlers kept):

- `src/App.vue`, `src/main.ts`, `index.html` (favicon colour/shape only — title, description and
  `lang` untouched)
- `src/views/HomeView.vue`, `ArtView.vue`, `ArtworkDetailView.vue`, `DashboardView.vue`,
  `DocsView.vue`, `MineView.vue`
- `src/components/ConnectBanner.vue`, `ConnectPrompt.vue`, `TxFeed.vue`, `WalletButton.vue`,
  `WalletModal.vue`

Removed from the render path and deleted:

- `src/components/ledger/RouteIndex.vue`, `ColophonFooter.vue`, `FigureEntry.vue`
- `src/styles/ledger.css`

Script edits, all presentational or accessibility-only:

- import paths for `PosterFigure` and the new shell components;
- `TxFeed` and `ArtworkDetailView` status-class maps now return `po-tag-*` names;
- `WalletModal` now moves focus into the dialog, closes on Escape and exposes
  `role="dialog"` / `aria-labelledby` (no data or transaction logic touched).

## Evidence

Verification command (the RPC stub and hash bridge are verification-only tooling, never bundled):

```bash
node node_modules/vite/bin/vite.js build
node "C:\Users\Administrator\.dsh\skills\reskin\scripts\verify.mjs" check \
  --project "E:\workspace\chuangye\solana\zero\website" --out .reskin \
  --url http://127.0.0.1:4321/ --no-build
```

`createWebHashHistory()` means `verify.mjs`'s path URLs would collapse to home; the baseline and
current captures both run through `.reskin/tools/hash-server.mjs`, which answers an
extension-less path with a 302 to `/#/path`. The RPC stub keeps the configured local Hardhat
endpoint from producing `ERR_CONNECTION_REFUSED` console errors. Both are tooling only; the app's
routing mode and network configuration are unchanged.

| Gate | Result |
|---|---|
| Source content contract | **PASS** — intact, 1003 text tokens, 406 bindings, 43 events, hash `4fb49879ad09…` |
| Rendered content parity | **PASS** — no missing or added words/attributes/forms on any static route |
| Skeleton replacement | **PASS** — `marketing-stack`/`editorial` → `gallery-scroll`/`spatial` |
| Accent distance | **PASS** — 133.68 ΔE (min 30) |
| CSS class overlap | **PASS** — 0.0% / 1.7% / 1.8% / 1.3% / 1.6% (max 10%) |
| Route health | **PASS** — 5/5 static routes HTTP 200, 0 console errors, 0 page errors |
| Contrast | **PASS** — 792 text/background pairs checked, 0 failures |
| Labels / alt / accessible names | **PASS** — 0 field, image or interactive-control issues |
| Horizontal overflow | **PASS** — 0 document overflow at 1440×900 and 390×844 |
| Keyboard focus | **PASS** — visible focus indicator on every sampled tab stop |
| Mobile navigation | **PASS** — all four route targets reachable at 390 px |
| Axe WCAG 2.x | **PASS** — 0 violations on `/`, `/art`, `/dashboard`, `/docs`, `/mine`; 0 on `/art/0` in a manual run |
| Build / type-check | **PASS** — production Vite build and `vue-tsc --noEmit` |

Per-route structure:

| Route | Result | DOM similarity | Landmark similarity | Class overlap | Contrast pairs |
|---|---|---:|---:|---:|---:|
| `/` | PASS | 0.370 | 0.500 | 0.000 | 70 |
| `/art` | PASS | 0.395 | 0.500 | 0.017 | 43 |
| `/art/:id` | skipped (dynamic) | — | — | — | — |
| `/dashboard` | PASS | 0.407 | 0.500 | 0.018 | 60 |
| `/docs` | PASS | 0.280 | 0.600 | 0.013 | 563 |
| `/mine` | PASS | 0.364 | 0.500 | 0.016 | 56 |

One non-blocking warning: `aria-label="Live from the contract figures"` was added to the
scrollable home figure rail. It is the accessible name required to make the horizontally scrollable
region keyboard reachable (`tabindex="0"`), and it adds no visible copy. The docs contents line
uses `role="group"` with the existing "On this page" label instead of a second `nav`, which keeps
the landmark sequence at `main → nav → footer`.

## Screenshots

Baseline (previous ledger shell) and current (Poster Optimism) were inspected directly, not just
numerically:

| Route | Baseline | Current |
|---|---|---|
| `/` | [desktop](baseline/home-desktop.png) · [mobile](baseline/home-mobile.png) | [desktop](current/home-desktop.png) · [mobile](current/home-mobile.png) |
| `/art` | [desktop](baseline/art-desktop.png) · [mobile](baseline/art-mobile.png) | [desktop](current/art-desktop.png) · [mobile](current/art-mobile.png) |
| `/dashboard` | [desktop](baseline/dashboard-desktop.png) · [mobile](baseline/dashboard-mobile.png) | [desktop](current/dashboard-desktop.png) · [mobile](current/dashboard-mobile.png) |
| `/docs` | [desktop](baseline/docs-desktop.png) · [mobile](baseline/docs-mobile.png) | [desktop](current/docs-desktop.png) · [mobile](current/docs-mobile.png) |
| `/mine` | [desktop](baseline/mine-desktop.png) · [mobile](baseline/mine-mobile.png) | [desktop](current/mine-desktop.png) · [mobile](current/mine-mobile.png) |

Interactive and dynamic review captures live in `review/`:

- [wallet dialog](review/wallet-dialog.png) — opened from the cover; ink on paper, focus moved in,
  Escape closes.
- [dashboard fee form](review/dashboard-fee-form.png) — both fields labelled, split preview visible,
  no overflow with the panel open.
- [artwork detail, desktop](review/art-detail-desktop.png) ·
  [mobile](review/art-detail-mobile.png) — `/art/0` first-read state, 0 console/page errors, axe 0.
- [baseline docs top](review/baseline-docs-top.png) ·
  [current docs top](review/current-docs-top.png) — side-by-side at the same crop.

### Visual originality review

- **Ground:** near-black with a violet bloom → warm paper with halftone dots, deep-peach and ink
  bands. The first viewport reads as a different product.
- **Navigation:** top uppercase index line → fixed bottom dock with red active cell; mobile no
  longer has a top route row.
- **Hero:** left copy + narrow marginal action column on black → red cover band, oversized Arial
  Black statement, action block beyond a thick rule.
- **Rhythm:** hairline rules, serif-ish display, square figure ledger → 2–3 px poster rules, hard
  offset shadows, snap rails and full-bleed scenes.
- **Docs:** ruled editorial column with a horizontal contents line → sticky index strip and chapter
  plates with red heading bars and ink code plates.
- **Silhouette:** no shared masthead, index line, ruled figure register or colophon remains. The
  wordmark itself is content and stays.

## Accessibility and responsiveness

- One `h1` on every static route; heading order preserved inside docs chapters.
- Landmarks: `main`, one route `nav` (dock) and `footer` on every route; docs contents is a named
  group, not a duplicate `nav`.
- Visible focus ring on links, buttons, inputs, rails and the dialog (3 px ink outline plus a paper
  halo); keyboard tab traversal verified.
- Dialog: focus moved into the panel, Escape closes, `role="dialog"` + `aria-labelledby`; verified
  in a real browser.
- Contrast: paper, ink, red and peach pairs all ≥ 4.5:1 for body text; 792 pairs checked, 0
  failures. Orange `#ff7a00` is used for fills and marks only, never as text on paper.
- 390 px: cover wraps, figures and splits become one column, tables scroll inside their own box,
  the dock scrolls horizontally if needed; no document overflow at either captured viewport.
- `prefers-reduced-motion: reduce` disables the blink, button motion and smooth scrolling.
- Full-viewport scenes were deliberately left content-sized: scenes are full-bleed bands with
  generous space, but a rigid `100svh` panel could hide content below the fold. The gallery
  archetype is carried by the scene sequence, snap rails, dock and cover instead.

## Known limitations

- **Dynamic route:** `/art/:id` is skipped by the capture pipeline (it needs a concrete fixture and
  a live vault). It was probed at `/#/art/0`: the first-read skeleton renders, 0 console/page
  errors, axe 0. That loading state has no `h1`, as in the baseline; the populated state could not
  be exercised without chain data.
- **Chain state:** the local Hardhat node is not running, so every capture shows the first-read
  state (0/—). Live figures were not fabricated; the stub keeps the UI in the same state as the
  frozen baseline.
- **Empty registries:** the art catalogue and pool lists render their empty/loading states in both
  the baseline and the current screenshots, so the populated lots and pool plates were reviewed in
  source and CSS but not captured with data.
- **Hash history:** the capture bridge is tooling only; the app's `createWebHashHistory()` was not
  changed. Without it, `verify.mjs` would silently measure home for every route.
- **Content tokens:** all copy, labels, placeholders, link targets, binding expressions, handlers,
  API/env names and form signatures were moved, never rewritten. The only new strings are an
  `aria-label` on the home rail and the dialog's `id`/`role` attributes; no visible copy was added.
- **Fixed dock:** it intentionally overlays the bottom of the viewport; the tear-off footer has
  extra bottom padding so the legal line is never covered at the end of a page.

The UI was rebuilt around **Poster Optimism** / **Gallery Scroll**; the original **marketing-stack**
shell and palette were removed while the content contract stayed byte-for-byte intact.
