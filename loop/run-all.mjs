// Build output → static server on a free port → every journey in dark + light.
// Usage: node loop/run-all.mjs [journey…]   (run `pnpm build` first)
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { launch, ROOT } from './lib.mjs';

const BUILD = path.join(ROOT, 'build');
if (!existsSync(BUILD)) {
  console.error('No build/ directory – run `pnpm build` first.');
  process.exit(1);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let file = path.join(BUILD, decodeURIComponent(url.pathname));
  if (!file.startsWith(BUILD) || !existsSync(file) || statSync(file).isDirectory()) {
    const index = path.join(file, 'index.html');
    file = existsSync(index) ? index : path.join(BUILD, '200.html');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
const baseUrl = `http://127.0.0.1:${port}/`;

const run = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const wanted = process.argv.slice(2);
const journeyDir = path.join(ROOT, 'loop', 'journeys');
const journeys = readdirSync(journeyDir)
  .filter(f => f.endsWith('.mjs'))
  .filter(f => wanted.length === 0 || wanted.includes(f.replace('.mjs', '')));

const summary = [];
let failed = false;
for (const file of journeys) {
  const mod = await import(pathToFileURL(path.join(journeyDir, file)).href);
  for (const theme of ['dark', 'light']) {
    const t = await launch({ baseUrl, run, scenario: mod.scenario, theme, name: file.replace('.mjs', '') });
    const started = Date.now();
    try {
      await mod.journey(t);
      t.assertNoErrors();
      summary.push({ journey: file, theme, ok: true, shots: t.shots.length, ms: Date.now() - started });
    } catch (err) {
      failed = true;
      await t.shot('failure').catch(() => undefined);
      summary.push({ journey: file, theme, ok: false, shots: t.shots.length, error: String(err).split('\n').slice(0, 6).join(' | ') });
    } finally {
      await t.close();
    }
  }
}
server.close();

console.log(`\nRun ${run} → loop/runs/${run}/`);
for (const s of summary) {
  console.log(`${s.ok ? 'PASS' : 'FAIL'}  ${s.journey.padEnd(20)} ${s.theme.padEnd(5)} ${String(s.shots).padStart(2)} screenshots${s.ok ? ` (${s.ms} ms)` : `  ${s.error}`}`);
}
process.exit(failed ? 1 : 0);
