// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {}
  /** Mockup version stamp (`v1`, `next`, `pr-12`, `dev`), injected by vite.config.ts. */
  const __PDN_VERSION__: string;
  /** Short commit sha of the build. */
  const __PDN_SHA__: string;
  /** `paths.base` of the build. */
  const __PDN_BASE__: string;
}
export {};
