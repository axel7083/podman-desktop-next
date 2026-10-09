<script lang="ts">
/**
 * P10 Status-bar context (VS Code remote indicator, TablePlus): the leftmost
 * status item is the active context `[● kind-dev · ns default ▾]`; it opens
 * the connection picker upwards and tints the status bar with the
 * connection's colour. Title bar, kinds nav and tabs stay as today; the dock
 * sits above the status bar.
 */
import { faChevronUp, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabTarget, PANEL_SESSIONS } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import ConnPicker from '../r2/ConnPicker.svelte';
import { CTX_LABEL, ctxColor, defaultKind } from '../r2/ctx.ts';
import Dashboard from '../r2/Dashboard.svelte';
import Frame from '../r2/Frame.svelte';
import KindsNav from '../r2/KindsNav.svelte';
import { listToKind, navEntries, navIdOf, navTarget } from '../r2/nav.ts';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
// svelte-ignore state_referenced_locally
let ctx = $state<string | undefined>(lab.ctx ?? 'kind-dev');
// svelte-ignore state_referenced_locally
let pickerOpen = $state(lab.openKey);
wb.home = { kind: 'kind', kindId: defaultKind(findConn(lab.ctx ?? 'kind-dev')) };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const scope = $derived(ctx ? [ctx] : undefined);
const homeId = $derived(navIdOf(wb.home));
const expandKube = $derived(wb.home?.kind === 'kind' && wb.home.kindId === 'kubernetes');
const entries = $derived(navEntries(scope, { expandKube, contributed: true }));
const c = $derived(findConn(ctx));
/** P10 always colours the status bar; overlay H adds the title-bar tint. */
const statusTint = $derived(ctx ? (ctxColor(ctx) ?? '#6b7280') : undefined);
const tint = $derived(lab.color && ctx ? ctxColor(ctx) : undefined);
const ns = $derived(c?.group === 'Kubernetes' ? (ctx === 'ocp-dev' ? 'checkout' : 'default') : undefined);

function onnav(id: string): void {
  const t = navTarget(id);
  if (!t) return;
  if (t.kind === 'tool' || t.kind === 'settings' || t.kind === 'accounts' || t.kind === 'extensions') wb.open(t);
  else wb.goHome(t);
}

function setCtx(ids: string[]): void {
  ctx = ids[0];
  const keep = !ctx || navEntries([ctx], { expandKube: true, contributed: true }).some(e => e.id === homeId);
  if (!keep || wb.home?.kind !== 'kind') wb.goHome({ kind: 'kind', kindId: defaultKind(findConn(ctx)) });
  else wb.active = HOME;
}

function jump(connId: string, kindId: string): void {
  ctx = connId;
  wb.goHome({ kind: 'kind', kindId, sectionId: kindId === 'kubernetes' ? 'deployments' : undefined });
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' && t.connId) {
    ctx = t.connId;
    wb.goHome(listToKind(t.sectionId));
    return;
  }
  if (t.kind === 'connection' && t.connId) {
    jump(t.connId, defaultKind(findConn(t.connId)));
    return;
  }
  wb.open(t, opts);
}
</script>

{#snippet status()}
  <div class="relative h-full">
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={pickerOpen}
      class="flex items-center gap-1.5 h-full pl-2 pr-2.5 font-medium text-white hover:brightness-110"
      style:background={statusTint ?? 'var(--pd-statusbar-hover-bg)'}
      title="Active context (click to switch)"
      onclick={(): void => { pickerOpen = !pickerOpen; }}>
      {#if c}
        <span class="rounded-sm bg-white/90 p-px flex"><ConnIcon connId={c.id} size={13} dot={false} /></span>
        <span class="w-1.5 h-1.5 rounded-full {c.status === 'running' ? 'bg-[var(--pd-status-running)]' : 'bg-[var(--pd-status-stopped)]'}"></span>
        <span>{c.name}</span>
        {#if ns}<span class="opacity-80">· ns {ns}</span>{/if}
        {#if CTX_LABEL[c.id]}<span class="px-1 rounded bg-black/30 text-[9px] font-bold">{CTX_LABEL[c.id]}</span>{/if}
      {:else}
        <AppIcon icon={faLayerGroup} size="xs" /><span>All connections</span>
      {/if}
      <AppIcon icon={faChevronUp} size="xs" />
    </button>
    {#if pickerOpen}
      <div class="text-[var(--pd-dropdown-item-text)]" style="font-size: 13px">
        <ConnPicker selected={ctx ? [ctx] : []} allowAll onchange={setCtx} onkind={jump} onclose={(): void => { pickerOpen = false; }} class="left-0 bottom-full mb-1" />
      </div>
    {/if}
  </div>
{/snippet}

<Frame statusLeft={status} {statusTint} {tint}>
  <KindsNav {entries} selected={wb.active === HOME ? homeId : navIdOf(wb.activeTarget)} collapsed={lab.rail === 'icons'} onselect={onnav} label="Resource kinds" />
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === HOME ? JSON.stringify(wb.home) + ctx : wb.active}
        {#if wb.active === HOME && wb.home?.kind === 'dashboard'}
          <Dashboard selected={ctx ? [ctx] : []} hint="Click a card to make it the active context." onpick={(id, k): void => jump(id, k ?? defaultKind(findConn(id)))} />
        {:else}
          <Content target={wb.activeTarget} onopen={open} scope={scope ?? []} />
        {/if}
      {/key}
    </div>
    <BottomPanel sessions={ctx ? [...PANEL_SESSIONS.filter(s => s.connId === ctx), ...PANEL_SESSIONS.filter(s => s.connId !== ctx)] : PANEL_SESSIONS} {tint} />
  </div>
</Frame>
