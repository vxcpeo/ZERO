/**
 * Review capture for the dynamic route (`/art/:id`), which the reskin capture skips.
 *
 * It uses the same installed Playwright build the verifier provisions and the local
 * hash-route capture server (5391), so what it renders is the production bundle.
 *
 * Usage: node .reskin/tools/capture-detail.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..", "..");
const OUT = path.join(PROJECT, ".reskin", "review");
const BASE = "http://127.0.0.1:5391";

const pages = [
  { route: "/art/0", slug: "art-detail" },
  { route: "/art/999", slug: "art-detail-missing" },
];

const browser = await chromium.launch({ headless: true });
await fs.mkdir(OUT, { recursive: true });

for (const { route, slug } of pages) {
  for (const device of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const file = path.join(OUT, `${slug}-${device.name}.png`);
    await page.screenshot({ path: file, fullPage: device.name === "desktop" });
    const title = await page.title();
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      h1: document.querySelectorAll("h1").length,
    }));
    console.log(JSON.stringify({ route, device: device.name, title, overflow, errors, file }));
    await context.close();
  }
}

await browser.close();
