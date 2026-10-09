import { execSync } from 'node:child_process';

import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// BASE_PATH lets the static build be served from a sub-path (GitHub Pages: /podman-desktop-next/<version>)
const base = (process.env.BASE_PATH ?? '') as '' | `/${string}`;

// Build-time version stamp: tag name (`v1`), `next`, `pr-<n>` on CI; `dev` locally.
const version = process.env.PUBLIC_MOCKUP_VERSION || 'dev';
function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
}
const sha = (process.env.PUBLIC_MOCKUP_SHA || gitSha()).slice(0, 7);

export default defineConfig({
  define: {
    __PDN_VERSION__: JSON.stringify(version),
    __PDN_SHA__: JSON.stringify(sha),
    __PDN_BASE__: JSON.stringify(base),
  },
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter({ fallback: '200.html' }),
      paths: { base },
      // Hash routing: GitHub Pages can't rewrite deep links, so the route lives in `#/…`
      router: { type: 'hash' },
    }),
  ],
});
