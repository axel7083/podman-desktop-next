<script lang="ts">
/**
 * P2 Hybrid: provider rail (connections grouped Engines / Kubernetes /
 * VMs & services / Tools), v1 secondary nav for the selected connection, a
 * non-closable home tab for the current list and tabs for opened items.
 */
import { conn as findConn, type LabTarget, PANEL_SESSIONS } from '../data.ts';
import { lab, Workbench } from '../lab.svelte.ts';
import AppFrame from '../ui/AppFrame.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import Content from '../ui/Content.svelte';
import Rail from '../ui/Rail.svelte';
import SecondaryNav from '../ui/SecondaryNav.svelte';
import TabStrip from '../ui/TabStrip.svelte';
import { BOTTOM_ITEMS, providerRailItems } from './shared.ts';

const wb = new Workbench();
let railSel = $state('podman-machine-default');
wb.home = { kind: 'list', connId: 'podman-machine-default', sectionId: 'containers' };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const selConn = $derived(findConn(railSel));
const items = providerRailItems();

function onrail(id: string): void {
  const c = findConn(id);
  if (c) {
    railSel = id;
    const first = c.sections[0];
    wb.goHome(c.group === 'VMs & services' && first.id === 'overview' ? { kind: 'connection', connId: c.id } : { kind: 'list', connId: c.id, sectionId: first.id });
    return;
  }
  if (id.startsWith('tool:')) {
    railSel = id;
    wb.open({ kind: 'tool', toolId: id.slice(5) });
    return;
  }
  if (id === 'dashboard' || id === 'tools') {
    railSel = id;
    wb.goHome({ kind: id });
    return;
  }
  wb.open({ kind: id as LabTarget['kind'] });
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' || t.kind === 'connection') {
    if (t.connId) railSel = t.connId;
    wb.goHome(t);
    return;
  }
  wb.open(t, opts);
}
</script>

<AppFrame>
  <Rail mode={lab.rail} selected={railSel} onselect={onrail} {items} bottom={BOTTOM_ITEMS} label="Connections and tools" />
  {#if selConn}
    <SecondaryNav
      c={selConn}
      selected={wb.home?.connId === selConn.id ? wb.home.sectionId : undefined}
      onselect={(sid): void => wb.goHome(sid ? { kind: 'list', connId: selConn.id, sectionId: sid } : { kind: 'connection', connId: selConn.id })} />
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === '__home__' ? JSON.stringify(wb.home) : wb.active}<Content target={wb.activeTarget} onopen={open} />{/key}
    </div>
    <BottomPanel sessions={PANEL_SESSIONS} />
  </div>
</AppFrame>
