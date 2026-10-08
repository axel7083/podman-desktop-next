// Playwright helpers for the screenshot → evaluate → improve loop (plan §8).
// Uses the Chromium already cached in ~/.cache/ms-playwright (no download).
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Launch headless Chromium at 1440×900 @2x. Every console error / page error
 * is recorded; `assertNoErrors()` throws if any happened (smoke test).
 */
export async function launch({ baseUrl, run, scenario, theme }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  const outDir = path.join(ROOT, 'loop', 'runs', run, scenario, theme);
  await mkdir(outDir, { recursive: true });
  let step = 0;
  const shots = [];

  const api = {
    page,
    errors,
    outDir,
    shots,
    /** Open an app path with the mockup params (fresh state per journey). */
    async open(appPath, params = {}) {
      const url = new URL(appPath.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
      const search = new URLSearchParams({ scenario, theme, chrome: 'off', welcome: 'off', ...params });
      url.search = search.toString();
      await page.goto(url.toString());
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
