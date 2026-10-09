#!/usr/bin/env node
// Maintain the root of the gh-pages checkout: merge one version into versions.json
// (or drop it) and regenerate index.html (redirect to the latest release + picker).
//
//   node scripts/pages/update-site.mjs <site-dir> --id v2 --kind release --ref <sha>
//   node scripts/pages/update-site.mjs <site-dir> --remove pr-12
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    id: { type: 'string' },
    kind: { type: 'string' },
    ref: { type: 'string' },
    date: { type: 'string' },
    remove: { type: 'string' },
  },
});

const site = positionals[0];
if (!site || (!values.id && !values.remove)) {
  console.error('usage: update-site.mjs <site-dir> (--id <id> --kind release|preview|pr --ref <sha> | --remove <id>)');
  process.exit(2);
}

const file = path.join(site, 'versions.json');
/** @type {{ id: string, kind: 'release' | 'preview' | 'pr', ref?: string, date?: string }[]} */
let versions = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];

if (values.remove) versions = versions.filter(v => v.id !== values.remove);
if (values.id) {
  const kind = values.kind ?? 'release';
  if (!['release', 'preview', 'pr'].includes(kind)) throw new Error(`bad --kind ${kind}`);
  const entry = { id: values.id, kind, ref: values.ref ?? '', date: values.date ?? new Date().toISOString() };
  versions = [...versions.filter(v => v.id !== values.id), entry];
  // keep only folders that exist (a removed PR preview, a manual cleanup, …)
  versions = versions.filter(v => existsSync(path.join(site, v.id)));
}

// releases (v1, v2, … numeric order), then `next`, then PR previews
const rank = { release: 0, preview: 1, pr: 2 };
const num = id => Number(id.replace(/^\D+/, '').split('.')[0]) || 0;
versions.sort((a, b) => rank[a.kind] - rank[b.kind] || num(a.id) - num(b.id) || a.id.localeCompare(b.id, 'en', { numeric: true }));

writeFileSync(file, `${JSON.stringify(versions, null, 2)}\n`);

const releases = versions.filter(v => v.kind === 'release');
const latest = (releases.at(-1) ?? versions.find(v => v.kind === 'preview') ?? versions[0])?.id;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const label = { release: 'Release', preview: 'Preview of main', pr: 'Pull request preview' };
const rows = [...versions]
  .reverse()
  .map(
    v => `      <li><a href="./${esc(v.id)}/">${esc(v.id)}</a><span class="kind">${label[v.kind]}</span><span class="meta">${esc((v.date ?? '').slice(0, 10))} · ${esc((v.ref ?? '').slice(0, 7))}</span></li>`,
  )
  .join('\n');

writeFileSync(
  path.join(site, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Podman Desktop · next (mockup) — versions</title>
    <script>
      // Go to the latest release, keeping mockup params and the hash route (?scenario=x#/settings).
      ${latest ? `location.replace('./${latest}/' + location.search + location.hash);` : ''}
    </script>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f0f11; color: #e4e4e7; font: 14px/1.5 system-ui, sans-serif; }
      main { width: min(520px, 90vw); background: #27272a; border-radius: 8px; padding: 24px 28px; box-shadow: 0 8px 24px #0006; }
      h1 { margin: 0 0 4px; font-size: 18px; } p { margin: 0 0 16px; color: #a1a1aa; }
      ul { list-style: none; margin: 0; padding: 0; } li { display: flex; gap: 12px; align-items: baseline; padding: 8px 0; border-top: 1px solid #3f3f46; }
      a { color: #a78bfa; font-weight: 600; min-width: 64px; text-decoration: none; } a:hover { text-decoration: underline; }
      .kind { flex: 1; } .meta { color: #71717a; font-family: ui-monospace, monospace; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Podman Desktop · next (mockup)</h1>
      <p>Pick a published version${latest ? ` — redirecting to <a href="./${esc(latest)}/">${esc(latest)}</a>…` : ''}</p>
      <ul>
${rows}
      </ul>
    </main>
  </body>
</html>
`,
);
console.log(`versions.json: ${versions.map(v => v.id).join(', ') || '(empty)'} · latest → ${latest ?? 'none'}`);
