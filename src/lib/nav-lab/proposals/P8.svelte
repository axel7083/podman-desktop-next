<script lang="ts">
/**
 * P8 Aggregated by default + connection facets (Aptakube, Headlamp
 * multi-cluster, Azure "All resources"): every kind page lists all local
 * connections plus opted-in remote clusters, with a facet chip bar (counts)
 * and a Connection column. Dashboard = per-connection health cards; clicking a
 * card applies its facet.
 */
import { faCheck, faChevronDown, faCloud } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { CONNECTIONS, conn as findConn, type LabTarget, PANEL_SESSIONS } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import ConnPicker from '../r2/ConnPicker.svelte';
import { ctxColor, defaultKind, REMOTE, rowsFor } from '../r2/ctx.ts';
import Dashboard from '../r2/Dashboard.svelte';
import Frame from '../r2/Frame.svelte';
import KindsNav from '../r2/KindsNav.svelte';
import { listToKind, navEntries, navIdOf, navTarget, tintFor } from '../r2/nav.ts';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
// svelte-ignore state_referenced_locally
let facets = $state<string[]>(lab.ctx ? [lab.ctx] : []);
let remotesOn = $state<string[]>(['ocp-dev', 'ocp-prod']);
// svelte-ignore state_referenced_locally
let moreOpen = $state(lab.openKey);
let remoteOpen = $state(false);
wb.home = { kind: 'kind', kindId: lab.ctx ? defaultKind(findConn(lab.ctx)) : 'containers' };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const base = $derived(CONNECTIONS.filter(c => !REMOTE.includes(c.id) || remotesOn.includes(c.id)).map(c => c.id));
const scope = $derived(facets.length ? facets : base);
const homeId = $derived(navIdOf(wb.home));
const expandKube = $derived(wb.home?.kind === 'kind' && wb.home.kindId === 'kubernetes');
const entries = $derived(navEntries(base, { expandKube }));
const tint = $derived(tintFor(facets));

/** Facet chips for the current kind: connections with rows, by count. */
const chips = $derived.by(() => {
  const h = wb.home;
  if (h?.kind !== 'kind') return [];
  const counts = new Map<string, number>();
  for (const r of rowsFor(h.kindId ?? 'x', h.sectionId, base)) counts.set(r.connId, (counts.get(r.connId) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
});
const total = $derived(chips.reduce((a, [, n]) => a + n, 0));
const remoteOff = $derived(REMOTE.filter(id => !remotesOn.includes(id) && findConn(id)?.group === 'Kubernetes'));
const VISIBLE = $derived(lab.screen === 1280 ? 4 : 6);

function onnav(id: string): void {
  const t = navTarget(id);
  if (!t) return;
  if (t.kind === 'tool' || t.kind === 'settings' || t.kind === 'accounts' || t.kind === 'extensions') wb.open(t);
  else wb.goHome(t);
}

function facet(connId: string, kindId?: string): void {
  if (REMOTE.includes(connId) && !remotesOn.includes(connId)) remotesOn = [...remotesOn, connId];
  facets = [connId];
  const k = kindId ?? defaultKind(findConn(connId));
  wb.goHome({ kind: 'kind', kindId: k, sectionId: k === 'kubernetes' ? 'deployments' : undefined });
}

function toggle(id: string): void {
  facets = facets.includes(id) ? facets.filter(x => x !== id) : [...facets, id];
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' && t.connId) {
    facets = [t.connId];
    wb.goHome(listToKind(t.sectionId));
    return;
  }
  if (t.kind === 'connection' && t.connId) {
    facet(t.connId);
    return;
  }
  wb.open(t, opts);
}
</script>

{#snippet chip(id: string | undefined, label: string, count: number)}
  {@const on = id ? facets.includes(id) : facets.length === 0}
  {@const col = id && lab.color ? ctxColor(id) : undefined}
  <button
    type="button"
    aria-pressed={on}
    class="flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-full border text-sm whitespace-nowrap {on ? 'border-[var(--pd-tab-highlight)] bg-[var(--pd-content-card-selected-bg)] text-[var(--pd-tab-text-highlight)]' : 'border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)]'}"
    style:box-shadow={col ? `inset 3px 0 0 ${col}` : undefined}
    onclick={(): void => {
      if (id) toggle(id);
      else facets = [];
    }}>
    {#if id}<ConnIcon connId={id} size={14} ring="var(--pd-content-bg)" />{:else if on}<AppIcon icon={faCheck} size="xs" />{/if}
    {label}<span class="opacity-60 tabular-nums">{count}</span>
  </button>
{/snippet}

{#snippet facetBar()}
  <div class="flex items-center gap-1.5 flex-wrap">
    {@render chip(undefined, 'All', total)}
    {#each chips.slice(0, VISIBLE) as [id, n] (id)}{@render chip(id, findConn(id)?.name ?? id, n)}{/each}
    {#if chips.length > VISIBLE}
      <div class="relative">
        <button type="button" class="flex items-center gap-1 h-7 px-2.5 rounded-full border border-[var(--pd-content-divider)] text-sm hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => { moreOpen = !moreOpen; }}>
          +{chips.length - VISIBLE} more <AppIcon icon={faChevronDown} size="xs" />
        </button>
        {#if moreOpen}
          <ConnPicker multi selected={facets} onchange={(ids): void => { facets = ids; }} onkind={facet} onclose={(): void => { moreOpen = false; }} class="left-0 top-full mt-1" />
        {/if}
      </div>
    {/if}
    {#if remoteOff.length}
      <div class="relative">
        <button type="button" class="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-dashed border-[var(--pd-content-divider)] text-sm text-[var(--pd-content-sub-header)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => { remoteOpen = !remoteOpen; }}>
          <AppIcon icon={faCloud} size="xs" />{remoteOff.length} remote clusters not aggregated
        </button>
        {#if remoteOpen}
          <div class="absolute left-0 top-full mt-1 w-72 rounded-lg border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-2xl py-1 z-50">
            <div class="px-3 py-1 text-xs text-[var(--pd-nav-group-header)]">Remote clusters are opt-in (cost, latency, credentials)</div>
            {#each REMOTE.filter(id => findConn(id)?.group === 'Kubernetes') as id (id)}
              {@const on = remotesOn.includes(id)}
              <button type="button" class="w-full flex items-center gap-2 h-8 px-3 text-left hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => { remotesOn = on ? remotesOn.filter(x => x !== id) : [...remotesOn, id]; }}>
                <input type="checkbox" checked={on} tabindex="-1" /><ConnIcon connId={id} size={14} ring="var(--pd-dropdown-bg)" />{findConn(id)?.name}<span class="flex-1"></span><span class="text-xs opacity-60">{findConn(id)?.status}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<Frame {tint}>
  <KindsNav {entries} selected={wb.active === HOME ? homeId : navIdOf(wb.activeTarget)} collapsed={lab.rail === 'icons'} onselect={onnav} label="Resource kinds" />
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === HOME ? JSON.stringify(wb.home) + base.join() : wb.active}
        {#if wb.active === HOME && wb.home?.kind === 'dashboard'}
          <Dashboard selected={facets} hint="Click a card to filter every list to it; click a count to jump." onpick={(id, k): void => facet(id, k)} />
        {:else}
          <Content target={wb.activeTarget} onopen={open} {scope} scopeBar={wb.active === HOME ? facetBar : undefined} />
        {/if}
      {/key}
    </div>
    <BottomPanel sessions={PANEL_SESSIONS} {tint} />
  </div>
</Frame>
