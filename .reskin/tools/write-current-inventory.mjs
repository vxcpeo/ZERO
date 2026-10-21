/**
 * Snapshot the post-reskin inventory next to the frozen baseline (report evidence).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { analyzeProject, renderInventoryMarkdown } from "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/inventory.mjs";

const root = process.cwd();
const outDir = path.join(root, ".reskin");
const inventory = await analyzeProject(root);
await fs.writeFile(path.join(outDir, "current-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(outDir, "CURRENT-INVENTORY.md"), renderInventoryMarkdown(inventory), "utf8");
console.log(JSON.stringify({
  archetype: inventory.archetype,
  hash: inventory.contentContractHash,
  stats: inventory.stats,
  palette: inventory.palette.slice(0, 8),
  accentVars: inventory.designSignals.colorVars.filter((v) => /accent/.test(v.name)),
  fonts: inventory.fonts,
}, null, 2));
