// Nav lab captures (throwaway): every proposal × 6 shots at 1440×900 @2x
// (1280×800 for `e`), stable paths under loop/runs/nav-lab/<proposal>/<shot>.png,
// thumbnails (480px) copied to static/nav-lab/ for the #/nav-lab index.
//
// Standalone: `pnpm build && node loop/journeys/nav-lab.mjs [p1 p2…]`.
// When picked up by run-all.mjs it only smoke-tests the index.
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

export const scenario = 'community';

/** run-all.mjs hook: smoke-test the index. */
export async function journey(t) {
  await t.open('/nav-lab');
  await t.shot('nav-lab-index');
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SHOTS_R2 = [
  { id: 'a-default', q: {} },
  { id: 'b-open', q: { open: 'on' } },
  { id: 'c-many-panel', q: { tabs: 'many', panel: 'on' } },
  { id: 'd-1280', q: { tabs: 'many', screen: '1280' }, viewport: { width: 1280, height: 800 } },
  { id: 'e-light', q: { theme: 'light' } },
  { id: 'f-colour', q: { color: 'on', tabs: 'many', panel: 'on', ctx: 'ocp-prod' } },
];

/** Per-proposal tweaks so each shot shows the idea (P9 open = folded tab groups menu). */
const R2_EXTRA = {
  p9: { 'b-open': { tabs: 'many' } },
};

const SHOTS = [
  { id: 'a-default', q: {} },
  { id: 'b-icons', q: { rail: 'icons' } },
  { id: 'c-labels', q: { rail: 'labels' } },
  { id: 'd-many-panel', q: { tabs: 'many', panel: 'on' } },
  { id: 'e-1280', q: { tabs: 'many', screen: '1280' }, viewport: { width: 1280, height: 800 } },
  { id: 'f-light', q: { theme: 'light' } },
];

async function main() {
  const BUILD = path.join(ROOT, 'build');
  if (!existsSync(BUILD)) throw new Error('run `pnpm build` first');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let file = path.join(BUILD, decodeURIComponent(url.pathname));
    if (!existsSync(file) || statSync(file).isDirectory()) file = path.join(BUILD, '200.html');
    const ext = path.extname(file);
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' }[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;

  const wanted = process.argv.slice(2);
  const proposals = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'].filter(p => wanted.length === 0 || wanted.includes(p));
  const browser = await chromium.launch({ headless: true });
  const thumbs = path.join(ROOT, 'static', 'nav-lab');
  mkdirSync(thumbs, { recursive: true });
  const errors = [];
  for (const p of proposals) {
    const outDir = path.join(ROOT, 'loop', 'runs', 'nav-lab', p);
    mkdirSync(outDir, { recursive: true });
    const round2 = Number(p.slice(1)) > 5;
    for (const shot of round2 ? SHOTS_R2 : SHOTS) {
      const viewport = shot.viewport ?? { width: 1440, height: 900 };
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(`${p}/${shot.id}: ${e.message}`));
      page.on('console', m => m.type() === 'error' && errors.push(`${p}/${shot.id}: ${m.text()}`));
      const q = new URLSearchParams({ p, bar: 'off', ...shot.q, ...(R2_EXTRA[p]?.[shot.id] ?? {}) });
      await page.goto(`${base}?chrome=off&welcome=off#/nav-lab?${q}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const file = path.join(outDir, `${shot.id}.png`);
      await page.screenshot({ path: file });
      execFileSync('magick', [file, '-resize', '480x', path.join(thumbs, `${p}-${shot.id}.png`)]);
      await context.close();
      console.log(`${p}/${shot.id}`);
    }
  }
  await browser.close();
  server.close();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
