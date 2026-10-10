/**
 * Tab context menu shared by the editor strip and the bottom-panel session
 * strip (rule A1): Close, Close others, Close tabs to the right, Close all.
 */
import type { MenuItem } from '../r3/live.svelte.ts';

export function tabCloseMenu(keys: string[], key: string, close: (key: string) => void): MenuItem[] {
  const idx = keys.indexOf(key);
  return [
    { label: 'Close', run: (): void => close(key) },
    { label: 'Close others', disabled: keys.length < 2, run: (): void => keys.filter(k => k !== key).forEach(close) },
    { label: 'Close tabs to the right', disabled: idx === keys.length - 1, run: (): void => keys.slice(idx + 1).forEach(close) },
    { label: 'Close all', run: (): void => [...keys].forEach(close) },
  ];
}
