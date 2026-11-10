/**
 * Per-route visual + accessibility audit using hash URLs (the shipped router is hash-based,
 * so path URLs would all fall back to the home route).
 *
 * Writes full-page desktop/mobile screenshots to .reskin/current/, plus axe results
 * (including colour contrast) and document-overflow checks per route.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = 'E:/workspace/chuangye/solana/zero/website';
const OUT = path.join(ROOT, '.reskin/current');
const TOOLS = path.join(ROOT, '.reskin/tools/node_modules');
const require = createRequire(path.join(TOOLS, 'noop.js'));
const { chromium } = require('playwright-core');
const axePath = path.join(TOOLS, 'axe-core/axe.min.js');

const ROUTES = [
  ['/', 'home'],
  ['/mine', 'mine'],
  ['/art', 'art'],
  ['/dashboard', 'dashboard'],
  ['/docs', 'docs'],
];

const PORT = 4419;
const BASE = `http://127.0.0.1:${PORT}`;

async function freePort(port) {
  const net = await import('node:net');
  for (let p = port; p < port + 30; p += 1) {
    const ok = await new Promise((resolve) => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.once('listening', () => s.close(() => resolve(true)));
      s.listen(p, '127.0.0.1');
    });
    if (ok) return p;
  }
  throw new Error('no free port');
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const port = await freePort(PORT);
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    windowsHide: true,
  });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) { ready = true; break; }
    } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!ready) { server.kill(); throw new Error('preview server did not start'); }

  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const report = {};
  try {
    for (const [route, slug] of ROUTES) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
      await page.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      const desktop = await page.screenshot({ path: path.join(OUT, `routes-${slug}-desktop.png`), fullPage: true });
      const deskMeta = await page.evaluate(() => {
        const de = document.documentElement;
        return {
          title: document.title,
          h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
          scrollWidth: de.scrollWidth,
          clientWidth: de.clientWidth,
          landmarks: [...document.querySelectorAll('header,nav,main,footer,aside')].map((e) => e.tagName.toLowerCase()),
          words: (document.body.innerText.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length,
        };
      });
      await page.addScriptTag({ path: axePath });
      const axe = await page.evaluate(async () => {
        const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
      });
      await context.close();

      const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const mpage = await mobileContext.newPage();
      await mpage.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
      await mpage.waitForTimeout(700);
      await mpage.screenshot({ path: path.join(OUT, `routes-${slug}-mobile.png`), fullPage: true });
      const mobileMeta = await mpage.evaluate(() => {
        const de = document.documentElement;
        const nav = [...document.querySelectorAll('a[href]')].filter((a) => {
          const r = a.getBoundingClientRect();
          const cs = getComputedStyle(a);
          return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
        }).map((a) => a.getAttribute('href'));
        return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, visibleLinks: nav };
      });
      await mobileContext.close();

      report[slug] = { route, desktop: deskMeta, mobile: mobileMeta, axe, consoleErrors };
      console.log(`${slug}: deskt(top ${deskMeta.scrollWidth}/${deskMeta.clientWidth}) mob(${mobileMeta.scrollWidth}/${mobileMeta.clientWidth}) h1=${deskMeta.h1.length} axe=${axe.map((a) => `${a.id}:${a.impact}:${a.nodes}`).join(',') || 'clean'} console=${consoleErrors.length}`);
      if (deskMeta.scrollWidth > deskMeta.clientWidth + 2) console.log('  DESKTOP OVERFLOW');
      if (mobileMeta.scrollWidth > mobileMeta.clientWidth + 2) console.log('  MOBILE OVERFLOW');
      for (const err of consoleErrors.slice(0, 4)) console.log('  console:', err.slice(0, 160));
    }
  } finally {
    await browser.close();
    server.kill();
  }
  await fs.writeFile(path.join(OUT, 'routes-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log('done');
}

await main();
