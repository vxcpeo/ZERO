import fs from "node:fs";

const FILE = process.argv[2];
const labels = new Map(Object.entries({
  live: "Live protocol state",
  overview: "What this protocol is",
  loop: "The fee-funded mining loop",
  emission: "Emission schedule",
  precision: "Stake weight normalisation and the precision trap",
  fees: "Fee schedule",
  example: "Worked example",
  governance: "Governance and trust boundaries",
  risks: "Risks, stated plainly",
  contracts: "Contract reference",
  integrators: "Integrator quickstart",
}));

let text = fs.readFileSync(FILE, "utf8");
text = text.replace(/<section id="([^"]+)" class="ag-chapter"([^>]*)>/g, (full, id, rest) => {
  const label = labels.get(id);
  if (!label) return full;
  return `<section id="${id}" class="ag-chapter" aria-label="${label}"${rest}>`;
});
text = text.replace(/<section class="ag-chapter" style="padding-top: 0">/g,
  '<section class="ag-chapter" aria-label="How to verify every number on this page" style="padding-top: 0">');
fs.writeFileSync(FILE, text, "utf8");
console.log("labelled docs chapters");
