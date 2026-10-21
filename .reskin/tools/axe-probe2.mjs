/**
 * Reproduce the axe sequence and inspect scrollable regions.
 */
import path from "node:path";
import { provisionBrowser } from "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/lib/browser.mjs";

const root = process.cwd();
const provision = await provisionBrowser(root, path.join(root, ".reskin"));
const { chromium } = provision.playwright;
const browser = await chromium.launch({ headless: true, executablePath: provision.executablePath, args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://127.0.0.1:4321/art/0", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:4321/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const connect = page.locator("button", { hasText: "Connect wallet" }).first();
await connect.click();
await page.waitForTimeout(600);

const regions = await page.evaluate(() => [...document.querySelectorAll("*")].filter((el) => {
  const cs = getComputedStyle(el);
  const scrollable = /(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflowY);
  return scrollable && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
}).map((el) => ({ cls: el.className, tag: el.tagName, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight })));
console.log("scrollable regions", JSON.stringify(regions, null, 2));

await page.addScriptTag({ path: provision.axePath });
const result = await page.evaluate(async () => {
  // eslint-disable-next-line no-undef
  const r = await axe.run(document, { runOnly: { type: "rule", values: ["scrollable-region-focusable"] }, resultTypes: ["violations"] });
  return r.violations.flatMap((v) => v.nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 200) })));
});
console.log("axe", JSON.stringify(result, null, 2));
await browser.close();
