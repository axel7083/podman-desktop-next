/**
 * Dismissed banners / hints (Hummingbird promo in Images…), remembered in
 * localStorage so a ✕ stays closed across reloads.
 */
const KEY = 'p13.dismissed';

function load(): string[] {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export const dismissed = $state<{ ids: string[] }>({ ids: load() });

export function isDismissed(id: string): boolean {
  return dismissed.ids.includes(id);
}

export function dismiss(id: string): void {
  if (isDismissed(id)) return;
  dismissed.ids = [...dismissed.ids, id];
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(dismissed.ids));
  } catch {
    // Storage unavailable (private mode): dismissed for this session only.
  }
}
