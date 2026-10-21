# Wireframe plan — Poster Optimism / Gallery Scroll

The presentation layer is rebuilt around a paper poster with a floating dock. This is the map the
implementation follows; the evidence is in `VERIFICATION.md` and `REPORT.md`.

## Shell

`App.vue` is the **Poster Wall** shell. It replaces the ruled masthead + index line + colophon with
a red cover band, a scene run and a fixed dock.

| Region | Element | Purpose |
|---|---|---|
| Cover | `<div class="po-cover">` | red plate: stamp monogram + wordmark, chain chip, wallet dock |
| Notices | `ConnectBanner` | RPC / configuration / wrong-network strip |
| Scene run | `<main class="po-stage"><div class="po-run">` | route content as a sequence of framed scenes |
| Dock | `<nav class="po-dock" aria-label="Protocol routes">` | four destinations, fixed to the bottom of the viewport |
| Tear-off | `<footer class="po-tear">` | brand note, route shortcuts, deployed contracts, legal line |

Landmarks per route are `main → nav → footer` (the docs contents line is a named `role="group"`,
not a second `nav`, so the sequence is not a copy of the old banner + two-nav shell). The wordmark
anchor keeps `href="/"`, which also keeps route navigation reachable at 390 px.

## Route → composition

| Route | Composition |
|---|---|
| `/` | overture (kicker, oversized statement, standfirst, marginal action block) → tally scene (peach, horizontal figure rail, release meter) → ink loop scene (four full-width step panels) → pools (paired plates) → wallet scene (activity beside the position plate) |
| `/art` | intro (statement + actions) → catalogue scene (chapter head, fee callout, connect prompt, loading/empty states, snap rail of poster lots with a two-column spec ledger) |
| `/art/:id` | plaque → curve facts → buy questionnaire beside the fee-split plate → position/settlement pair → contracts plate (same binds, new classes) |
| `/dashboard` | billboard (title + refresh) → connect prompt → wallet figures → positions ledger table → fee form (disclosure) → protocol register beside activity |
| `/docs` | intro → sticky contents strip (role=group) → single column of chapter plates with red-bar headings, poster figure grid, ledger tables and black code plates |
| `/mine` | billboard statement → connect prompt → figure row → emission plate → pool plates (forms, claim strip, advanced reveal) → referral beside activity |

## Components

| Old | New | Notes |
|---|---|---|
| `components/ledger/RouteIndex.vue` | `components/poster/DockNav.vue` | same four labels and `:to` bindings; now a fixed dock |
| `components/ledger/ColophonFooter.vue` | `components/poster/TearFooter.vue` | same copy, contracts and legal line |
| `components/ledger/FigureEntry.vue` | `components/poster/PosterFigure.vue` | same `label` / `value` / `unit` / `sub` / `accent` / `loading` props |
| `TxFeed`, `ConnectBanner`, `ConnectPrompt`, `WalletButton`, `WalletModal` | kept | templates re-typed; scripts unchanged apart from presentational class names and modal focus/Escape |

`src/components/ledger/` and `src/styles/ledger.css` are deleted, so no old class or token survives
in the source or in the rendered DOM.

## Styling

- Single global stylesheet `src/styles/poster.css`: tokens `--po-*`, classes `po-*`.
- Palette: paper `#fff6f0`, deep peach `#ffe3d6`, ink `#161616`, accent red `#c40018`, orange
  secondary `#ff7a00` (fills only), text-safe red `#a80014`.
- Type: Arial Black at weight 900 with tight tracking; Arial body; Courier New for labels and
  figures. Hard 2 px rules, 8–12 px offset shadows, zero radii, diagonal stripe and halftone
  textures.
- Navigation: fixed bottom dock with a geometric mark and label per route; the active route is a
  red filled cell.
- Rails: `.po-gallery` / `.po-lot-rail` use horizontal overflow with `scroll-snap-type: x mandatory`
  and a focusable group on the home figure rail.
- Breakpoints: 1120 px (figures 4→2), 900 px (splits and overture stack, tables scroll inside their
  own box), 620 px (single-column figures, full-width actions, stacked colophon).
- Motion: 110 ms `steps(2, end)` for button presses and a blinking pulse; everything non-essential
  is wrapped in `prefers-reduced-motion: no-preference`.

## Verification tooling (not app code)

- `.reskin/tools/hash-server.mjs` answers an extension-less route path with a 302 to `/#/path` so
  `verify.mjs` captures the real route under `createWebHashHistory()`.
- `.reskin/tools/rpc-stub.cjs` accepts the configured local Hardhat socket without answering, so the
  UI stays in the same first-read state as the baseline without console network errors.
- `.reskin/tools/probe-flow.mjs` clicks the dialog, fee form, docs jump links and mobile dock;
  `.reskin/tools/shot-detail.mjs` captures `/art/0` and the wallet dialog.
