<script lang="ts">
/**
 * Extensions page – PD's ExtensionList / InstalledExtensionCard /
 * CatalogExtension, with enable/disable toggles, dependency info and a
 * "contributes" summary (provenance of every contribution point + P#).
 */
import { faCloudDownload, faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';
import { Button, FilteredEmptyScreen, NavPage, Tooltip } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import Badge from '#lib/components/Badge.svelte';
import SlideToggle from '#lib/components/SlideToggle.svelte';
import { ALL_EXTENSIONS, dependenciesOf, dependentsOf, getExtension, registry } from '#lib/ext/registry.svelte.ts';
import type { Contributions, MockExtension } from '#lib/ext/types.ts';
import { SCENARIOS } from '#lib/scenarios.ts';

let searchTerm = $state(page.url.searchParams.get('q') ?? '');
let screen = $state<'installed' | 'catalog'>(page.url.searchParams.get('tab') === 'catalog' ? 'catalog' : 'installed');

function matches(e: MockExtension): boolean {
  const t = searchTerm.toLowerCase();
  if (!t) return true;
  const kinds = Object.keys(e.contributes).join(' ').toLowerCase();
  return `${e.displayName} ${e.id} ${e.description} ${kinds} ${e.pApis.join(' ')}`.toLowerCase().includes(t) || (t.includes('checker') && !!e.contributes.imageCheckers);
}

const installed = $derived(registry.installed.filter(matches));
const catalog = $derived(registry.catalog.filter(matches));

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
      return n ? `${n} ${LABELS[k]}${n > 1 && !LABELS[k].endsWith('s') ? 's' : ''}` : '';
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
}

function scenarioNames(e: MockExtension): string {
  return e.tags.map(t => SCENARIOS.find(s => s.id === t)?.label ?? t).join(', ');
}
</script>

<NavPage bind:searchTerm={searchTerm} title="extensions">
  {#snippet additionalActions()}
    <Button icon={faCloudDownload} title="Install manually an extension" aria-label="Install custom" type="secondary">Install custom...</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}
    <div class="text-sm text-[var(--pd-content-text)]">
      {registry.extensions.length} enabled · {registry.installed.length} installed · {ALL_EXTENSIONS.length} known
    </div>
  {/snippet}
  {#snippet tabs()}
    <Button type="tab" onclick={setScreen.bind(undefined, 'installed')} selected={screen === 'installed'}>Installed</Button>
    <Button type="tab" onclick={setScreen.bind(undefined, 'catalog')} selected={screen === 'catalog'}>Catalog ({registry.catalog.length})</Button>
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if screen === 'installed'}
        {#if searchTerm && installed.length === 0}
          <FilteredEmptyScreen icon={faPuzzlePiece} kind="extensions" {searchTerm} onResetFilter={resetFilter} />
        {/if}
        <div class="grow px-5 py-3">
          {#each installed as e (e.id)}
            {@const enabled = registry.isEnabled(e.id)}
            {@const members = (e.packOf ?? []).filter(id => getExtension(id))}
            {@const deps = dependenciesOf(e.id).filter(d => !members.includes(d))}
            {@const dependents = dependentsOf(e.id).filter(d => registry.isEnabled(d))}
            <div class="bg-[var(--pd-content-card-bg)] mb-5 rounded-md p-3 divide-x divide-[var(--pd-content-divider)] flex" role="region" aria-label={e.id}>
              <!-- left col -->
              <div role="region" aria-label="Extension {e.displayName} left actions">
                <div class="relative min-w-[200px] max-w-[200px] pr-3">
                  <div class="flex flex-row items-center grow">
                    <div><AppIcon icon={e.icon} size="32px" class={enabled ? '' : 'opacity-50 grayscale'} /></div>
                    <div class="flex flex-col ml-2">
                      <span class="my-auto text-[color:var(--pd-card-header-text)] break-words">{e.displayName}</span>
                      <div class="flex flex-row">
                        <div class="my-auto w-3 h-3 rounded-full {enabled ? 'bg-[var(--pd-status-running)]' : 'bg-[var(--pd-status-stopped)]'}"></div>
                        <span aria-label="Extension Status Label" class="my-auto ml-1 font-bold text-[9px] {enabled ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-status-stopped)]'}">{enabled ? 'ACTIVE' : 'DISABLED'}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-row gap-1 items-center mt-4" aria-label="Extension Badge">
                    {#if e.builtin}
                      <Tooltip right tip="Bundled extension">
                        <Badge class="text-[8px] text-[var(--pd-badge-text)]" color="bg-[var(--pd-badge-bundled-extension-bg)]" label="Bundled extension" />
                      </Tooltip>
                    {/if}
                    {#if e.packOf}
                      <Badge class="text-[8px]" color="bg-[var(--pd-label-primary-bg)]" label="Extension pack" />
                    {/if}
                    {#if e.publisher === 'redhat'}
                      <Badge class="text-[8px]" color="bg-[var(--pd-badge-fuschia)]" label="Red Hat" />
                    {/if}
                  </div>
                  <div class="mt-4">
                    <SlideToggle id="toggle-{e.id}" checked={enabled} onchange={toggle.bind(undefined, e)} aria-label="{enabled ? 'Disable' : 'Enable'} {e.displayName}">
                      {enabled ? 'Enabled' : 'Disabled'}
                    </SlideToggle>
                  </div>
                </div>
              </div>
              <!-- right col -->
              <div class="grow flex flex-wrap ml-2" role="region">
                <div class="relative px-5 py-2 w-full min-h-[110px]" role="region" aria-label="Extension {e.displayName} right actions">
                  <span class="font-bold ml-0 text-[var(--pd-card-header-text)]">{e.displayName}</span>
                  <span class="ml-2 text-sm text-[var(--pd-content-sub-header)]">{e.id}</span>
                  <div class="flex text-[var(--pd-content-text)]">{e.description}</div>
                  <div class="flex flex-wrap gap-1 mt-2" aria-label="Contributes">
                    {#each contributes(e) as c (c)}
                      <span class="rounded-sm px-1.5 py-0.5 text-xs bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{c}</span>
                    {/each}
                    {#each e.pApis as p (p)}
                      <span class="rounded-sm px-1.5 py-0.5 text-xs bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]" title="Platform API item {p} (docs/integration-opportunities.md)">{p}</span>
                    {/each}
                  </div>
                  {#if members.length}
                    <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--pd-content-text)]" aria-label="Pack members">
                      <span>Includes {members.length} extensions:</span>
                      {#each members as m (m)}
                        {@const me = getExtension(m)}
                        <span class="flex items-center gap-1 rounded-sm px-1.5 py-0.5 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]" class:opacity-60={!registry.isEnabled(m)}>
                          <AppIcon icon={me?.icon} size="12px" />{me?.displayName ?? m}
                        </span>
                      {/each}
                    </div>
                  {/if}
                  {#if deps.length || dependents.length}
                    <div class="mt-2 text-sm text-[var(--pd-content-text)] space-y-0.5">
                      {#if deps.length}<div>Requires: <span class="text-[var(--pd-card-header-text)]">{names(deps)}</span></div>{/if}
                      {#if dependents.length}<div>Required by: <span class="text-[var(--pd-card-header-text)]">{names(dependents)}</span> (disabled together)</div>{/if}
                    </div>
                  {/if}
                  <div class="mt-2 flex gap-4 text-[var(--pd-content-text)] text-sm">
                    <span>{e.builtin ? 'Pre-installed' : `Scenarios: ${scenarioNames(e)}`}</span>
                    <span aria-label="Version">v{e.version}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        {#if catalog.length === 0}
          <FilteredEmptyScreen icon={faPuzzlePiece} kind="extensions" searchTerm={searchTerm || 'catalog'} onResetFilter={resetFilter} />
        {/if}
        <div class="grow px-5 py-3 grid grid-cols-3 gap-3 content-start">
          {#each catalog as e (e.id)}
            <div class="flex flex-col gap-2 rounded-md p-3 bg-[var(--pd-content-card-bg)]" role="region" aria-label={e.id}>
              <div class="flex items-center gap-2">
                <AppIcon icon={e.icon} size="32px" />
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-[var(--pd-card-header-text)] truncate">{e.displayName}</span>
                  <span class="text-sm text-[var(--pd-content-sub-header)] truncate">{e.publisher}</span>
                </div>
              </div>
              <p class="text-[var(--pd-content-text)] line-clamp-3 grow">{e.description}</p>
              {#if e.packOf}<span class="text-sm text-[var(--pd-content-sub-header)]">Extension pack · {e.packOf.filter(id => getExtension(id)).length} extensions</span>{/if}
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--pd-content-sub-header)]">{scenarioNames(e)}</span>
                <Button onclick={install.bind(undefined, e)} icon={faCloudDownload}>Install</Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/snippet}
</NavPage>
