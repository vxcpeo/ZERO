# Reskin art direction — Poster Optimism

> Selected automatically. Do not ask the user to confirm or choose another direction.

- **Style DNA:** `optimism-poster` (performance-brutalist)
- **Skeleton:** `gallery-scroll` (spatial)
- **Seed:** `2fcb8d3a11d5d0e00a80f306a8a0bb33099ce7397a21368bf3041cfe31a81b7d`
- **Source DNA:** [https://www.optimism.io](https://www.optimism.io)
- **Live sampled:** yes — https://www.optimism.io (2801 ms)
- **Original:** topnav-marketing / light / accent #40b3ff

## Why this direction

The selector sampled 8/10 blockchain references, scored every direction for perceptual distance from the original accent (#40b3ff) and background (#05060b), added a deterministic seed jitter, and chose Poster Optimism because it is 136 ΔE away from the original accent and pairs with Gallery Scroll, a spatial skeleton rather than the original topnav-marketing.

## Live reference sampling

| Style | URL | Result | Accent sampled | Ground sampled |
|---|---|---|---|---|
| solana-spectrum | https://solana.com | failed: HTTP 429 | — | — |
| ethereum-paper | https://ethereum.org | ok (815 ms) | #0c5681 | #ffffff |
| base-cobalt | https://www.base.org | ok (1215 ms) | #0000ff | #dde3e9 |
| polygon-agora | https://polygon.technology | ok (1392 ms) | #670de5 | #000000 |
| arbitrum-signal | https://arbitrum.io | failed: HTTP 403 | — | — |
| aave-abyss | https://aave.com | ok (1277 ms) | #ff0000 | #000000 |
| uniswap-bubblegum | https://uniswap.org | ok (2170 ms) | — | #ffffff |
| optimism-poster | https://www.optimism.io | ok (2801 ms) | #ff0421 | #fafaf9 |
| cosmos-orbit | https://cosmos.network | ok (1640 ms) | #40b3ff | #000000 |
| sui-tidal | https://sui.io | ok (2076 ms) | #298dff | #ffffff |

Live sampling is evidence, not a copy target. Never download or reuse a reference site's logo, imagery, copy, or code. Use only the abstract tokens below.

## Candidate ranking

| Candidate | Score | Accent ΔE from original | Layout | Live |
|---|---:|---:|---|---|
| Poster Optimism | 0.9862 | 135.8 | gallery-scroll | yes |
| Cobalt Blueprint | 0.9599 | 112.4 | bento-canvas | yes |
| Bubblegum Exchange | 0.8955 | 96.1 | split-stage | yes |
| Abyss Liquidity | 0.7796 | 144.6 | terminal-console | yes |
| Agora Violet | 0.7124 | 85.4 | bento-canvas | yes |
| Paper Protocol | 0.6604 | 39.1 | gallery-scroll | yes |
| Tidal Sui | 0.6489 | 37.4 | gallery-scroll | yes |
| Spectrum Terminal | 0.5178 | 39.6 | terminal-console | no |
| Cosmos Orbit | 0.473 | 0 | orbital | yes |
| Signal Navy | 0.3805 | 12.8 | terminal-console | no |

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
  --bg: #fafaf9;
  --surface: #FFFFFF;
  --surface-alt: #FFE3D6;
  --ink: #161616;
  --muted: #6E625C;
  --accent: #ff0421;
  --accent-safe: #e30005;
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

1. The source inventory archetype is `topnav-marketing`; the new skeleton is `gallery-scroll`. Do not fall back to the old shell during implementation.
2. Do not reuse any original class name, CSS selector, design token name, or original accent family.
3. Rewrite templates, not only CSS. Every route must visibly use the new skeleton.
4. Keep every token in `.reskin/content-contract.json`; move it, never rewrite it.
5. Run `node scripts/verify.mjs check` and do not stop until content, structure, accessibility and responsive checks pass.

## Commit statement

Use this sentence in the final report: "The UI was rebuilt around Poster Optimism / Gallery Scroll; the original topnav-marketing shell and palette were removed while the content contract stayed byte-for-byte intact."
