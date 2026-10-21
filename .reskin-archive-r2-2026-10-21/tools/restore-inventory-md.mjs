import fs from "node:fs";
import { renderInventoryMarkdown } from "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/inventory.mjs";

const project = "E:/workspace/chuangye/solana/zero/website";
const inventory = JSON.parse(
  fs.readFileSync(`${project}/.reskin/baseline/inventory.json`, "utf8"),
);
fs.writeFileSync(`${project}/.reskin/INVENTORY.md`, renderInventoryMarkdown(inventory), "utf8");
console.log("restored INVENTORY.md from frozen baseline");
