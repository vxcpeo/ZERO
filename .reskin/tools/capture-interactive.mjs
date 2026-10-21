/**
 * Interactive-state review captures (wallet dialog, dashboard fee panel, mobile index).
 *
 * The verifier audits these states numerically (focus, labels, axe) but does not photograph them;
 * these PNGs go to `.reskin/review/` as visual evidence. Tooling only — never bundled.
 *
 * Usage: node .reskin/tools/capture-interactive.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..", "..");
const OUT = path.join(PROJECT, ".reskin", "review");
const BASE = "http://127.0.0.1:5391";

const browser = await chromium.launch({ headless: true });
await fs.mkdir(OUT, { recursive: true });

async function shoot(route, action, name, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await action(page);
  await page.waitForTimeout(450);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute("aria-label") || el.innerText || "").slice(0, 60),
      outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
    };
  });
  console.log(JSON.stringify({ name, file, errors, focused }));
  await context.close();
}

await shoot("/", (page) => page.getByRole("button", { name: "Connect wallet" }).click(), "wallet-dialog");
await shoot(
  "/dashboard",
  async (page) => {
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByLabel("Fee amount").fill("250");
    await page.getByLabel("Referrer (optional)").fill("0x5FC8d32690cc91D4c39d9d3abcBD16989F875707");
  },
  "dashboard-fee-panel",
);
await shoot(
  "/",
  async (page) => {
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
  },
  "focus-ring",
);
await shoot(
  "/",
  async (page) => {
    await page.evaluate(() => window.scrollTo(0, 900));
  },
  "home-mobile-scrolled",
  { width: 390, height: 844 },
);

await browser.close();
