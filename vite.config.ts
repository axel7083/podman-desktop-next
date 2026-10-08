import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// BASE_PATH lets the static build be served from a sub-path (e.g. GitHub Pages: /podman-desktop-next)
const base = (process.env.BASE_PATH ?? '') as '' | `/${string}`;

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter({ fallback: '200.html' }),
      paths: { base },
    }),
  ],
});
