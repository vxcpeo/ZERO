# Wiring plan — Poster Optimism / Gallery Scroll

Selected by `choose-style.mjs`: style `optimism-poster` (performance-brutalist),
skeleton `gallery-scroll` (spatial). Original: `topnav-marketing` (editorial),
accent `#40b3ff` on `#05060b`.

## New shell

`pt-frame` in `src/App.vue`, in this DOM order:

1. `<main class="pt-stage">` — every route renders as a sequence of full-bleed
   `pt-scene` bands (paper / wash / ink grounds) inside a `pt-spread` measure.
2. `<nav class="pt-dock" aria-label="Protocol routes">` — a fixed bottom dock:
   brand mark + wordmark, the four existing route labels, the chain tag and the
   wallet cluster. This replaces the masthead + index line entirely.
3. `<footer class="pt-colophon">` — the colophon, rebuilt as a closing poster.

Landmark order is `main → nav → footer`; the old `header → nav → main → footer`
order is gone. No `<header>`, no `<aside>`, no vertical rail, no top bar.

## Route → scene mapping

| Route | Scenes |
|---|---|
| `/` | opening poster (h1 + standfirst + actions) → figures band (snap rail of 4 facts + budget meter) → the loop (snap rail of 4 step posters) → pools (stacked pool posters) → position (activity + position sheet) |
| `/mine` | mining poster → connect prompt → budget facts rail + emission poster → pool posters (stats grid, claim strip, stake form, cost preview, advanced reveal) → referral + activity → empty state |
| `/art` | collection poster → fee callout → registry as a horizontal snap rail of lot posters → empty state |
| `/art/:id` | record poster → curve facts rail → curve meter poster → two-up spread: buy form sheet / fee-split sheet → position + settlement sheets → contracts sheet |
| `/dashboard` | dashboard poster → connect prompt → wallet facts rail → positions as ruled position sheets (table replaced on the reading path) → fee payment sheet with disclosure → protocol stats + activity |
| `/docs` | prologue poster → horizontal contents rail → ten chapter scenes, each with an oversized chapter heading, one reading measure, poster sheets and framed scrollable tables → closing ink statement |

## Components

- `src/components/gallery/FigureSlab.vue` — replaces `components/ledger/LedgerFact.vue`
  (same props: `label`, `value`, `unit`, `sub`, `accent`, `loading`).
- `src/components/gallery/Colophon.vue` — replaces `components/ledger/Colophon.vue`.
- `TxFeed`, `ConnectBanner`, `ConnectPrompt`, `WalletButton`, `WalletModal` — same
  files, same scripts, new markup and class names.
- `components/ledger/` is deleted; `styles/ct.css` is deleted and replaced by
  `styles/poster.css`, imported from `main.ts`.

## Tokens and breakpoints

`src/styles/poster.css` holds the token layer (`--pt-paper`, `--pt-ink`,
`--pt-accent`…), reset, base typography, shell, rail, sheet, form, table and
dialog primitives. Breakpoints: `1100px` (dock/2-up collapse), `820px` (single
measure, rail items at 86vw), `560px` (one-column grids, dock rows).

No copy is rewritten: every text node, binding, handler, attribute and link
target is moved verbatim into the new markup.
