import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  );
}

const files = walk("src").filter((file) => /\.(vue|ts|css)$/.test(file));
const classes = new Set();
const expressions = new Set();

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/class="([^"]+)"/g)) {
    for (const token of match[1].split(/\s+/).filter(Boolean)) classes.add(token);
  }
  for (const match of text.matchAll(/class='([^']+)'/g)) {
    for (const token of match[1].split(/\s+/).filter(Boolean)) classes.add(token);
  }
  for (const match of text.matchAll(/'([A-Za-z][\w-]*)'\s*:/g)) expressions.add(match[1]);
  for (const match of text.matchAll(/"([A-Za-z][\w-]*)"\s*:/g)) expressions.add(match[1]);
}

console.log("STATIC CLASSES");
console.log([...classes].sort().join("\n"));
console.log("\nCLASS STRINGS IN EXPRESSIONS");
console.log([...expressions].sort().join("\n"));
