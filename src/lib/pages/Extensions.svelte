<script lang="ts">
/**
 * Extensions page – PD's ExtensionList / InstalledExtensionCard /
 * CatalogExtension, with enable/disable toggles, dependency info and a
 * "contributes" summary (provenance of every contribution point + P#).
 * Scaling (docs/ia.md): category + status filters, results grouped by
 * category, packs listed with their members nested, compact cards.
 */
import { faCloudDownload, faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';
import { Button, FilteredEmptyScreen, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import Badge from '#lib/components/Badge.svelte';
import SlideToggle from '#lib/components/SlideToggle.svelte';
import { dependenciesOf, dependentsOf, getExtension, registry } from '#lib/ext/registry.svelte.ts';
import { type Contributions, EXTENSION_CATEGORIES, type MockExtension } from '#lib/ext/types.ts';
import { SCENARIOS } from '#lib/scenarios.ts';
import { ui } from '#lib/ui.svelte.ts';
import { plural } from '#lib/util.ts';

let searchTerm = $state(page.url.searchParams.get('q') ?? '');
let screen = $state<'installed' | 'catalog'>(page.url.searchParams.get('tab') === 'catalog' ? 'catalog' : 'installed');
let category = $state<string>(page.url.searchParams.get('category') ?? 'all');
let status = $state<'all' | 'enabled' | 'disabled'>('all');

function matches(e: MockExtension): boolean {
  const t = searchTerm.toLowerCase();
  if (!t) return true;
  const kinds = Object.keys(e.contributes).join(' ').toLowerCase();
  return `${e.displayName} ${e.id} ${e.description} ${kinds} ${e.pApis.join(' ')}`.toLowerCase().includes(t) || (t.includes('checker') && !!e.contributes.imageCheckers);
}

function inCategory(e: MockExtension): boolean {
  return category === 'all' || e.category === category;
}

function inStatus(e: MockExtension): boolean {
  return status === 'all' || (status === 'enabled') === registry.isEnabled(e.id);
}

/** Query-filtered bases: tab counts, chip counts and the summary follow the search. */
const installedQ = $derived(registry.installed.filter(matches));
const catalogQ = $derived(registry.catalog.filter(matches));

const installed = $derived(installedQ.filter(e => inCategory(e) && inStatus(e)));
const catalog = $derived(catalogQ.filter(inCategory));

/** Pack members shown under their pack (when the pack is in the result too). */
const packMembers = $derived(new Set(installed.filter(e => e.packOf).flatMap(e => e.packOf ?? [])));

interface Section {
  category: string;
  items: { ext: MockExtension; member?: boolean }[];
}

function sectionsOf(list: MockExtension[], nestPacks: boolean): Section[] {
  const out: Section[] = [];
  for (const c of EXTENSION_CATEGORIES) {
    const items: Section['items'] = [];
    for (const e of list.filter(x => x.category === c)) {
      if (nestPacks && packMembers.has(e.id)) continue;
      items.push({ ext: e });
      if (nestPacks && e.packOf) {
        for (const m of e.packOf) {
          const me = list.find(x => x.id === m);
          if (me) items.push({ ext: me, member: true });
        }
      }
    }
    if (items.length) out.push({ category: c, items });
  }
  return out;
}

const installedSections = $derived(sectionsOf(installed, true));
const catalogSections = $derived(sectionsOf(catalog, false));

/** Category counts for the filter chips (current tab, after search + status filter). */
function categoryCount(c: string): number {
  const base = screen === 'installed' ? installedQ.filter(inStatus) : catalogQ;
  return c === 'all' ? base.length : base.filter(e => e.category === c).length;
}

/** Whether a category exists at all on the current tab (unfiltered) – chips never jump around while typing. */
function categoryExists(c: string): boolean {
  const base = screen === 'installed' ? registry.installed : registry.catalog;
  return c === 'all' || base.some(e => e.category === c);
}

const query = $derived(searchTerm.trim());
const tabTotal = $derived(screen === 'installed' ? registry.installed.length : registry.catalog.length);
const tabMatches = $derived(screen === 'installed' ? installedQ.length : catalogQ.length);

function setCategory(c: string): void {
  category = c;
}

function setStatus(st: 'all' | 'enabled' | 'disabled'): void {
  status = st;
}

/** Disabled dependencies that would be enabled together (notice before the toggle). */
function missingDeps(e: MockExtension): string[] {
  return dependenciesOf(e.id).filter(d => !registry.isEnabled(d));
}

const LABELS: Record<keyof Contributions, string> = {
  connections: 'connection',
  connectionFactories: 'factory',
  navSections: 'nav section',
  tools: 'tool',
  tabs: 'tab',
  menus: 'menu',
  columns: 'column',
  groupers: 'grouper',
  imageCheckers: 'image checker',
  addons: 'add-on',
  accounts: 'account',
  registries: 'registry',
  cliTools: 'CLI tool',
  dashboardCards: 'dashboard card',
  statusItems: 'status item',
  commands: 'command',
  settings: 'settings section',
  onboarding: 'onboarding',
};

function contributes(e: MockExtension): string[] {
  return (Object.keys(e.contributes) as (keyof Contributions)[])
    .map(k => {
      const v = e.contributes[k];
      const n = typeof v === 'function' ? 1 : Array.isArray(v) ? v.length : 0;
      return n ? plural(n, LABELS[k], LABELS[k] === 'registry' ? 'registries' : `${LABELS[k]}s`) : '';
    })
    .filter(Boolean);
}

function names(ids: string[]): string {
  return ids.map(id => getExtension(id)?.displayName ?? id).join(', ');
}

function setScreen(s: 'installed' | 'catalog'): void {
  screen = s;
}

function toggle(e: MockExtension, checked: boolean): void {
  if (checked) registry.enable(e.id);
  else registry.disable(e.id);
}

function install(e: MockExtension): void {
  registry.enable(e.id);
}

function resetFilter(): void {
  searchTerm = '';
  category = 'all';
  status = 'all';
}

function scenarioNames(e: MockExtension): string {
  return e.tags.map(t => SCENARIOS.find(s => s.id === t)?.label ?? t).join(', ');
}

function suggestedFor(e: MockExtension): string | undefined {
  return e.tags.length ? `Suggested for: ${scenarioNames(e)}` : undefined;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Extensions">
  {#snippet additionalActions()}
    <Button icon={faCloudDownload} title="Install manually an extension" aria-label="Install custom" type="secondary">Install custom...</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}
    {#if screen === 'installed'}
      <div class="flex items-center gap-0.5" role="group" aria-label="Status filter">
        {#each [['all', 'All'], ['enabled', 'Enabled'], ['disabled', 'Disabled']] as [st, label] (st)}
          <button
            class="rounded-sm px-2 py-0.5 text-sm {status === st ? 'bg-[var(--pd-content-card-inset-surface)] text-[var(--pd-content-header)] font-semibold' : 'text-[var(--pd-content-text)]'}"
            aria-pressed={status === st}
            onclick={setStatus.bind(undefined, st as 'all' | 'enabled' | 'disabled')}>{label}</button>
        {/each}
      </div>
    {/if}
    <div class="text-sm text-[var(--pd-content-text)] whitespace-nowrap" aria-live="polite">
      {#if query}
        {tabMatches} of {tabTotal} match “{query}”
      {:else}
        {registry.installed.length} installed · {registry.extensions.length} enabled · {registry.catalog.length} more in catalog
      {/if}
    </div>
  {/snippet}
  {#snippet tabs()}
    <Button type="tab" onclick={setScreen.bind(undefined, 'installed')} selected={screen === 'installed'}>Installed ({installedQ.length})</Button>
    <Button type="tab" onclick={setScreen.bind(undefined, 'catalog')} selected={screen === 'catalog'}>Catalog ({catalogQ.length})</Button>
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col min-w-full grow">
      <div class="flex flex-wrap items-center gap-1.5 px-5 pt-1 pb-2" role="toolbar" aria-label="Filter extensions">
        {#each ['all', ...EXTENSION_CATEGORIES] as c (c)}
          {@const n = categoryCount(c)}
          {#if categoryExists(c)}
            <button
              class="rounded-full px-2.5 py-0.5 text-sm border {n === 0 && category !== c ? 'opacity-50' : ''} {category === c
                ? 'bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-text)] border-transparent'
                : 'border-[var(--pd-content-divider)] text-[var(--pd-content-text)] hover:bg-[var(--pd-content-card-hover-bg)]'}"
              aria-pressed={category === c}
              title={n === 0 && query ? `No ${c === 'all' ? '' : `${c} `}extensions match “${query}”` : undefined}
              onclick={setCategory.bind(undefined, c)}>{c === 'all' ? 'All' : c} <span class="opacity-70 tabular-nums">{n}</span></button>
          {/if}
        {/each}
      </div>
      {#if screen === 'installed'}
        {#if installed.length === 0}
          <FilteredEmptyScreen icon={faPuzzlePiece} kind="extensions" searchTerm={searchTerm || (category !== 'all' ? category : status)} onResetFilter={resetFilter} />
        {/if}
        <div class="grow px-5 pb-3">
          {#each installedSections as sec (sec.category)}
            <h2 class="sticky top-0 z-1 bg-[var(--pd-content-bg)] pt-3 pb-1.5 text-[11px] font-semibold text-[var(--pd-nav-group-header)]">
              {sec.category} <span class="font-normal">({sec.items.length})</span>
            </h2>
            {#each sec.items as { ext: e, member } (e.id)}
              {@const enabled = registry.isEnabled(e.id)}
              {@const members = (e.packOf ?? []).filter(id => getExtension(id))}
              {@const deps = dependenciesOf(e.id).filter(d => !members.includes(d))}
              {@const dependents = dependentsOf(e.id).filter(d => registry.isEnabled(d))}
              {@const missing = enabled ? [] : missingDeps(e)}
              <div class="bg-[var(--pd-content-card-bg)] mb-2 rounded-md px-3 py-2 flex items-start gap-3 {member ? 'ml-8' : ''}" role="region" aria-label={e.id}>
                <AppIcon icon={e.icon} size="28px" class="mt-0.5 shrink-0 {enabled ? '' : 'opacity-50 grayscale'}" />
                <div class="grow min-w-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-semibold text-[var(--pd-card-header-text)] truncate">{e.displayName}</span>
                    <span class="text-sm text-[var(--pd-table-body-text)] truncate">{e.id} · v{e.version}</span>
                    {#if e.builtin}<Badge class="text-[8px] text-[var(--pd-badge-text)] shrink-0" color="bg-[var(--pd-badge-bundled-extension-bg)]" label="Bundled" />{/if}
                    {#if e.packOf}<Badge class="text-[8px] shrink-0" color="bg-[var(--pd-label-primary-bg)]" label="Extension pack · {members.length}" />{/if}
                    {#if member}<span class="text-xs text-[var(--pd-content-sub-header)] shrink-0">in pack</span>{/if}
                  </div>
                  <div class="text-[var(--pd-content-text)] line-clamp-1" title={e.description}>{e.description}</div>
                  <div class="flex flex-wrap items-center gap-1 mt-1" aria-label="Contributes">
                    {#each contributes(e) as c (c)}
                      <span class="rounded-sm px-1.5 text-xs bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{c}</span>
                    {/each}
                    {#each ui.inspect ? e.pApis : [] as p (p)}
                      <span class="rounded-sm px-1.5 text-xs bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]" title="Platform API item {p} (docs/integration-opportunities.md)">{p}</span>
                    {/each}
                  </div>
                  {#if deps.length || dependents.length || missing.length}
                    <div class="mt-1 text-sm text-[var(--pd-content-text)] flex flex-wrap gap-x-4">
                      {#if deps.length}<span>Requires <span class="text-[var(--pd-card-header-text)]">{names(deps)}</span></span>{/if}
                      {#if dependents.length}
                        <span title={names(dependents)}>Required by <span class="text-[var(--pd-card-header-text)]">{dependents.length > 3 ? plural(dependents.length, 'extension') : names(dependents)}</span> (disabled together)</span>
                      {/if}
                      {#if missing.length}<span class="text-[var(--pd-state-warning)]" role="note">Enabling also enables {names(missing)}</span>{/if}
                    </div>
                  {/if}
                </div>
                <div class="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                  <SlideToggle id="toggle-{e.id}" checked={enabled} onchange={toggle.bind(undefined, e)} aria-label="{enabled ? 'Disable' : 'Enable'} {e.displayName}" left>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </SlideToggle>
                  <!-- source only: bundled ones already carry the "Bundled" badge -->
                  {#if !e.builtin}
                    <span class="text-xs text-[var(--pd-table-body-text)]" title={suggestedFor(e)}>From catalog</span>
                  {/if}
                </div>
              </div>
            {/each}
          {/each}
        </div>
      {:else}
        {#if catalog.length === 0}
          <FilteredEmptyScreen icon={faPuzzlePiece} kind="extensions" searchTerm={searchTerm || 'catalog'} onResetFilter={resetFilter} />
        {/if}
        <div class="grow px-5 pb-3">
          {#each catalogSections as sec (sec.category)}
            <h2 class="pt-3 pb-1.5 text-[11px] font-semibold text-[var(--pd-nav-group-header)]">{sec.category} <span class="font-normal">({sec.items.length})</span></h2>
            <div class="grid grid-cols-3 gap-3 content-start">
              {#each sec.items as { ext: e } (e.id)}
                {@const missing = missingDeps(e)}
                <div class="flex flex-col gap-2 rounded-md p-3 bg-[var(--pd-content-card-bg)]" role="region" aria-label={e.id} title={suggestedFor(e)}>
                  <div class="flex items-center gap-2">
                    <AppIcon icon={e.icon} size="32px" />
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold text-[var(--pd-card-header-text)] truncate">{e.displayName}</span>
                      <span class="text-sm text-[var(--pd-content-sub-header)] truncate">{e.publisher}</span>
                    </div>
                  </div>
                  <p class="text-[var(--pd-content-text)] line-clamp-3 grow">{e.description}</p>
                  {#if e.packOf}<span class="text-sm text-[var(--pd-content-sub-header)]">Extension pack · {e.packOf.filter(id => getExtension(id)).length} extensions</span>{/if}
                  {#if missing.length}<span class="text-sm text-[var(--pd-state-warning)]" role="note">Also installs {names(missing)}</span>{/if}
                  <div class="flex items-center justify-end">
                    <Button onclick={install.bind(undefined, e)} icon={faCloudDownload}>Install</Button>
                  </div>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/snippet}
</NavPage>
