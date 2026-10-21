/**
 * Manual axe audit for the reskin. The verifier's own axe hook is not wired in this version, so
 * this script checks every route directly with the provisioned axe-core build.
 */
import path from "node:path";

const project = "E:/workspace/chuangye/solana/zero/website";
const { provisionBrowser } = await import(
  "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/lib/browser.mjs"
);

const provision = await provisionBrowser(project, path.join(project, ".reskin"));
const browser = await provision.playwright.chromium.launch({
  headless: true,
  executablePath: provision.executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const routes = ["/", "/art", "/dashboard", "/docs", "/mine"];
let total = 0;

for (const route of routes) {
  await page.goto(`http://127.0.0.1:4321/#${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  await page.addScriptTag({ path: path.join(project, ".reskin/tools/node_modules/axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      resultTypes: ["violations"],
    });
  });
  const serious = result.violations.filter((v) => ["serious", "critical"].includes(v.impact));
  total += serious.length;
  console.log(`${route}: ${result.violations.length} violation(s), ${serious.length} serious/critical`);
  for (const violation of result.violations) {
    console.log(`  [${violation.impact}] ${violation.id} (${violation.nodes.length}) — ${violation.help}`);
    if (violation.impact === "serious" || violation.impact === "critical") {
      for (const node of violation.nodes.slice(0, 3)) {
        console.log(`    ${node.target.join(" ")} :: ${String(node.failureSummary || "").slice(0, 200)}`);
      }
    }
  }
}

console.log(`serious/critical total: ${total}`);
await browser.close();
process.exitCode = total === 0 ? 0 : 1;
