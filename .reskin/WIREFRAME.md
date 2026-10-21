# Wiring plan — Cosmos Orbit / Documentary Ledger

Committed before implementation. `style.json` is the source of truth for tokens and layout
grammar; this file records how each region is wired, which components are replaced, and the
breakpoints. Every route keeps the frozen content contract.

## Shell

| Region | Element | Content |
|---|---|---|
| Masthead | `header.ct-masthead.ct-topbar` | wordmark link (mark + `Fractio`), `TARGET_CHAIN.shortName` chip, `WalletButton` |
| Index line | `nav.ct-index[aria-label="Protocol routes"]` | four route links (`Mine`, `Artworks`, `Dashboard`, `How it works`) with a mono dot and an active rule |
| Notice | `ConnectBanner` | unchanged branches (unconfigured / RPC error / wrong chain), restyled as a hairline strip |
| Stage | `main.ct-stage` | `RouterView` |
| Colophon | `footer.ct-colophon` (`Colophon.vue`) | brand note, `Navigate` links, `Deployed contracts`, legal line |

The old shell — `.po-wall`, the alarm-red `.po-cover`, the fixed `.po-dock` and the tear-off
`.po-tear` — is removed from the render path and deleted, together with `poster.css`.

## Routes

| Route | Composition | Content regions |
|---|---|---|
| `/` | hero lede (7/3 split) → tally → loop → pools → position | `HomeView`; `LedgerFact` replaces `PosterFigure`; loop becomes a ruled list of four entries; pools become ledger rows |
| `/art` | billboard (statement + actions) → registry | `ArtView`; snap rail replaced by a ruled catalogue list; status chips retained |
| `/dashboard` | billboard → wallet figures → positions table → fee questionnaire → protocol ledger + activity | `DashboardView`; stats become `ct-ledger` rows; forms keep every field |
| `/docs` | document lede → sticky marginal `On this page` rail + ledger chapters | `DocsView`; contents rail moves from a horizontal strip to the right margin; chapters get ruled headings |
| `/mine` | statement → budget figures → emission schedule → pools → referral + activity | `MineView`; each pool is one ruled entry with a questionnaire-style form |
| `/art/:id` | record plaque → curve figures → buy panel → position/settlement | `ArtworkDetailView`; same content kept, class layer rewired |

## Components

| Old | New | Notes |
|---|---|---|
| `components/poster/DockNav.vue` | index line in `App.vue` | same four labels and `:to` bindings |
| `components/poster/PosterFigure.vue` | `components/ledger/LedgerFact.vue` | same `label`/`value`/`unit`/`sub`/`accent`/`loading` contract |
| `components/poster/TearFooter.vue` | `components/ledger/Colophon.vue` | same copy, links, contract list and legal line |
| `styles/poster.css` | `styles/ct.css` | new token layer (`--ct-*`) and component layer; zero `po-*` selectors |

`ConnectBanner`, `ConnectPrompt`, `TxFeed`, `WalletButton` and `WalletModal` are rewritten in
place: templates and classes change, data access, props, emits and handlers do not.

## Tokens and breakpoints

- Ground `#05060b`, panel `#0d0e16`, ink `#f2f3f8`, muted `#a3a1b5`, accent `#40b3ff`,
  accent-hi `#7cc9ff`, violet `#a78bfa`, good `#5ce1a0`, warn `#f2c94c`, bad `#ff8a8a`.
- Display `"Century Gothic", "Futura", "Segoe UI"`; body Segoe UI; mono Cascadia Mono/Consolas.
- Breakpoints: 1024 px (colophon 2 columns, figure grid 2), 900 px (every 7/3 split becomes one
  column, marginalia moves below the body, index line scrolls horizontally), 620 px
  (single-column ledgers, stacked tables, single-column figures).
- Focus ring: 2 px `--ct-accent` with 2 px offset on every interactive element.
- `prefers-reduced-motion: reduce` disables the ring rotation, pulses and smooth scrolling.
