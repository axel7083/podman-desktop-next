/**
 * Extension registry: discovers every `src/extensions/<id>/index.ts`
 * (folders starting with `_` are templates and are skipped), keeps the
 * enabled set per scenario, and derives every contribution type from the
 * enabled extensions.
 */
import { browser } from '$app/env';

import type {
  ConnectionDef,
  ConnectionView,
  Contributed,
  Contributions,
  ExtensionMeta,
  MenuDef,
  MockExtension,
  ResourceContext,
  ScenarioId,
} from '#lib/ext/types.ts';
import { parseScenarioParam, scenarioContext, scenarioKey } from '#lib/scenarios.ts';
import { clearWorld, loadWorld, toast, world } from '#lib/world.svelte.ts';
import { storageKey } from '#lib/version.ts';

const modules = import.meta.glob<{ default: MockExtension }>('/src/extensions/*/index.ts', { eager: true });

/** All known mock extensions (templates excluded), sorted builtin-first then by name. */
/** `?template=on` also loads `src/extensions/_template` (smoke test of every contribution point). */
const includeTemplate = browser && new URLSearchParams(location.search).get('template') === 'on';

export const ALL_EXTENSIONS: MockExtension[] = Object.entries(modules)
  .filter(([path]) => !/\/extensions\/_/.test(path) || (includeTemplate && path.includes('/_template/')))
  .map(([, mod]) => mod.default)
  .toSorted((a, b) => Number(!!b.builtin) - Number(!!a.builtin) || a.displayName.localeCompare(b.displayName));

const byId = new Map(ALL_EXTENSIONS.map(e => [e.id, e]));

export function getExtension(id: string): MockExtension | undefined {
  return byId.get(id);
}

export function meta(ext: MockExtension): ExtensionMeta {
  return { id: ext.id, displayName: ext.displayName, icon: ext.icon, category: ext.category };
}

/** Transitive dependencies (incl. pack members) of an extension (excluding itself). Unknown ids are skipped. */
export function dependenciesOf(id: string, seen = new Set<string>()): string[] {
  const ext = byId.get(id);
  for (const dep of [...(ext?.dependsOn ?? []), ...(ext?.packOf ?? [])]) {
    if (byId.has(dep) && !seen.has(dep)) {
      seen.add(dep);
      dependenciesOf(dep, seen);
    }
  }
  return [...seen];
}

/** Extensions that (transitively) depend on `id`. */
export function dependentsOf(id: string): string[] {
  return ALL_EXTENSIONS.filter(e => dependenciesOf(e.id).includes(id)).map(e => e.id);
}

/** Preset enabled set of a scenario selection: built-ins + tagged + their deps. */
export function presetFor(scenarios: readonly ScenarioId[]): string[] {
  const set = new Set<string>();
  for (const ext of ALL_EXTENSIONS) {
    if (ext.builtin || ext.tags.some(t => scenarios.includes(t))) {
      set.add(ext.id);
      dependenciesOf(ext.id).forEach(d => set.add(d));
    }
  }
  return [...set].filter(id => byId.has(id));
}

function load<T>(key: string): T | undefined {
  if (!browser) return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function save(key: string, value: unknown): void {
  if (browser) localStorage.setItem(key, JSON.stringify(value));
}

type ContributionKey = Exclude<keyof Contributions, 'connections'>;
type ItemOf<K extends ContributionKey> = NonNullable<Contributions[K]>[number];

class Registry {
  scenarios = $state<ScenarioId[]>(['community']);
  enabled = $state<string[]>([]);
  ready = $state(false);

  readonly key = $derived(scenarioKey(this.scenarios));
  readonly scenarioCtx = $derived(scenarioContext(this.scenarios));
  readonly preset = $derived(presetFor(this.scenarios));

  /** Enabled extensions, in registry order. */
  readonly extensions = $derived(ALL_EXTENSIONS.filter(e => this.enabled.includes(e.id)));

  /** "Installed" = preset ∪ enabled (what the Extensions › Installed tab lists). */
  readonly installed = $derived(
    ALL_EXTENSIONS.filter(e => this.enabled.includes(e.id) || this.preset.includes(e.id)),
  );

  /** Catalog = known but not installed. */
  readonly catalog = $derived(ALL_EXTENSIONS.filter(e => !this.installed.includes(e)));

  /** Every connection: static + dynamic, with runtime status; disabled-owner ones flagged. */
  readonly connections: ConnectionView[] = $derived.by(() => {
    const result: ConnectionView[] = [];
    const deleted = new Set(world.deletedConnections);
    for (const ext of this.installed) {
      const isEnabled = this.enabled.includes(ext.id);
      const raw = ext.contributes.connections;
      const defs: ConnectionDef[] = typeof raw === 'function' ? raw(this.scenarioCtx) : (raw ?? []);
      const dynamic = world.dynamicConnections.filter(d => d.ownerExt === ext.id);
      for (const def of [...defs.filter(d => !dynamic.some(x => x.id === d.id)), ...dynamic]) {
        if (deleted.has(def.id)) continue;
        result.push({
          ...def,
          icon: def.icon ?? ext.icon,
          status: isEnabled ? (world.connStatus[def.id] ?? def.initialStatus) : 'unknown',
          ext: meta(ext),
          dynamic: dynamic.includes(def as (typeof dynamic)[number]),
          extensionDisabled: !isEnabled,
        });
      }
    }
    // stable order: Podman first (default engine), then by provider and name
    return result.toSorted(
      (a, b) =>
        Number(a.providerId !== 'podman') - Number(b.providerId !== 'podman') ||
        a.providerName.localeCompare(b.providerName) ||
        a.name.localeCompare(b.name),
    );
  });

  /** Connections of enabled extensions only. */
  readonly activeConnections = $derived(this.connections.filter(c => !c.extensionDisabled));

  getConnection(id: string): ConnectionView | undefined {
    return this.connections.find(c => c.id === id);
  }

  /** Generic accessor for a contribution type, enriched with the extension meta. */
  contributions<K extends ContributionKey>(key: K): Contributed<ItemOf<K>>[] {
    const out: Contributed<ItemOf<K>>[] = [];
    for (const ext of this.extensions) {
      const items = (ext.contributes[key] ?? []) as ItemOf<K>[];
      for (const item of items) out.push({ ...item, ext: meta(ext) } as Contributed<ItemOf<K>>);
    }
    return out;
  }

  readonly factories = $derived(this.contributions('connectionFactories'));
  readonly navSections = $derived(this.contributions('navSections'));
  readonly tools = $derived(this.contributions('tools'));
  readonly tabs = $derived(this.contributions('tabs'));
  readonly menus = $derived(this.contributions('menus'));
  readonly columns = $derived(this.contributions('columns'));
  readonly groupers = $derived(this.contributions('groupers'));
  readonly checkers = $derived(this.contributions('imageCheckers'));
  readonly addons = $derived(this.contributions('addons'));
  readonly accounts = $derived(this.contributions('accounts'));
  readonly registries = $derived(this.contributions('registries'));
  readonly cliTools = $derived(this.contributions('cliTools'));
  readonly dashboardCards = $derived(this.contributions('dashboardCards'));
  readonly statusItems = $derived(this.contributions('statusItems'));
  readonly commands = $derived(this.contributions('commands'));
  readonly settings = $derived(this.contributions('settings'));
  readonly onboarding = $derived(this.contributions('onboarding'));

  /* `when`-filtered views ------------------------------------------- */

  navSectionsFor(conn: ConnectionView): Contributed<ItemOf<'navSections'>>[] {
    return this.navSections.filter(s => s.when(conn)).toSorted((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  tabsFor(ctx: ResourceContext): Contributed<ItemOf<'tabs'>>[] {
    return this.tabs.filter(t => t.target === ctx.target && (t.when?.(ctx) ?? true));
  }

  menusFor(ctx: ResourceContext, placement: MenuDef['placement']): Contributed<MenuDef>[] {
    return this.menus.filter(m => m.target === ctx.target && m.placement === placement && (m.when?.(ctx) ?? true));
  }

  addonsFor(conn: ConnectionView): Contributed<ItemOf<'addons'>>[] {
    return this.addons.filter(a => a.when(conn));
  }

  /* ---------------------------------------------------------------- */

  /** Initialise from URL (`?scenario=`) or storage. Returns true on first visit. */
  init(url: URL): boolean {
    const fromUrl = parseScenarioParam(url.searchParams.get('scenario'));
    const stored = load<ScenarioId[]>(storageKey('scenarios'));
    const firstVisit = !fromUrl && !stored;
    this.applyScenarios(fromUrl ?? stored ?? ['community']);
    this.ready = true;
    return firstVisit;
  }

  setScenarios(ids: ScenarioId[]): void {
    this.applyScenarios(ids.length ? ids : ['community']);
  }

  /**
   * Enabled set = scenario preset + the user's overrides for this selection
   * (`pdn.overrides.<key>`: extensions installed/enabled on top of the preset,
   * preset extensions disabled). Re-opening a scenario (URL or picker) keeps
   * the user's changes; "Reset extensions" drops the overrides.
   */
  private applyScenarios(ids: ScenarioId[]): void {
    this.scenarios = ids;
    save(storageKey('scenarios'), ids);
    const overrides = load<{ on: string[]; off: string[] }>(storageKey(`overrides.${this.key}`)) ?? { on: [], off: [] };
    const set = new Set([...this.preset, ...overrides.on]);
    overrides.off.forEach(id => set.delete(id));
    this.enabled = ALL_EXTENSIONS.map(e => e.id).filter(id => set.has(id));
    loadWorld(this.key);
    this.seedMissing();
  }

  /** Persist the difference between the enabled set and the preset. */
  private saveOverrides(): void {
    save(storageKey(`overrides.${this.key}`), {
      on: this.enabled.filter(id => !this.preset.includes(id)),
      off: this.preset.filter(id => !this.enabled.includes(id)),
    });
  }

  private seedMissing(): void {
    for (const ext of this.extensions) {
      if (!world.seeded.includes(ext.id)) {
        world.seeded.push(ext.id);
        ext.seed?.(world, this.scenarioCtx);
      }
    }
  }

  isEnabled(id: string): boolean {
    return this.enabled.includes(id);
  }

  enable(id: string): void {
    const deps = dependenciesOf(id).filter(d => !this.enabled.includes(d));
    this.enabled = [...this.enabled, ...deps, id].filter((v, i, a) => a.indexOf(v) === i);
    this.saveOverrides();
    this.seedMissing();
    if (deps.length) {
      toast({
        type: 'info',
        title: `Also enabled ${deps.length} required extension${deps.length > 1 ? 's' : ''}`,
        body: deps.map(d => byId.get(d)?.displayName ?? d).join(', '),
      });
    }
  }

  disable(id: string): void {
    const dependents = dependentsOf(id).filter(d => this.enabled.includes(d));
    this.enabled = this.enabled.filter(e => e !== id && !dependents.includes(e));
    this.saveOverrides();
    if (dependents.length) {
      toast({
        type: 'warning',
        title: `Also disabled ${dependents.length} dependent extension${dependents.length > 1 ? 's' : ''}`,
        body: dependents.map(d => byId.get(d)?.displayName ?? d).join(', '),
      });
    }
  }

  toggle(id: string): void {
    if (this.isEnabled(id)) this.disable(id);
    else this.enable(id);
  }

  /** Restore the scenario's preset enabled set. */
  resetExtensions(): void {
    this.enabled = [...this.preset];
    this.saveOverrides();
    this.seedMissing();
  }

  /** Wipe the simulated world and re-seed every enabled extension. */
  resetWorld(): void {
    clearWorld();
    if (browser) localStorage.removeItem(storageKey(`world.${this.key}`));
    loadWorld(this.key);
    this.seedMissing();
  }
}

export const registry = new Registry();
