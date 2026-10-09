<script lang="ts">
/**
 * P6 Scope chip in the title bar (JetBrains project/branch widgets, AWS
 * region selector): `[● All engines ▾]` searchable multi-select. The left nav
 * is today's PD kinds nav filtered by the scope (extension sections appear
 * only when a scoped connection provides them); lists get a Connection column
 * when more than one connection is in scope; ★ pins extension pages.
 */
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
let scope = $state<string[]>(lab.ctx ? [lab.ctx] : [...ENGINES]);
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

{#snippet chip()}
  <div class="relative">
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={pickerOpen}
      class="flex items-center gap-2 h-7 pl-1.5 pr-2 rounded-md border text-base font-medium hover:bg-[var(--pd-content-card-hover-bg)] {pickerOpen ? 'border-[var(--pd-tab-highlight)] bg-[var(--pd-content-card-hover-bg)]' : 'border-[var(--pd-input-field-stroke)]'}"
      onclick={(): void => { pickerOpen = !pickerOpen; }}>
      {#if single}
        {#if lab.color && ctxColor(single.id)}<span class="w-2 h-2 rounded-full" style:background={ctxColor(single.id)}></span>{/if}
        <ConnIcon connId={single.id} size={16} ring="var(--pd-titlebar-bg)" />
        <span class="max-w-48 truncate">{single.name}</span>
        {#if CTX_LABEL[single.id]}<span class="px-1 rounded text-[9px] font-bold text-white bg-[var(--pd-status-dead)]">{CTX_LABEL[single.id]}</span>{/if}
      {:else}
        <span class="flex -space-x-1.5">
          {#each scope.slice(0, 3) as id (id)}<span class="rounded-full bg-[var(--pd-titlebar-bg)] p-px flex"><ConnIcon connId={id} size={15} dot={false} /></span>{/each}
        </span>
        <span class="max-w-48 truncate">{scopeLabel(scope)}</span>
        <span class="px-1.5 rounded-full text-xs bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{scope.length}</span>
      {/if}
      <AppIcon icon={faChevronDown} size="xs" />
    </button>
    {#if pickerOpen}
      <ConnPicker multi selected={scope} onchange={setScope} onkind={jump} onclose={(): void => { pickerOpen = false; }} class="left-0 top-full mt-1" />
    {/if}
  </div>
{/snippet}

<Frame titleLeft={chip} {tint}>
  <KindsNav {entries} favourites={favEntries(favs)} selected={wb.active === HOME ? homeId : navIdOf(wb.activeTarget)} collapsed={lab.rail === 'icons'} onselect={onnav} label="Resource kinds" />
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
