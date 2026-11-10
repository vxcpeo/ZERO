import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = 'E:/workspace/chuangye/solana/zero/website';
const OUT = path.join(ROOT, '.reskin/current');
const TOOLS = path.join(ROOT, '.reskin/tools/node_modules');
const require = createRequire(path.join(TOOLS, 'noop.js'));
const { chromium } = require('playwright-core');

const raw = process.argv[2] || 'docs';
const width = Number(process.argv[3] || 390);
const height = Number(process.argv[4] || 844);
const slug = `${raw.replace(/[^a-z0-9-]+/gi, '-')}-${width}`;
const route = raw === 'home' ? '/' : `/${raw}`;

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4473', '--strictPort'], {
  cwd: ROOT, stdio: 'ignore', windowsHide: true,
});
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(`http://127.0.0.1:4473/#${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('height', total);
for (let i = 0; i < 4; i += 1) {
  await page.evaluate((top) => window.scrollTo(0, top), i * height);
  await page.waitForTimeout(220);
  await page.screenshot({ path: path.join(OUT, `mobile-${slug}-${i}.png`) });
}
await browser.close();
server.kill();
