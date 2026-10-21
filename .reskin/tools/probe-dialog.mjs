import path from "node:path";
import { provisionBrowser } from "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/lib/browser.mjs";
const root = process.cwd();
const provision = await provisionBrowser(root, path.join(root, ".reskin"));
const { chromium } = provision.playwright;
const browser = await chromium.launch({ headless: true, executablePath: provision.executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:4321/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const connect = page.locator("button", { hasText: "Connect wallet" }).first();
await connect.click();
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const dlg = document.querySelector(".po-dialog");
  const h = dlg.querySelector("h3");
  const btn = dlg.querySelector("button");
  const pick = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim(), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, color: cs.color, bg: cs.backgroundColor, visibility: cs.visibility, opacity: cs.opacity, display: cs.display, fontSize: cs.fontSize, zIndex: cs.zIndex };
  };
  return {
    dlg: { ...pick(dlg), scrollTop: dlg.scrollTop, scrollHeight: dlg.scrollHeight, clientHeight: dlg.clientHeight },
    heading: pick(h),
    close: pick(btn),
    html: dlg.innerHTML.slice(0, 700),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
