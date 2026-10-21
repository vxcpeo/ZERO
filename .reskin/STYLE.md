# Reskin art direction — Poster Optimism

> Selected automatically. Do not ask the user to confirm or choose another direction.

- **Style DNA:** `optimism-poster` (performance-brutalist)
- **Skeleton:** `gallery-scroll` (spatial)
- **Seed:** `0066e709ac83765d8411fadced2aca287d5e7f74e65d89b62da227f718f5bdc1`
- **Source DNA:** [https://www.optimism.io](https://www.optimism.io)
- **Live sampled:** no — offline-safe catalog used
- **Original:** marketing-stack / dark / accent #670de5

## Why this direction

The selector sampled 4/10 blockchain references, scored every direction for perceptual distance from the original accent (#670de5) and background (#000000), added a deterministic seed jitter, and chose Poster Optimism because it is 129 ΔE away from the original accent and pairs with Gallery Scroll, a spatial skeleton rather than the original marketing-stack.

## Live reference sampling

| Style | URL | Result | Accent sampled | Ground sampled |
|---|---|---|---|---|
| base-cobalt | https://www.base.org | ok (1897 ms) | #0000ff | #dde3e9 |
| polygon-agora | https://polygon.technology | ok (3801 ms) | #670de5 | #000000 |
| solana-spectrum | https://solana.com | failed: timeout | — | — |
| ethereum-paper | https://ethereum.org | failed: timeout | — | — |
| aave-abyss | https://aave.com | failed: fetch failed | — | — |
| arbitrum-signal | https://arbitrum.io | failed: HTTP 403 | — | — |
| optimism-poster | https://www.optimism.io | failed: timeout | — | — |
| uniswap-bubblegum | https://uniswap.org | failed: timeout | — | — |
| cosmos-orbit | https://cosmos.network | ok (4767 ms) | #40b3ff | #000000 |
| sui-tidal | https://sui.io | ok (4590 ms) | #298dff | #ffffff |

Live sampling is evidence, not a copy target. Never download or reuse a reference site's logo, imagery, copy, or code. Use only the abstract tokens below.

## Candidate ranking

| Candidate | Score | Accent ΔE from original | Layout | Live |
|---|---:|---:|---|---|
| Poster Optimism | 0.8877 | 128.7 | gallery-scroll | no |
| Abyss Liquidity | 0.8711 | 91.4 | terminal-console | no |
| Tidal Sui | 0.839 | 62.2 | gallery-scroll | yes |
| Paper Protocol | 0.8284 | 56.8 | gallery-scroll | no |
| Signal Navy | 0.7886 | 104.2 | terminal-console | no |
| Bubblegum Exchange | 0.7476 | 92.7 | bento-canvas | no |
| Cosmos Orbit | 0.6982 | 97.3 | orbital | yes |
| Spectrum Terminal | 0.6634 | 71.8 | ticker-stage | no |
| Cobalt Blueprint | 0.6349 | 21.3 | command-rail | yes |
| Agora Violet | 0.4403 | 18.4 | bento-canvas | yes |

## Skeleton brief

**Gallery Scroll** — full-viewport panels with generous negative space; horizontal scroll-snap for related panels; minimal floating dock navigation; each route is a sequence of framed scenes; large imagery/typography and very few borders.

Navigation: Floating dock at the bottom (icons + accessible names) and a vertical dot index for sections; no conventional header.

Structure:
1. opening panel with brand and route count
1. scene panels with snap points
1. horizontal data rail
1. closing panel with form/action
1. floating dock

Content mapping: Group each route's content into 2-4 scenes. Keep metrics as large typographic facts. Tables become horizontal snap rails with one record per panel on mobile. Forms become the closing scene.

Recipe: `.scene{min-height:100svh;display:grid;place-content:center;padding:clamp(24px,6vw,96px);scroll-snap-align:start}.rail{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:16px}.rail>*{scroll-snap-align:start;flex:0 0 min(86vw,520px)}.dock{position:fixed;bottom:18px;left:50%;translate:-50% 0;display:flex;gap:6px;border-radius:999px}`

Risks: full-viewport panels can hide content below the fold; provide visible scroll cues; horizontal rails need keyboard and touch support

## Design tokens

```css
:root {
  --bg: #FFF6F0;
  --surface: #FFFFFF;
  --surface-alt: #FFE3D6;
  --ink: #161616;
  --muted: #6E625C;
  --accent: #C40018;
  --accent-safe: #A80014;
  --accent-2: #FF7A00;
  --line: #E7D5CA;
  --success: #1E6B47;
  --danger: #B00016;
  --warning: #8F4B00;

  --font-display: "Arial Black", "Arial Bold", "Segoe UI", sans-serif;
  --font-body: "Arial", "Segoe UI", sans-serif;
  --font-mono: "Courier New", ui-monospace, monospace;
  --display-weight: 900;
  --display-tracking: -0.06em;
  --label-tracking: 0.1em;

  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
  --border: 2px solid var(--ink);
  --shadow: 8px 8px 0 var(--ink);

  --motion-duration: 110ms;
  --motion-ease: steps(2, end);
  --space-1: clamp(4px, .35vw, 6px);
  --space-2: clamp(8px, .7vw, 12px);
  --space-3: clamp(14px, 1.2vw, 20px);
  --space-4: clamp(22px, 2vw, 32px);
  --space-5: clamp(36px, 3.4vw, 56px);
  --space-6: clamp(56px, 5vw, 88px);
  --page-pad: clamp(18px, 4vw, 64px);
  --max-width: 1440px;
}
```

## Component grammar

- Surface: 2px solid var(--ink); radius 0px; shadow 8px 8px 0 var(--ink).
- Type: display **"Arial Black", "Arial Bold", "Segoe UI", sans-serif** at weight 900, tracking -0.06em; body **"Arial", "Segoe UI", sans-serif**; numerals and micro-labels **"Courier New", ui-monospace, monospace**.
- Texture: hard offset shadows, oversized statements, rules and stamps, marquee bands.
- Motion: snappy, 110ms, steps(2, end). Always wrap non-essential motion in `@media (prefers-reduced-motion: no-preference)`.
- Density: compact. Keep body text >= 14px and body contrast >= 4.5:1.
- Use `--accent-safe` for text and icons on `--bg`; use `--accent` for fills and large shapes.

## Originality guard

The replacement must satisfy all of these:

1. The source inventory archetype is `marketing-stack`; the new skeleton is `gallery-scroll`. Do not fall back to the old shell during implementation.
2. Do not reuse any original class name, CSS selector, design token name, or original accent family.
3. Rewrite templates, not only CSS. Every route must visibly use the new skeleton.
4. Keep every token in `.reskin/content-contract.json`; move it, never rewrite it.
5. Run `node scripts/verify.mjs check` and do not stop until content, structure, accessibility and responsive checks pass.

## Commit statement

Use this sentence in the final report: "The UI was rebuilt around Poster Optimism / Gallery Scroll; the original marketing-stack shell and palette were removed while the content contract stayed byte-for-byte intact."
