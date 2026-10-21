# Reskin verification — PASS

Generated: 2026-10-21T17:25:13.094Z

- Project: **@fractio/website**
- URL: http://127.0.0.1:5391/
- Original skeleton: `gallery-scroll` (spatial)
- New skeleton: `topnav-marketing` (editorial)
- Accent: #c40018 -> #40b3ff (121.67 ΔE; min 30)
- Source contract: intact (`ebe0707becf2`)

| Route | Result | DOM similarity | Landmark similarity | Axe serious | Screenshot |
|---|---|---:|---:|---:|---|
| `/` | PASS | 0.366 | 0.5 | 0 | [desktop](current/home-desktop.png) |
| `/art` | PASS | 0.369 | 0.5 | 0 | [desktop](current/art-desktop.png) |
| `/art/:id` | PASS | — | — | — | — |
| `/dashboard` | PASS | 0.427 | 0.5 | 0 | [desktop](current/dashboard-desktop.png) |
| `/docs` | PASS | 0.315 | 0.5 | 0 | [desktop](current/docs-desktop.png) |
| `/mine` | PASS | 0.424 | 0.5 | 0 | [desktop](current/mine-desktop.png) |

## Blocking issues

- None.

## Warnings

- None.

## Thresholds

- DOM fingerprint similarity <= 0.5
- Landmark sequence similarity <= 0.68
- CSS class overlap <= 0.1
- Accent distance >= 30 ΔE
- Contrast failures <= 0
- Axe serious/critical <= 0

All content is compared as a multiset of visible words plus rendered attribute values. Reordering is allowed, rewriting/removing/adding visible copy is not. Dynamic numeric values are reported as warnings, never silently accepted.
