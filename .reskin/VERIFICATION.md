# Reskin verification — PASS

Generated: 2026-10-20T16:25:56.021Z

- Project: **@tessella/website**
- URL: http://127.0.0.1:4321/
- Original skeleton: `marketing-stack` (editorial)
- New skeleton: `gallery-scroll` (spatial)
- Accent: #670de5 -> #c40018 (133.68 ΔE; min 30)
- Source contract: intact (`4fb49879ad09`)

| Route | Result | DOM similarity | Landmark similarity | Axe serious | Screenshot |
|---|---|---:|---:|---:|---|
| `/` | PASS | 0.37 | 0.5 | 0 | [desktop](current/home-desktop.png) |
| `/art` | PASS | 0.395 | 0.5 | 0 | [desktop](current/art-desktop.png) |
| `/art/:id` | PASS | — | — | — | — |
| `/dashboard` | PASS | 0.407 | 0.5 | 0 | [desktop](current/dashboard-desktop.png) |
| `/docs` | PASS | 0.28 | 0.6 | 0 | [desktop](current/docs-desktop.png) |
| `/mine` | PASS | 0.364 | 0.5 | 0 | [desktop](current/mine-desktop.png) |

## Blocking issues

- None.

## Warnings

- /: aria attribute added: aria-label=Live from the contract figures

## Thresholds

- DOM fingerprint similarity <= 0.5
- Landmark sequence similarity <= 0.68
- CSS class overlap <= 0.1
- Accent distance >= 30 ΔE
- Contrast failures <= 0
- Axe serious/critical <= 0

All content is compared as a multiset of visible words plus rendered attribute values. Reordering is allowed, rewriting/removing/adding visible copy is not. Dynamic numeric values are reported as warnings, never silently accepted.
