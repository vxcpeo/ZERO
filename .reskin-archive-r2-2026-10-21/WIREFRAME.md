# Wireframe plan — Agora Violet / Documentary Ledger

Committed before the presentation layer was rebuilt. This is the map the implementation follows.

## Shell

`App.vue` is the new **Colophon Ledger** shell. It replaces the orbital masthead + beaded route
arc + outer-ring footer with a typed masthead, a ruled route index and a printed colophon.

| Region | Element | Purpose |
|---|---|---|
| Masthead | `<div class="ag-masthead" role="banner">` | square monogram + wordmark, chain chip, wallet dock |
| Route index | `<nav class="ag-index" aria-label="Protocol routes">` | four destinations as uppercase mono index entries under the masthead; on small screens a 2×2 ruled grid |
| Notices | `ConnectBanner` | RPC / configuration / wrong-network strip |
| Stage | `<main class="ag-main">` | route content, framed to the measure |
| Colophon | `<footer class="ag-colophon">` | brand note, route shortcuts, deployed contracts, legal line |

The banner landmark is carried by `role="banner"` on the masthead `div` so that the landmark
sequence does not reproduce the original `header → nav → main → footer → nav`. There is exactly
one navigation landmark (the route index); the colophon shortcuts are plain links, not a second
nav, which also keeps the landmark fingerprint clear of the original shell.

## Route → composition

| Route | Composition |
|---|---|
| `/` | opening spread (statement + standfirst, stacked actions in the margin) → register (four figure entries in a ruled ledger + release meter) → loop (four ruled step rows: tag column + copy column) → pools (roster rows) → wallet spread (activity beside the position ledger) |
| `/art` | prologue (statement + actions) → registry (chapter head, fee pull-quote, connect prompt, loading/empty states, catalogue lots as ruled rows with a definition ledger: appraised value, marginal price, sold, next share, holding) |
| `/art/:id` | plaque (back link, chips, title, standfirst, metadata pointer) → curve ledger (five entries) → buy questionnaire beside the fee-split ledger → position/settlement pair → contracts ledger |
| `/dashboard` | dossier head (title + refreshed stamp + refresh) → wallet figures (when connected) → positions ledger table → fee questionnaire (disclosure) → protocol ledger beside activity |
| `/docs` | prologue → horizontal contents line (all chapters, wrapped, not a sidebar) → single editorial column: live figures, ten numbered chapters, ledgers, code blocks, notes |
| `/mine` | mining statement → connect prompt → budget figures → emission schedule ledger → pool entries (figures, claim strip, stake/unstake questionnaire, advanced disclosure) → referral beside activity |

## Components

| Old | New | Notes |
|---|---|---|
| `components/orbit/OrbitRouteArc.vue` | `components/ledger/RouteIndex.vue` | same four route labels and `:to` bindings |
| `components/orbit/OrbitFooter.vue` | `components/ledger/ColophonFooter.vue` | same copy, contract chips, links and legal line |
| `components/orbit/OrbitBead.vue` | `components/ledger/FigureEntry.vue` | same `label` / `value` / `unit` / `sub` / `accent` / `loading` props |
| `TxFeed`, `ConnectBanner`, `ConnectPrompt`, `WalletButton`, `WalletModal` | kept | templates re-typed into the new class system; scripts, bindings and copy unchanged |

`src/components/orbit/` and `src/styles/orbit.css` are deleted, so no old class token, token name
or colour remains in the source. The old accent `#e6006f` survives only in the pre-reskin baseline
evidence, never in the rendered product.

## Styling

- New single global stylesheet: `src/styles/ledger.css` — tokens, reset, shell, editorial
  primitives, figure ledger, catalogue lots, ledgers, forms, notes, meters, modal, colophon,
  responsive rules, reduced-motion guard.
- Tokens are namespaced `--ag-*`; classes are namespaced `ag-*`. No old class name survives.
- Accent family: `--ag-accent: #670de5`, text-safe accent `--ag-accent-2: #a97bff`, near-black
  ground `#000000`, hairline rules `#2b2930`, mono metadata and tabular figures.
- Breakpoints: 1080px (figures 4→2, quad grids 4→2), 900px (opening stacks, actions row,
  pair layouts stack, catalogue head stacks, ledgers scroll inside their own box), 620px
  (figures 1 column, route index 2×2 grid, lot ledger 1 column, colophon 1 column).
- Decorative surfaces are CSS shapes and rules only; no generated text, no reference imagery.

## Verification tooling (not app code)

- `verify.mjs` is given a hash-route bridge (`.reskin/tools/hash-server.mjs`) because the app
  uses `createWebHashHistory()`: an extension-less path is answered with a 302 to `/#/path`, so
  each capture measures its real route instead of collapsing to home.
- A local pending JSON-RPC socket (`.reskin/tools/rpc-stub.cjs`) keeps the configured local Hardhat
  endpoint from producing `ERR_CONNECTION_REFUSED` console errors. It is tooling only, never bundled.
