/**
 * Manual review capture for the dynamic artwork route and the wallet dialog.
 * Verification-only tooling: never bundled, never imported by the app.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { provisionBrowser } from "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/lib/browser.mjs";

const root = process.cwd();
const outDir = path.join(root, ".reskin");
const provision = await provisionBrowser(root, outDir);
const { chromium } = provision.playwright;
const browser = await chromium.launch({
  headless: true,
  executablePath: provision.executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err.message || err)));

await page.goto("http://127.0.0.1:4321/art/0", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
const reviewDir = path.join(outDir, "review");
await fs.mkdir(reviewDir, { recursive: true });
await page.screenshot({ path: path.join(reviewDir, "art-detail-desktop.png"), fullPage: true });
const h1 = await page.locator("h1").first().innerText().catch(() => "");
const bodyLen = await page.evaluate(() => document.body.innerText.length);
console.log("detail url", page.url(), "h1", JSON.stringify(h1), "body", bodyLen);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(reviewDir, "art-detail-mobile.png"), fullPage: true });

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:4321/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const connect = page.locator("button", { hasText: "Connect wallet" }).first();
if (await connect.count()) {
  await connect.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(reviewDir, "wallet-dialog.png") });
  const dialogVisible = await page.locator(".po-dialog").isVisible().catch(() => false);
  console.log("wallet dialog visible", dialogVisible);
  await page.keyboard.press("Escape").catch(() => {});
}

if (provision.axePath) {
  await page.addScriptTag({ path: provision.axePath });
  const axe = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  });
  console.log("axe violations", JSON.stringify(axe));
}
console.log("console errors", JSON.stringify(errors.slice(0, 6)));
await browser.close();
