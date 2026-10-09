<script lang="ts">
/**
 * P3 Browser-style: rail + secondary nav as v1, but every navigation opens
 * (or focuses) a tab, lists included. Tabs are grouped and coloured by
 * connection; an address row shows back/forward and the breadcrumb.
 */
import { faArrowLeft, faArrowRight, faPlus, faRotateRight, faStar } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, FEW_TABS, type LabTarget, MANY_TABS, PANEL_SESSIONS } from '../data.ts';
import { describe, lab, Workbench } from '../lab.svelte.ts';
import AppFrame from '../ui/AppFrame.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import Rail from '../ui/Rail.svelte';
import SecondaryNav from '../ui/SecondaryNav.svelte';
import TabStrip from '../ui/TabStrip.svelte';
import { BOTTOM_ITEMS, providerRailItems } from './shared.ts';

const wb = new Workbench();
let railSel = $state('podman-machine-default');
const LIST: LabTarget = { kind: 'list', connId: 'podman-machine-default', sectionId: 'containers' };
$effect.pre(() => {
  wb.reset(lab.tabs === 'many' ? [LIST, { kind: 'list', connId: 'ocp-dev', sectionId: 'kpods' }, ...MANY_TABS] : [LIST, ...FEW_TABS]);
});

// the rail and secondary nav follow the active tab (like an address bar)
$effect(() => {
  const t = wb.activeTarget;
  if (t?.connId) railSel = t.connId;
});

const selConn = $derived(findConn(railSel));
const items = providerRailItems();
const info = $derived(wb.activeTarget ? describe(wb.activeTarget) : undefined);

function onrail(id: string): void {
  const c = findConn(id);
  if (c) {
    railSel = id;
    open({ kind: 'list', connId: c.id, sectionId: c.sections[0].id });
    return;
  }
  railSel = id;
  if (id.startsWith('tool:')) open({ kind: 'tool', toolId: id.slice(5) });
  else open({ kind: id as LabTarget['kind'] });
}

function open(t: LabTarget): void {
  wb.open(t);
}
</script>

<AppFrame>
  <Rail mode={lab.rail} selected={railSel} onselect={onrail} {items} bottom={BOTTOM_ITEMS} label="Connections and tools" />
  {#if selConn}
    <SecondaryNav
      c={selConn}
      selected={wb.activeTarget?.connId === selConn.id ? wb.activeTarget.sectionId : undefined}
      onselect={(sid): void => open(sid ? { kind: 'list', connId: selConn.id, sectionId: sid } : { kind: 'connection', connId: selConn.id })} />
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} groupByConn>
      {#snippet actions()}
        <button type="button" aria-label="New tab" title="New tab" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)] text-[var(--pd-tab-text)]" onclick={(): void => open({ kind: 'dashboard' })}><AppIcon icon={faPlus} /></button>
      {/snippet}
    </TabStrip>
    <div class="flex items-center gap-2 h-9 px-2 shrink-0 border-b border-[var(--pd-content-divider)] bg-[var(--pd-content-bg)] text-[var(--pd-tab-text)]">
      {#each [faArrowLeft, faArrowRight, faRotateRight] as ic, i (i)}
        <button type="button" aria-label={['Back', 'Forward', 'Reload'][i]} class="w-7 h-7 rounded hover:bg-[var(--pd-content-card-hover-bg)]" class:opacity-40={i === 1}><AppIcon icon={ic} size="sm" /></button>
      {/each}
      <div class="flex items-center gap-2 flex-1 min-w-0 h-7 px-3 rounded-full bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] text-base">
        {#if info?.connId}<ConnIcon connId={info.connId} size={14} ring="var(--pd-input-field-bg)" />{/if}
        <span class="truncate text-[var(--pd-content-text)]">{[findConn(info?.connId)?.name, ...(info?.crumb.slice(1) ?? []), info?.title].filter(Boolean).join('  ›  ')}</span>
        <span class="flex-1"></span>
        <AppIcon icon={faStar} size="xs" />
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active}<Content target={wb.activeTarget} onopen={open} />{/key}
    </div>
    <BottomPanel sessions={PANEL_SESSIONS} />
  </div>
</AppFrame>
