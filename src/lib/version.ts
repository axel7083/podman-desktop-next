/**
 * Build-time version stamp of the mockup and version-scoped storage keys:
 * v1/, v2/, next/ … share the GitHub Pages origin, so their state must not collide.
 */
export const MOCKUP_VERSION: string = __PDN_VERSION__;
export const MOCKUP_SHA: string = __PDN_SHA__;
/** `paths.base` of the build (`/podman-desktop-next/v1`, '' locally). */
const BASE: string = __PDN_BASE__;

/** `theme` → `pdn:v1:theme`. Keep in sync with the pre-paint script in app.html. */
export function storageKey(name: string): string {
  return `pdn:${MOCKUP_VERSION}:${name}`;
}

/** Site root holding `versions.json` (`/podman-desktop-next` for base `/podman-desktop-next/v1`); undefined when not deployed in a version folder. */
export function siteRoot(): string | undefined {
  if (!BASE) return undefined;
  return BASE.replace(/\/[^/]+$/, '');
}

export interface VersionEntry {
  id: string;
  kind: 'release' | 'preview' | 'pr';
  ref?: string;
  date?: string;
}

/** Published versions (from `<site-root>/versions.json`), or [] when unavailable (local dev). */
export async function fetchVersions(): Promise<VersionEntry[]> {
  const root = siteRoot();
  if (root === undefined) return [];
  try {
    const res = await fetch(`${root}/versions.json`, { cache: 'no-cache' });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as VersionEntry[]).filter(v => typeof v?.id === 'string') : [];
  } catch {
    return [];
  }
}

/** URL of the same screen in another published version (keeps mockup params and the hash route). */
export function versionUrl(id: string): string {
  return `${siteRoot() ?? ''}/${id}/${location.search}${location.hash}`;
}
