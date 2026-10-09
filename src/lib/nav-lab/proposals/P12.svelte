<script lang="ts">
/**
 * P12 Switcher at the top of the nav bar (shadcn/ui sidebar team switcher,
 * docs version switcher): the first element of today's PD kinds nav is the
 * connection switcher (icon tile + name + subtitle + chevrons). The dropdown
 * is anchored under it, same width as the nav. Everything below is scoped to
 * the selected connection. Collapsed nav: the icon tile only.
 */
import { faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabTarget, PANEL_SESSIONS } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import ConnPicker from '../r2/ConnPicker.svelte';
import { CTX_LABEL, ctxColor, defaultKind, ENGINES, scopeLabel } from '../r2/ctx.ts';
import Dashboard from '../r2/Dashboard.svelte';
import ExtPages from '../r2/ExtPages.svelte';
import Frame from '../r2/Frame.svelte';
import KindsNav from '../r2/KindsNav.svelte';
import { favEntries, listToKind, navEntries, navIdOf, navTarget, tintFor } from '../r2/nav.ts';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
// svelte-ignore state_referenced_locally
let scope = $state<string[]>(lab.ctx ? [lab.ctx] : ['podman-machine-default']);
// svelte-ignore state_referenced_locally
let pickerOpen = $state(lab.openKey);
let favs = $state<string[]>(['ai-lab', 'mta']);
wb.home = { kind: 'kind', kindId: lab.ctx ? defaultKind(findConn(lab.ctx)) : 'containers' };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const homeId = $derived(navIdOf(wb.home));
const expandKube = $derived(wb.home?.kind === 'kind' && wb.home.kindId === 'kubernetes');
const entries = $derived(navEntries(scope, { expandKube, contributed: true }));
const tint = $derived(tintFor(scope));

function go(t: LabTarget): void {
  wb.goHome(t);
}

function onnav(id: string): void {
  const t = navTarget(id);
  if (!t) return;
  if (t.kind === 'tool' || t.kind === 'settings' || t.kind === 'accounts') wb.open(t);
  else go(t);
}

function setScope(ids: string[]): void {
  scope = ids;
  // keep the current kind if still provided, else land on the first available
  const still = navEntries(ids, {}).some(e => e.id === homeId || (homeId?.startsWith('s:') && wb.home?.kindId === 'kubernetes'));
  if (wb.home?.kind === 'kind' && !still) go({ kind: 'kind', kindId: defaultKind(findConn(ids[0])) });
}

function jump(connId: string, kindId: string): void {
  scope = [connId];
  go({ kind: 'kind', kindId, sectionId: kindId === 'kubernetes' ? 'deployments' : undefined });
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' && t.connId) {
    scope = [t.connId];
    go(listToKind(t.sectionId));
    return;
  }
  if (t.kind === 'connection' && t.connId) {
    jump(t.connId, defaultKind(findConn(t.connId)));
    return;
  }
  wb.open(t, opts);
}

const single = $derived(scope.length === 1 ? findConn(scope[0]) : undefined);
</script>

{#snippet switcher()}
  <div class="relative px-2 pt-2 pb-1 bg-[var(--pd-global-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)] {lab.rail === 'icons' ? 'w-12 px-1.5' : 'w-[200px]'}">
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={pickerOpen}
      title={single ? single.name : scopeLabel(scope)}
      class="w-full flex items-center gap-2 p-1.5 rounded-lg text-left hover:bg-[var(--pd-global-nav-icon-selected-bg)] {pickerOpen ? 'bg-[var(--pd-global-nav-icon-selected-bg)]' : ''}"
      onclick={(): void => { pickerOpen = !pickerOpen; }}>
      <span class="w-8 h-8 shrink-0 rounded-md flex items-center justify-center bg-[var(--pd-content-card-bg)] border border-[var(--pd-global-nav-bg-border)]">
        {#if single}<ConnIcon connId={single.id} size={18} />{:else}<ConnIcon connId={scope[0]} size={18} dot={false} />{/if}
      </span>
      {#if lab.rail !== 'icons'}
        <span class="flex-1 min-w-0 leading-tight">
          <span class="block font-semibold truncate text-[var(--pd-global-nav-icon-selected)]">{single ? single.name : 'All connections'}</span>
          <span class="block text-xs opacity-60 truncate">{single ? `${single.product} · ${single.status}` : `${scope.length} connections`}</span>
        </span>
        <span class="flex flex-col text-[8px] opacity-60 leading-none"><AppIcon icon={faChevronUp} /><AppIcon icon={faChevronDown} /></span>
      {/if}
    </button>
    {#if pickerOpen}
      <ConnPicker allowAll selected={scope} onchange={setScope} onkind={jump} onclose={(): void => { pickerOpen = false; }} class="left-2 top-full mt-0.5 {lab.rail === 'icons' ? 'w-72' : 'w-[184px] min-w-72'}" />
    {/if}
  </div>
{/snippet}

<Frame {tint}>
  <div class="flex flex-col h-full shrink-0">
  {@render switcher()}
  <div class="flex-1 min-h-0"><KindsNav {entries} favourites={favEntries(favs)} selected={wb.active === HOME ? homeId : navIdOf(wb.activeTarget)} collapsed={lab.rail === 'icons'} onselect={onnav} label="Resource kinds" /></div>
  </div>
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === HOME ? JSON.stringify(wb.home) + scope.join() : wb.active}
        {#if wb.active === HOME && wb.home?.kind === 'dashboard'}
          <Dashboard selected={scope} hint="Click a card to scope to it." onpick={(id, k): void => jump(id, k ?? defaultKind(findConn(id)))} />
        {:else if wb.active === HOME && wb.home?.kind === 'extensions'}
          <ExtPages {favs} ontoggle={(id): void => { favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]; }} onopen={(id): void => wb.open({ kind: 'tool', toolId: id })} />
        {:else}
          <Content target={wb.activeTarget} onopen={open} {scope} />
        {/if}
      {/key}
    </div>
    <BottomPanel sessions={single ? PANEL_SESSIONS.filter(s => s.connId === single.id).concat(PANEL_SESSIONS.filter(s => s.connId !== single.id)) : PANEL_SESSIONS} {tint} />
  </div>
</Frame>
