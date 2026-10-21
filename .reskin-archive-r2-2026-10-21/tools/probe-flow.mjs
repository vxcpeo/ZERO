/**
 * Manual interaction probe: dynamic artwork route + wallet modal.
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
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto("http://127.0.0.1:4321/#/art/0", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
console.log("art/0:", JSON.stringify(await page.evaluate(() => ({
  title: document.title,
  h1: [...document.querySelectorAll("h1")].map((el) => el.innerText.trim()),
  bodyText: document.body.innerText.slice(0, 220).replace(/\s+/g, " "),
  skeletons: document.querySelectorAll(".ag-skeleton").length,
}))));
await page.screenshot({ path: path.join(project, ".reskin/review/art-detail-loading.png") });

await page.goto("http://127.0.0.1:4321/#/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.getByRole("button", { name: /connect wallet/i }).first().click();
await page.waitForTimeout(300);
console.log("modal:", JSON.stringify(await page.evaluate(() => {
  const dialog = document.querySelector(".ag-dialog");
  return {
    open: Boolean(dialog),
    heading: dialog?.querySelector("h3")?.textContent?.trim() || null,
    buttons: dialog ? [...dialog.querySelectorAll("button")].map((b) => b.innerText.trim()).slice(0, 8) : [],
  };
})));
await page.screenshot({ path: path.join(project, ".reskin/review/wallet-modal.png") });
console.log("console errors:", JSON.stringify(errors));
await browser.close();
