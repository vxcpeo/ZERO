/**
 * Focused axe probe: report scrollable-region targets on home, with and without the wallet dialog.
 */
import path from "node:path";
import { provisionBrowser } from "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/lib/browser.mjs";

const root = process.cwd();
const provision = await provisionBrowser(root, path.join(root, ".reskin"));
const { chromium } = provision.playwright;
const browser = await chromium.launch({ headless: true, executablePath: provision.executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function runAxe(label) {
  await page.addScriptTag({ path: provision.axePath });
  const result = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: "rule", values: ["scrollable-region-focusable"] }, resultTypes: ["violations"] });
    return r.violations.flatMap((v) => v.nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 160), summary: n.failureSummary })));
  });
  console.log(label, JSON.stringify(result, null, 2));
}

await page.goto("http://127.0.0.1:4321/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1600);
await runAxe("home-closed");
const connect = page.locator("button", { hasText: "Connect wallet" }).first();
if (await connect.count()) {
  await connect.click();
  await page.waitForTimeout(500);
  await runAxe("home-dialog-open");
}
await browser.close();
