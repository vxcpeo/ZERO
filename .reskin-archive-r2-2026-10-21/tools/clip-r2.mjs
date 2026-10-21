/**
 * Viewport clip capture for pages taller than the image reader's limit.
 * Usage: node clip-r2.mjs /docs <scrollY> <height> <name>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = "E:/workspace/chuangye/solana/zero/website";
const { provisionBrowser } = await import(
  "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/lib/browser.mjs"
);

const route = process.argv[2] || "/docs";
const scrollY = Number(process.argv[3] || 0);
const height = Number(process.argv[4] || 1200);
const name = process.argv[5] || `${route.replace(/^\//, "").replace(/\//g, "-") || "home"}-${scrollY}`;
const width = Number(process.argv[6] || 1440);
const outDir = path.join(project, ".reskin", "review");
await fs.mkdir(outDir, { recursive: true });

const provision = await provisionBrowser(project, path.join(project, ".reskin"));
const browser = await provision.playwright.chromium.launch({
  headless: true,
  executablePath: provision.executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});
const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
await page.goto(`http://127.0.0.1:4321/#${route}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await page.evaluate((y) => window.scrollTo(0, y), scrollY);
await page.waitForTimeout(400);
const meta = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollHeight: document.documentElement.scrollHeight,
}));
await page.screenshot({ path: path.join(outDir, `${name}.png`) });
console.log(JSON.stringify({ name, meta }));
await browser.close();
