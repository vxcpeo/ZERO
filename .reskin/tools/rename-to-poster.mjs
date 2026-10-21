/**
 * Presentation-only class rename for the Poster Optimism / Gallery Scroll reskin.
 *
 * Replaces class tokens inside class="..." and :class="..." expressions with the new po-*
 * namespace. Text nodes, bindings, handlers and attributes are untouched.
 */
import fs from "node:fs";
import path from "node:path";

const MAP = new Map(Object.entries({
  "ag-action": "po-button",
  "ag-action-block": "po-button-wide",
  "ag-action-negative": "po-button-bad",
  "ag-action-pair": "po-action-pair",
  "ag-action-positive": "po-button-good",
  "ag-action-primary": "po-button-primary",
  "ag-action-quiet": "po-button-quiet",
  "ag-action-small": "po-button-small",
  "ag-actions": "po-actions",
  "ag-activity-row": "po-activity",
  "ag-advanced": "po-reveal",
  "ag-align-right": "po-right",
  "ag-banner": "po-strip",
  "ag-block": "po-slab",
  "ag-block-tight": "po-slab-tight",
  "ag-bloom": "po-halo",
  "ag-body": "po-column",
  "ag-catalogue": "po-lot-rail",
  "ag-chain-chip": "po-chain",
  "ag-chain-list": "po-chain-list",
  "ag-chapter": "po-plate",
  "ag-chapter-head": "po-plate-head",
  "ag-chip": "po-tag",
  "ag-chip-accent": "po-tag-accent",
  "ag-chip-negative": "po-tag-bad",
  "ag-chip-positive": "po-tag-good",
  "ag-chip-warning": "po-tag-warn",
  "ag-claim-chip": "po-claim",
  "ag-claim-strip": "po-claim-strip",
  "ag-colophon": "po-tear",
  "ag-colophon-brand": "po-tear-brand",
  "ag-colophon-chain": "po-tear-chain",
  "ag-colophon-grid": "po-tear-grid",
  "ag-colophon-links": "po-tear-links",
  "ag-colophon-meta": "po-tear-meta",
  "ag-contents": "po-contents",
  "ag-contents-link": "po-contents-link",
  "ag-contents-list": "po-contents-list",
  "ag-copy": "po-copy",
  "ag-dialog": "po-dialog",
  "ag-docs-frame": "po-record",
  "ag-dossier": "po-route",
  "ag-dossier-head": "po-billboard",
  "ag-dossier-head-grid": "po-billboard-grid",
  "ag-entry": "po-fact",
  "ag-entry-key": "po-fact-lead",
  "ag-entry-pending": "po-fact-loading",
  "ag-field": "po-field",
  "ag-field-input": "po-field-input",
  "ag-field-label": "po-field-label",
  "ag-field-row": "po-field-row",
  "ag-field-suffix": "po-field-suffix",
  "ag-figure": "po-figure",
  "ag-figures": "po-figures",
  "ag-figures-five": "po-figures-five",
  "ag-frame": "po-gutter",
  "ag-grid": "po-grid",
  "ag-grid-pair": "po-split",
  "ag-grid-quad": "po-grid-four",
  "ag-grow": "po-fill",
  "ag-hidden": "po-hidden",
  "ag-index": "po-dock",
  "ag-index-item": "po-dock-item",
  "ag-index-link": "po-dock-link",
  "ag-index-list": "po-dock-list",
  "ag-kicker": "po-kicker",
  "ag-label": "po-label",
  "ag-ledger": "po-table",
  "ag-lockup": "po-mark",
  "ag-loop": "po-loop",
  "ag-lot": "po-lot",
  "ag-lot-artist": "po-lot-artist",
  "ag-lot-figure": "po-lot-cell",
  "ag-lot-head": "po-lot-head",
  "ag-lot-ledger": "po-lot-spec",
  "ag-lot-meta": "po-lot-meta",
  "ag-lot-meter": "po-lot-meter",
  "ag-lot-title": "po-lot-name",
  "ag-main": "po-stage",
  "ag-margin-rule": "po-margin-rule",
  "ag-masthead": "po-cover",
  "ag-masthead-index": "po-cover-index",
  "ag-masthead-row": "po-cover-inner",
  "ag-masthead-tools": "po-cover-tools",
  "ag-meter": "po-meter",
  "ag-meter-fill": "po-meter-fill",
  "ag-micro": "po-micro",
  "ag-mono": "po-mono",
  "ag-monogram": "po-stamp",
  "ag-muted": "po-muted",
  "ag-negative": "po-bad",
  "ag-note": "po-callout",
  "ag-note-caution": "po-callout-caution",
  "ag-note-info": "po-callout-info",
  "ag-note-line": "po-note",
  "ag-note-negative": "po-callout-bad",
  "ag-note-positive": "po-callout-good",
  "ag-numeric": "po-num",
  "ag-opening": "po-overture",
  "ag-opening-copy": "po-overture-copy",
  "ag-opening-grid": "po-overture-grid",
  "ag-opening-margin": "po-overture-margin",
  "ag-plaque": "po-plaque",
  "ag-pool": "po-pool",
  "ag-pool-entry": "po-pool-entry",
  "ag-pool-figure": "po-pool-figure",
  "ag-pool-head": "po-pool-head",
  "ag-pool-list": "po-pool-list",
  "ag-positive": "po-good",
  "ag-prologue": "po-intro",
  "ag-pulse": "po-pulse",
  "ag-quiet": "po-quiet",
  "ag-register": "po-tally",
  "ag-registry": "po-registry",
  "ag-release": "po-release",
  "ag-row": "po-inline",
  "ag-seam": "po-seam",
  "ag-shell": "po-wall",
  "ag-skeleton": "po-skeleton",
  "ag-space-b0": "po-gap-b0",
  "ag-space-b1": "po-gap-b1",
  "ag-space-b2": "po-gap-b2",
  "ag-space-b3": "po-gap-b3",
  "ag-space-t2": "po-gap-t2",
  "ag-space-t3": "po-gap-t3",
  "ag-split-line": "po-split-line",
  "ag-spread": "po-line",
  "ag-stack": "po-stack",
  "ag-stack-tight": "po-stack-tight",
  "ag-standfirst": "po-standfirst",
  "ag-step": "po-step",
  "ag-step-copy": "po-step-copy",
  "ag-step-tag": "po-step-tag",
  "ag-unit": "po-unit",
  "ag-veil": "po-veil",
  "ag-wallet-choice": "po-wallet-choice",
  "ag-wallet-dock": "po-wallet",
  "ag-wallet-figures": "po-wallet-figures",
  "ag-wallet-glyph": "po-wallet-glyph",
  "ag-wordmark": "po-wordmark",
  "ag-wrap": "po-row",
}));

const FILES = process.argv.slice(2).map((file) => path.resolve(file));

function renameTokens(value) {
  return value
    .split(/(\s+)/)
    .map((token) => MAP.get(token) || token)
    .join("");
}

let changed = 0;
const leftovers = new Map();
for (const file of FILES) {
  const text = fs.readFileSync(file, "utf8");
  let out = text.replace(/(\sclass=")([^"]*)(")/g, (_, before, value, after) => `${before}${renameTokens(value)}${after}`);
  out = out.replace(/(\sclass=')([^']*)(')/g, (_, before, value, after) => `${before}${renameTokens(value)}${after}`);
  out = out.replace(/(\s:class=")([^"]*)(")/g, (_, before, value, after) => {
    const renamed = value.replace(/(['"])([a-z][\w-]*)\1/g, (full, quote, token) => {
      const replacement = MAP.get(token);
      return replacement ? `${quote}${replacement}${quote}` : full;
    });
    return `${before}${renamed}${after}`;
  });
  if (out !== text) {
    fs.writeFileSync(file, out, "utf8");
    changed += 1;
    console.log(`renamed ${path.relative(process.cwd(), file)}`);
  }
  for (const match of out.matchAll(/\bag-[a-z0-9-]+\b/g)) {
    leftovers.set(match[0], (leftovers.get(match[0]) || 0) + 1);
  }
}
console.log(`${changed} file(s) updated`);
if (leftovers.size) {
  console.log("UNMAPPED ag-* tokens:");
  for (const [token, count] of [...leftovers].sort()) console.log(`  ${token} (${count})`);
} else {
  console.log("no unmapped ag-* tokens");
}
