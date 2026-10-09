// Playwright helpers for the screenshot → evaluate → improve loop (plan §8).
// Uses the Chromium already cached in ~/.cache/ms-playwright (no download).
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Params read by the mockup chrome from the document query (not the route). */
export const MOCKUP_PARAMS = ['scenario', 'theme', 'chrome', 'welcome', 'inspect', 'speed', 'template'];

/** Storage key of the local (`dev`) build: mirrors src/lib/version.ts. */
export const storageKey = name => `pdn:dev:${name}`;

/**
 * Document URL of an app path: mockup params (defaults chrome=off, welcome=off)
 * in the query, the route + route params in the hash.
 */
export function appUrl(baseUrl, appPath, params = {}) {
  const [pathPart, query] = appPath.split('?');
  const url = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const all = { chrome: 'off', welcome: 'off', ...Object.fromEntries(new URLSearchParams(query ?? '')), ...params };
  const mockup = new URLSearchParams();
  const route = new URLSearchParams();
  // `template` is both a mockup switch (`on`) and a route param (Developer Hub template name)
  const isMockup = (k, v) => MOCKUP_PARAMS.includes(k) && (k !== 'template' || v === 'on' || v === 'off');
  for (const [k, v] of Object.entries(all)) (isMockup(k, v) ? mockup : route).set(k, v);
  url.search = mockup.toString();
  const routeQuery = route.toString();
  url.hash = `#/${pathPart.replace(/^\//, '')}${routeQuery ? `?${routeQuery}` : ''}`;
  return url.toString();
}

/**
 * Launch headless Chromium at 1440×900 @2x. Every console error / page error
 * is recorded; `assertNoErrors()` throws if any happened (smoke test).
 */
export async function launch({ baseUrl, run, scenario, theme, name = scenario }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  const outDir = path.join(ROOT, 'loop', 'runs', run, name, theme);
  await mkdir(outDir, { recursive: true });
  let step = 0;
  const shots = [];

  const api = {
    page,
    errors,
    outDir,
    shots,
    /**
     * Open an app path with the mockup params (fresh state per journey).
     * Hash routing: mockup params go in the document query, the route and its
     * own params in the hash → `/?scenario=x&theme=dark#/c/y?tab=z`.
     */
    async open(appPath, params = {}) {
      await page.goto(appUrl(baseUrl, appPath, { scenario, theme, ...params }));
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
    },
    /** Full-page screenshot named `<NN>-<name>.png`. */
    async shot(name) {
      step += 1;
      await page.waitForTimeout(250);
      const file = path.join(outDir, `${String(step).padStart(2, '0')}-${name}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
      return file;
    },
    assertNoErrors() {
      if (errors.length) throw new Error(`Console errors:\n${errors.join('\n')}`);
    },
    async close() {
      await browser.close();
    },
  };
  return api;
}
