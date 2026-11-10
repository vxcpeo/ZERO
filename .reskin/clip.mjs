import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = 'E:/workspace/chuangye/solana/zero/website';
const OUT = path.join(ROOT, '.reskin/current');
const TOOLS = path.join(ROOT, '.reskin/tools/node_modules');
const require = createRequire(path.join(TOOLS, 'noop.js'));
const { chromium } = require('playwright-core');

const raw = process.argv[2] || 'docs';
const slug = raw.replace(/[^a-z0-9-]+/gi, '-');
const route = raw === 'home' ? '/' : `/${raw}`;

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4472', '--strictPort'], {
  cwd: ROOT, stdio: 'ignore', windowsHide: true,
});
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.goto(`http://127.0.0.1:4472/#${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const height = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('height', height);
const step = 1400;
let index = 0;
for (let y = 0; y < height; y += step) {
  if (index >= 8) break;
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `clip-${slug}-${index}.png`) });
  index += 1;
}
await browser.close();
server.kill();
console.log('clips', index);
