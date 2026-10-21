/**
 * Presentation-only class rename for the reskin run.
 *
 * Replaces class tokens inside `class="..."` / `:class="..."` attribute values with the new
 * `ag-*` namespace. Text nodes, bindings, handlers and attributes are untouched. Script-level
 * class-name maps are patched by hand because they are not attribute values.
 */
import fs from "node:fs";
import path from "node:path";

const MAP = new Map(Object.entries({
  "orb-shell": "ag-shell",
  "orb-masthead": "ag-masthead",
  "orb-masthead-inner": "ag-masthead-row",
  "orb-masthead-side": "ag-masthead-tools",
  "orb-route-arc": "ag-index",
  "orb-route-list": "ag-index-list",
  "orb-route-bead": "ag-index-link",
  "orb-stage": "ag-main",
  "orb-footer": "ag-colophon",
  "orb-footer-grid": "ag-colophon-grid",
  "orb-footer-brand": "ag-colophon-brand",
  "orb-footer-nav": "ag-colophon-links",
  "orb-footer-chain": "ag-colophon-chain",
  "orb-footer-meta": "ag-colophon-meta",
  "brand-lockup": "ag-lockup",
  "brand-orb": "ag-monogram",
  "brand-word": "ag-wordmark",
  "orb-wrap": "ag-frame",
  "orb-page": "ag-dossier",
  "orb-halo": "ag-bloom",
  "orb-section": "ag-chapter",
  "orb-section-top": "ag-chapter-head",
  "orb-page-head": "ag-dossier-head",
  "orb-eyebrow": "ag-kicker",
  "orb-hero": "ag-opening",
  "orb-hero-grid": "ag-opening-grid",
  "orb-hero-copy": "ag-opening-copy",
  "orb-lede": "ag-standfirst",
  "orb-hero-actions": "ag-actions",
  "orb-core": "ag-core",
  "orb-core-ring": "ag-core-ring",
  "orb-core-seed": "ag-core-seed",
  "orb-core-node": "ag-core-node",
  "orb-museum": "ag-prologue",
  "orb-plaque": "ag-plaque",
  "orb-instrument": "ag-register",
  "orb-instrument-head": "ag-register-head",
  "orb-beads": "ag-figures",
  "orb-bead": "ag-entry",
  "orb-bead-hot": "ag-entry-key",
  "orb-bead-stale": "ag-entry-pending",
  "orb-bead-label": "ag-label",
  "orb-bead-value": "ag-figure",
  "orb-bead-unit": "ag-unit",
  "orb-bead-note": "ag-note-line",
  "orb-tag": "ag-chip",
  "orb-tag-brand": "ag-chip-accent",
  "orb-tag-good": "ag-chip-positive",
  "orb-tag-caution": "ag-chip-warning",
  "orb-tag-stop": "ag-chip-negative",
  "orb-panel": "ag-block",
  "orb-panel-tight": "ag-block-tight",
  "orb-spread": "ag-spread",
  "orb-row": "ag-row",
  "orb-grow": "ag-grow",
  "orb-stack": "ag-stack",
  "orb-stack-tight": "ag-stack-tight",
  "orb-stack-loose": "ag-stack-loose",
  "orb-cluster": "ag-grid",
  "orb-cluster-2": "ag-grid-pair",
  "orb-cluster-4": "ag-grid-quad",
  "orb-fold": "ag-wrap",
  "orb-seam": "ag-seam",
  "orb-gauge": "ag-meter",
  "orb-gauge-fill": "ag-meter-fill",
  "orb-petals": "ag-loop",
  "orb-petal": "ag-step",
  "orb-pods": "ag-pool-list",
  "orb-pod": "ag-pool",
  "orb-pod-top": "ag-pool-head",
  "orb-shelf": "ag-catalogue",
  "shelf-card": "ag-lot",
  "shelf-meta": "ag-lot-meta",
  "orb-released": "ag-release",
  "orb-doc-body": "ag-body",
  "orb-index": "ag-contents",
  "orb-figure": "ag-pool-figure",
  "act": "ag-action",
  "act-core": "ag-action-primary",
  "act-quiet": "ag-action-quiet",
  "act-small": "ag-action-small",
  "act-good": "ag-action-positive",
  "act-stop": "ag-action-negative",
  "act-wide": "ag-action-block",
  "note": "ag-note",
  "note-info": "ag-note-info",
  "note-caution": "ag-note-caution",
  "note-good": "ag-note-positive",
  "note-stop": "ag-note-negative",
  "type-s": "ag-copy",
  "type-xs": "ag-micro",
  "type-quiet": "ag-quiet",
  "type-muted": "ag-muted",
  "type-good": "ag-positive",
  "type-bad": "ag-negative",
  "type-warn": "ag-warning",
  "type-right": "ag-align-right",
  "type-mono": "ag-mono",
  "type-num": "ag-numeric",
  "gap-b0": "ag-space-b0",
  "gap-b1": "ag-space-b1",
  "gap-b2": "ag-space-b2",
  "gap-b3": "ag-space-b3",
  "gap-t2": "ag-space-t2",
  "gap-t3": "ag-space-t3",
  "pulse": "ag-pulse",
  "dormant": "ag-skeleton",
  "ledger": "ag-ledger",
  "ledger-advanced": "ag-advanced",
  "action-pair": "ag-action-pair",
  "claim-strip": "ag-claim-strip",
  "activity-row": "ag-activity-row",
  "wallet-dock": "ag-wallet-dock",
  "wallet-choice": "ag-wallet-choice",
  "wallet-glyph": "ag-wallet-glyph",
  "veil": "ag-veil",
  "dialog": "ag-dialog",
  "rpc-banner": "ag-banner",
  "field-set": "ag-field",
  "field-name": "ag-field-label",
  "field-row": "ag-field-row",
  "field-input": "ag-field-input",
  "field-suffix": "ag-field-suffix",
  "is-hidden": "ag-hidden",
  "split-line": "ag-split-line",
  "claim-chip": "ag-claim-chip",
}));

const FILES = process.argv.slice(2);

function renameTokens(value) {
  return value
    .split(/(\s+)/)
    .map((token) => MAP.get(token) || token)
    .join("");
}

let changed = 0;
for (const file of FILES) {
  const absolute = path.resolve(file);
  const text = fs.readFileSync(absolute, "utf8");
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
    fs.writeFileSync(absolute, out, "utf8");
    changed += 1;
    console.log(`renamed ${file}`);
  }
}
console.log(`${changed} file(s) updated`);
