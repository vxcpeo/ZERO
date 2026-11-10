# Reskin verification — FAIL

Generated: 2026-11-09T18:09:31.073Z

- Project: **@cimela/website**
- URL: http://127.0.0.1:4317/
- Original skeleton: `topnav-marketing` (editorial)
- New skeleton: `gallery-scroll` (spatial)
- Accent: #40b3ff -> #ff0421 (136.56 ΔE; min 30)
- Source contract: intact (`fd3681cef91a`)

| Route | Result | DOM similarity | Landmark similarity | Axe serious | Screenshot |
|---|---|---:|---:|---:|---|
| `/` | FAIL | 0.359 | 0.5 | 0 | [desktop](current/home-desktop.png) |
| `/art` | FAIL | 0.359 | 0.5 | 0 | [desktop](current/art-desktop.png) |
| `/art/:id` | PASS | — | — | — | — |
| `/dashboard` | FAIL | 0.359 | 0.5 | 0 | [desktop](current/dashboard-desktop.png) |
| `/docs` | FAIL | 0.359 | 0.5 | 0 | [desktop](current/docs-desktop.png) |
| `/mine` | FAIL | 0.359 | 0.5 | 0 | [desktop](current/mine-desktop.png) |

## Blocking issues

- /: console/page error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- /art: console/page error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- /dashboard: console/page error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- /docs: console/page error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- /mine: console/page error: Failed to load resource: net::ERR_CONNECTION_REFUSED

## Warnings

- /: aria attribute added: aria-label=The loop steps
- /: request failed: POST http://127.0.0.1:8545/ — net::ERR_CONNECTION_REFUSED
- /art: aria attribute added: aria-label=The loop steps
- /art: request failed: POST http://127.0.0.1:8545/ — net::ERR_CONNECTION_REFUSED
- /dashboard: aria attribute added: aria-label=The loop steps
- /dashboard: request failed: POST http://127.0.0.1:8545/ — net::ERR_CONNECTION_REFUSED
- /docs: aria attribute added: aria-label=The loop steps
- /docs: request failed: POST http://127.0.0.1:8545/ — net::ERR_CONNECTION_REFUSED
- /mine: aria attribute added: aria-label=The loop steps
- /mine: request failed: POST http://127.0.0.1:8545/ — net::ERR_CONNECTION_REFUSED

## Thresholds

- DOM fingerprint similarity <= 0.5
- Landmark sequence similarity <= 0.68
- CSS class overlap <= 0.1
- Accent distance >= 30 ΔE
- Contrast failures <= 0
- Axe serious/critical <= 0

All content is compared as a multiset of visible words plus rendered attribute values. Reordering is allowed, rewriting/removing/adding visible copy is not. Dynamic numeric values are reported as warnings, never silently accepted.
