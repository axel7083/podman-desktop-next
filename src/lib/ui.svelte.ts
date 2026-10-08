/**
 * Mockup-chrome state (not part of the product): theme, inspect overlay,
 * simulated speed, chrome visibility. Persisted to localStorage.
 */
import { browser } from '$app/env';

export type Theme = 'dark' | 'light';

function load<T>(key: string, fallback: T): T {
  if (!browser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  if (!browser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

class MockupUi {
  theme = $state<Theme>('dark');
  inspect = $state(false);
  speed = $state<1 | 5>(1);
  chrome = $state(true);
  /** Primary-nav width (PD: 50…240, collapsed below 70). */
  navWidth = $state(200);
  welcomeOpen = $state(false);
  paletteOpen = $state(false);
  taskManagerOpen = $state(false);
  statusPopoverOpen = $state(false);
  /** Pinned / hidden primary-nav items (connection or tool ids). */
  pinned = $state<string[]>([]);
  hidden = $state<string[]>([]);
  collapsedGroups = $state<string[]>([]);

  init(url: URL): void {
    const themeParam = url.searchParams.get('theme');
    this.theme = themeParam === 'light' || themeParam === 'dark' ? themeParam : load<Theme>('pdn.theme', 'dark');
    this.chrome = url.searchParams.get('chrome') !== 'off';
    const inspectParam = url.searchParams.get('inspect');
    this.inspect = inspectParam ? inspectParam === 'on' : load('pdn.inspect', false);
    this.speed = load<1 | 5>('pdn.speed', 1);
    this.navWidth = load('pdn.navWidth', 200);
    this.pinned = load<string[]>('pdn.pinned', []);
    this.hidden = load<string[]>('pdn.hidden', []);
    this.collapsedGroups = load<string[]>('pdn.collapsedGroups', []);
    this.applyTheme();
  }

  applyTheme(): void {
    if (!browser) return;
    document.documentElement.className = this.theme;
    document.documentElement.style.colorScheme = this.theme;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    save('pdn.theme', theme);
    this.applyTheme();
  }

  setInspect(on: boolean): void {
    this.inspect = on;
    save('pdn.inspect', on);
  }

  setSpeed(speed: 1 | 5): void {
    this.speed = speed;
    save('pdn.speed', speed);
  }

  setNavWidth(width: number): void {
    this.navWidth = width;
    save('pdn.navWidth', width);
  }

  togglePinned(id: string): void {
    this.pinned = this.pinned.includes(id) ? this.pinned.filter(p => p !== id) : [...this.pinned, id];
    this.hidden = this.hidden.filter(h => h !== id);
    save('pdn.pinned', this.pinned);
    save('pdn.hidden', this.hidden);
  }

  toggleHidden(id: string): void {
    this.hidden = this.hidden.includes(id) ? this.hidden.filter(h => h !== id) : [...this.hidden, id];
    this.pinned = this.pinned.filter(p => p !== id);
    save('pdn.pinned', this.pinned);
    save('pdn.hidden', this.hidden);
  }

  toggleGroup(id: string): void {
    this.collapsedGroups = this.collapsedGroups.includes(id)
      ? this.collapsedGroups.filter(g => g !== id)
      : [...this.collapsedGroups, id];
    save('pdn.collapsedGroups', this.collapsedGroups);
  }

  /** Scale a simulated duration by the speed control. */
  ms(duration: number): number {
    return Math.max(50, Math.round(duration / this.speed));
  }
}

export const ui = new MockupUi();
