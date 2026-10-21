/**
 * Manual click-through of the interactive states that the static capture cannot reach:
 * wallet dialog, dashboard fee form, docs jump links and mobile dock navigation.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { provisionBrowser } from "file:///C:/Users/Administrator/.dsh/skills/reskin/scripts/lib/browser.mjs";

const root = process.cwd();
const provision = await provisionBrowser(root, path.join(root, ".reskin"));
const { chromium } = provision.playwright;
const reviewDir = path.join(root, ".reskin", "review");
await fs.mkdir(reviewDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: provision.executablePath, args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e.message || e)));
const report = {};

// Wallet dialog from the cover.
await page.goto("http://127.0.0.1:4321/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.locator("button", { hasText: "Connect wallet" }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(reviewDir, "wallet-dialog.png") });
report.dialogFocus = await page.evaluate(() => document.activeElement?.className || "");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
report.dialogClosedByEscape = (await page.locator(".po-dialog").count()) === 0;

// Dashboard fee form.
await page.goto("http://127.0.0.1:4321/dashboard", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
await page.locator("button", { hasText: "Open" }).first().click();
await page.waitForTimeout(300);
await page.locator("#fee-amount").fill("10");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(reviewDir, "dashboard-fee-form.png"), fullPage: true });
report.feeFieldLabels = await page.evaluate(() => [...document.querySelectorAll("input")].map((i) => ({
  id: i.id,
  labelled: Boolean(document.querySelector(`label[for="${i.id}"]`)),
})));
report.splitPreview = await page.locator(".po-grid-four .po-label").allInnerTexts();
report.formOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);

// Docs jump link.
await page.goto("http://127.0.0.1:4321/docs", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
const link = page.locator(".po-contents-link", { hasText: "Fee schedule" }).first();
await link.click();
await page.waitForTimeout(500);
report.docsJump = await page.evaluate(() => ({ hash: location.hash, top: Math.round(document.getElementById("fees").getBoundingClientRect().top) }));
report.docsContentsSticky = await page.evaluate(() => getComputedStyle(document.querySelector(".po-contents")).position);

// Mobile dock navigation.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:4321/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.locator(".po-dock-link", { hasText: "Artworks" }).click();
await page.waitForTimeout(900);
report.mobileDock = { url: page.url(), h1: await page.locator("h1").first().innerText().catch(() => "") };
report.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);

report.consoleErrors = errors.filter((m) => !/favicon/i.test(m)).slice(0, 6);
console.log(JSON.stringify(report, null, 2));
await browser.close();
