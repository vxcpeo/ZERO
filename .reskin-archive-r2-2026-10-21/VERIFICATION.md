# Reskin verification — PASS

Generated: 2026-10-19T19:07:28.158Z

- Project: **@tessella/website**
- URL: http://127.0.0.1:4321/
- Original skeleton: `orbital` (spatial)
- New skeleton: `marketing-stack` (editorial)
- Accent: #e6006f -> #670de5 (94.44 ΔE; min 30)
- Source contract: intact (`4fb49879ad09`)

| Route | Result | DOM similarity | Landmark similarity | Axe serious | Screenshot |
|---|---|---:|---:|---:|---|
| `/` | PASS | 0.452 | 0.6 | 0 | [desktop](current/home-desktop.png) |
| `/art` | PASS | 0.463 | 0.6 | 0 | [desktop](current/art-desktop.png) |
| `/art/:id` | PASS | — | — | — | — |
| `/dashboard` | PASS | 0.32 | 0.6 | 0 | [desktop](current/dashboard-desktop.png) |
| `/docs` | PASS | 0.283 | 0.571 | 0 | [desktop](current/docs-desktop.png) |
| `/mine` | PASS | 0.333 | 0.6 | 0 | [desktop](current/mine-desktop.png) |

## Blocking issues

- None.

## Warnings

- /: aria attribute changed/removed: aria-label=Footer
- /: aria attribute added: aria-label=Live from the contract
- /: aria attribute added: aria-label=Opening statement
- /: aria attribute added: aria-label=The loop
- /art: aria attribute changed/removed: aria-label=Footer
- /art: aria attribute added: aria-label=Artwork registry
- /art: aria attribute added: aria-label=Collection statement
- /dashboard: aria attribute changed/removed: aria-label=Footer
- /dashboard: aria attribute added: aria-label=Activity log
- /dashboard: aria attribute added: aria-label=Dashboard summary
- /dashboard: aria attribute added: aria-label=Pay a platform fee
- /dashboard: aria attribute added: aria-label=Protocol state
- /dashboard: aria attribute added: aria-label=Your positions
- /docs: aria attribute changed/removed: aria-label=Footer
- /docs: aria attribute added: aria-label=Contract reference
- /docs: aria attribute added: aria-label=Emission schedule
- /docs: aria attribute added: aria-label=Fee schedule
- /docs: aria attribute added: aria-label=Governance and trust boundaries
- /docs: aria attribute added: aria-label=How to verify every number on this page
- /docs: aria attribute added: aria-label=Integrator quickstart
- /docs: aria attribute added: aria-label=Live protocol state
- /docs: aria attribute added: aria-label=Protocol reference
- /docs: aria attribute added: aria-label=Risks, stated plainly
- /docs: aria attribute added: aria-label=Stake weight normalisation and the precision trap
- /docs: aria attribute added: aria-label=The fee-funded mining loop
- /docs: aria attribute added: aria-label=What this protocol is
- /docs: aria attribute added: aria-label=Worked example
- /mine: aria attribute changed/removed: aria-label=Footer
- /mine: aria attribute added: aria-label=Activity log
- /mine: aria attribute added: aria-label=Budget overview
- /mine: aria attribute added: aria-label=Mining pools
- /mine: aria attribute added: aria-label=Mining statement
- /mine: aria attribute added: aria-label=Referral and activity

## Thresholds

- DOM fingerprint similarity <= 0.5
- Landmark sequence similarity <= 0.68
- CSS class overlap <= 0.1
- Accent distance >= 30 ΔE
- Contrast failures <= 0
- Axe serious/critical <= 0

All content is compared as a multiset of visible words plus rendered attribute values. Reordering is allowed, rewriting/removing/adding visible copy is not. Dynamic numeric values are reported as warnings, never silently accepted.
