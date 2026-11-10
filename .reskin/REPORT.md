# Reskin report — Cimela

## Direction

- **Style:** Poster Optimism (`optimism-poster`, performance-brutalist), selected automatically
  from a live sample of 8/10 blockchain front-ends; DNA credited to
  [optimism.io](https://www.optimism.io) (accent sampled `#ff0421`, ground `#fafaf9`).
- **Skeleton:** Gallery Scroll (`gallery-scroll`, spatial) — full-bleed poster scenes, horizontal
  scroll-snap rails, a floating bottom dock, no masthead and no top bar.
- **Original:** `topnav-marketing` (editorial) — dark cosmos ground, masthead + index line,
  ruled ledger entries, blue accent `#40b3ff`.
- **Live sampling:** 8/10 references responded; `solana.com` (429) and `arbitrum.io` (403) failed
  and were scored from the bundled catalog. Full evidence in `.reskin/STYLE.md`.

The UI was rebuilt around **Poster Optimism / Gallery Scroll**; the original **topnav-marketing**
shell and palette were removed while the content contract stayed byte-for-byte intact.

## Evidence

| Gate | Result |
|---|---|
| Source content contract | **intact** — 1003 text tokens, 406 bindings, 43 handlers, hash `fd3681cef91a` unchanged |
| Rendered content parity (per route) | **identical multiset**, 226 word tokens on every captured route |
| DOM fingerprint similarity | **0.359** (limit 0.50) |
| Landmark sequence similarity | **0.500** (limit 0.68) — `main → nav → footer`, was `header → nav → main → footer` |
| CSS class overlap | **0.000** (limit 0.10) — every class renamed into the `pt-` namespace, `ct.css` deleted |
| Accent distance | **136.56 ΔE** `#40b3ff` → `#ff0421` (min 30) |
| Archetype family | `editorial` → `spatial` |
| Contrast failures | **0** of 74 checked pairs per route |
| axe WCAG 2.x serious/critical | **0** |
| Keyboard focus / mobile nav | pass (visible focus ring, dock links reachable at 390 px) |
| Horizontal overflow | none at 1440 or 390 on any route |
| Build | pass (Vite, 219 modules) |

### The one gate that cannot pass in this environment

`verify.mjs check` exits 1 with five identical failures:

```
/ … /mine: console/page error: Failed to load resource: net::ERR_CONNECTION_REFUSED
```

Every other gate passes. This is **not caused by the reskin**:

- `.env.local` ships `VITE_RPC_URL=` (empty), so the app falls back to `http://127.0.0.1:8545`.
  No chain node is running in this environment, so `protocol.refresh()` rejects with
  `TypeError: Failed to fetch` and Chromium logs one network console error.
- The frozen baseline has the **same** error: `.reskin/baseline/pages.json` →
  `consoleErrors: ["Failed to load resource: net::ERR_CONNECTION_REFUSED"]`,
  `failedRequests: ["POST http://127.0.0.1:8545/ — net::ERR_CONNECTION_REFUSED"]`.
- The failure message is also **frozen content**. The baseline's rendered copy includes
  “RPC: Failed to fetch” and “Retry”, so starting an RPC node to silence the console error would
  delete those words and fail the content gate instead. The two gates are mutually exclusive in
  this environment; the content contract wins.

The reskin itself introduces no console or page errors: with the RPC request excluded, the
captures are clean.

## What changed

| Area | Before | After |
|---|---|---|
| Shell | `App.vue` masthead + index line above `main` | `main` (scene sequence) → fixed bottom dock (brand, four route labels, chain tag, wallet) → colophon, with `ConnectBanner` as the first band inside `main` |
| Global CSS | `src/styles/ct.css` (2072 lines, `ct-` tokens) | `src/styles/poster.css` (tokens, reset, type, shell, rails, sheets, forms, tables, dialog, responsive) |
| Primitives | `components/ledger/LedgerFact.vue`, `components/ledger/Colophon.vue` | `components/gallery/FigureSlab.vue`, `components/gallery/Colophon.vue` (same props, new markup) |
| Home | hero + ruled bands | opening poster with a printed poster block → figures snap rail → ink “loop” rail → pool strips → position spread |
| Mine | billboard + stacked slab entries | mining poster → budget rail + emission plate → pool entries → referral/activity spread |
| Artworks | vertical ruled catalogue | horizontal snap rail of lot posters with hard offset shadows |
| Artwork detail | plates with plaque split | record poster → curve rail → two-up buy/split spread → position/settlement sheets → contract rows |
| Dashboard | table of positions | position posters in a rail (table headers kept as field labels) + protocol ledger |
| Docs | two-column chapter ledger with a sticky margin | prologue poster → horizontal contents rail → eleven full-bleed chapter bands with framed scrolling tables |

Deleted from the render path: `src/styles/ct.css`, `src/components/ledger/` (both files),
all `ct-*` classes and `--ct-*` custom properties.

## Screenshots

Baseline (`.reskin/baseline/`) vs current (`.reskin/current/`):

| Route | Baseline | Current |
|---|---|---|
| `/` | `baseline/home-desktop.png` | `current/routes-home-desktop.png`, `current/routes-home-mobile.png` |
| `/art` | `baseline/art-desktop.png` | `current/routes-art-desktop.png`, `current/routes-art-mobile.png` |
| `/dashboard` | `baseline/dashboard-desktop.png` | `current/routes-dashboard-desktop.png`, `current/routes-dashboard-mobile.png` |
| `/docs` | `baseline/docs-desktop.png` | `current/routes-docs-desktop.png`, `current/routes-docs-mobile.png` |
| `/mine` | `baseline/mine-desktop.png` | `current/routes-mine-desktop.png`, `current/routes-mine-mobile.png` |

The runner's own screenshots are in `.reskin/current/*-desktop.png` / `*-mobile.png`; the
long-form docs page is additionally broken into clips (`current/clip-docs-*.png`,
`current/mobile-docs-390-*.png`).

## Supplementary route audit (all five static routes, not just the runner's captures)

The app routes with `createWebHashHistory`, so `verify.mjs` loads `/art`, `/docs`… as *paths* and
every capture resolves to the home route. To verify the other four routes properly I added
`.reskin/shoot.mjs`, which visits `#/art`, `#/dashboard`, `#/docs`, `#/mine` at 1440×900 and
390×844, runs axe (WCAG 2.x aa) with colour contrast, and checks document overflow:

| Route | axe violations | h1 | Desktop overflow | Mobile overflow |
|---|---:|---:|---|---|
| `#/` | 0 | 1 | none | none |
| `#/mine` | 0 | 1 | none | none |
| `#/art` | 0 | 1 | none | none |
| `#/dashboard` | 0 | 1 | none | none |
| `#/docs` | 0 | 1 | none | none |

Report: `.reskin/current/routes-report.json`. The dynamic route `/art/:id` is skipped by the
runner and cannot be rendered without a chain node; its loading and “unavailable” states were
captured manually (`current/clip-art-0-0.png`), the populated record state is composed from the
same verified primitives and was not invented for a screenshot.

## Accessibility and responsiveness

- One `h1` per route, `h2`/`h3` order preserved, landmarks `main`/`nav`/`footer`.
- Rails are keyboard scrollable (`tabindex="0"` + `role="group"` + label) where they hold no
  focusable children; the rest rely on their links.
- Focus ring: 3 px `#e30005` with 3 px offset on every interactive element.
- Body contrast ≥ 4.5:1 (`#161616` on `#fafaf9` = 17.3:1; muted `#6e625c` = 5.6:1; accent used as
  a block with ink text = 4.6:1).
- `prefers-reduced-motion` disables the pulse/skeleton animations and smooth scrolling.
- Mobile: single measure, rails at 86 vw, two-row dock, no horizontal document overflow.

## Related deliverable — the X kit

The same art direction was carried into `twitter/`: a re-rendered `logo.png` / `logo-1024.png`,
`banner.png` (1500 × 500), three post images (`post-01-fractions.png`, `post-04-fee-flow.png`,
`post-07-usage.png`), a `profile-preview.png` mockup with the new bio, and a nine-post series in
`twitter/cimela-x-series.md` written under the writex rules (slots, media briefs, alt text,
lint clean). All PNGs come from `twitter/generate_assets.py`, which now draws the poster tokens
instead of the old cosmos/blues palette.

## Reproduce

```bash
cd website
node "$RESKIN_DIR/scripts/verify.mjs" check --project "$PWD" --out .reskin   # gates
node .reskin/shoot.mjs                                                       # per-route axe + shots
cd ../twitter && python generate_assets.py all                               # X assets
node "$WRITEX_DIR/scripts/lint.mjs" cimela-x-series.md                       # X copy
```

## Known limitations

- The docs page is intentionally long (as it was); its mobile full-page render is ~32 000 px, so it
  is reviewed in clips rather than one screenshot.
- `verify.mjs` records `keyboard focus` only on the first captured route because of the hash
  routing described above; the dock and rails were additionally tabbed through manually.
- The RPC console error above is environmental. Everything the reskin controls passes.
