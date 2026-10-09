<script lang="ts">
/**
 * P7 Breadcrumb header (JetBrains navigation bar, Azure portal): the content
 * header is `[icon] connection ▾ › Kind ▾ › resource ▾`, every segment a
 * searchable dropdown. Left = today's kinds nav (collapsible to icons) for the
 * breadcrumb's connection; tabs are titled by the breadcrumb leaf.
 */
import { faChevronDown, faChevronRight, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabTarget, PANEL_SESSIONS, resource } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import ConnPicker from '../r2/ConnPicker.svelte';
import { CTX_LABEL, ctxColor, defaultKind, KUBE_CORE, pdKind, rowsFor, sectionMeta } from '../r2/ctx.ts';
import Dashboard from '../r2/Dashboard.svelte';
import Frame from '../r2/Frame.svelte';
import KindsNav from '../r2/KindsNav.svelte';
import { listToKind, navEntries, navIdOf, navTarget, tintFor } from '../r2/nav.ts';
import SearchMenu, { type MenuItem } from '../r2/SearchMenu.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
/** Breadcrumb connection (undefined = All connections). */
// svelte-ignore state_referenced_locally
let bcConn = $state<string | undefined>(lab.ctx ?? 'podman-machine-default');
// svelte-ignore state_referenced_locally
let menu = $state<'conn' | 'kind' | 'res' | undefined>(lab.openKey ? 'conn' : undefined);
wb.home = { kind: 'kind', kindId: defaultKind(findConn(lab.ctx ?? 'podman-machine-default')) };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const scope = $derived(bcConn ? [bcConn] : undefined);
const active = $derived(wb.activeTarget);
/** Breadcrumb follows the active tab: a resource tab shows its own connection. */
const crumbConn = $derived(active?.kind === 'resource' ? active.connId : bcConn);
const crumbKind = $derived.by((): LabTarget | undefined => {
  if (active?.kind === 'resource') return listToKind(active.sectionId);
  if (active?.kind === 'kind') return active;
  return undefined;
});
const homeId = $derived(navIdOf(wb.home));
const expandKube = $derived(wb.home?.kind === 'kind' && wb.home.kindId === 'kubernetes');
const entries = $derived(navEntries(scope, { expandKube, contributed: true }));
const tint = $derived(tintFor(crumbConn ? [crumbConn] : undefined));

function onnav(id: string): void {
  const t = navTarget(id);
  if (!t) return;
  if (t.kind === 'tool' || t.kind === 'settings' || t.kind === 'accounts' || t.kind === 'extensions') wb.open(t);
  else wb.goHome(t);
}

function pickConn(ids: string[]): void {
  bcConn = ids[0];
  const k = crumbKind;
  const c = findConn(bcConn);
  const keep = k && (!c || navEntries([c.id], { expandKube: true, contributed: true }).some(e => e.id === navIdOf(k)));
  wb.goHome(keep && k ? { kind: 'kind', kindId: k.kindId, sectionId: k.sectionId } : { kind: 'kind', kindId: defaultKind(c) });
}

function jump(connId: string, kindId: string): void {
  bcConn = connId;
  wb.goHome({ kind: 'kind', kindId, sectionId: kindId === 'kubernetes' ? 'deployments' : undefined });
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' && t.connId) {
    bcConn = t.connId;
    wb.goHome(listToKind(t.sectionId));
    return;
  }
  if (t.kind === 'connection' && t.connId) {
    jump(t.connId, defaultKind(findConn(t.connId)));
    return;
  }
  wb.open(t, opts);
}

const kindItems = $derived.by((): MenuItem[] => {
  const ids = crumbConn ? [crumbConn] : undefined;
  const out: MenuItem[] = [];
  for (const e of navEntries(ids, { expandKube: true, contributed: true })) {
    out.push({ id: e.id, label: e.label, icon: e.icon, count: e.count, ext: typeof e.ext === 'string' ? e.ext : undefined, indent: e.child });
  }
  return out;
});

const resItems = $derived.by((): MenuItem[] => {
  const k = crumbKind;
  if (!k) return [];
  const ids = crumbConn ? [crumbConn] : undefined;
  return rowsFor(k.kindId ?? 'x', k.sectionId, ids)
    .slice(0, 60)
    .map(r => ({ id: r.id, label: r.name, icon: sectionMeta(r.sectionId)?.icon, connId: crumbConn ? undefined : r.connId, sub: r.status }));
});

const kindLabel = $derived.by(() => {
  const k = crumbKind;
  if (!k) return '';
  if (k.sectionId) return sectionMeta(k.sectionId)?.label ?? '';
  return pdKind(k.kindId)?.label ?? '';
});
const kindIcon = $derived(crumbKind?.sectionId ? sectionMeta(crumbKind.sectionId)?.icon : pdKind(crumbKind?.kindId)?.icon);
const leaf = $derived(active?.kind === 'resource' ? resource(active.resId) : undefined);
const cc = $derived(findConn(crumbConn));
const isK8sChild = $derived(crumbKind?.kindId === 'kubernetes' && !!crumbKind.sectionId && KUBE_CORE.includes(crumbKind.sectionId));
</script>

{#snippet seg(id: 'conn' | 'kind' | 'res', content: Snippet, strong = false)}
  <button
    type="button"
    aria-haspopup="listbox"
    aria-expanded={menu === id}
    class="flex items-center gap-1.5 h-8 px-2 rounded-md text-base hover:bg-[var(--pd-content-card-hover-bg)] {menu === id ? 'bg-[var(--pd-content-card-hover-bg)] ring-1 ring-[var(--pd-tab-highlight)]' : ''} {strong ? 'font-bold text-lg text-[var(--pd-content-header)]' : 'text-[var(--pd-content-breadcrumb)]'}"
    onclick={(): void => { menu = menu === id ? undefined : id; }}>
    {@render content()}
    <AppIcon icon={faChevronDown} size="xs" class="opacity-60" />
  </button>
{/snippet}

{#snippet connSeg()}
  {#if cc}
    {#if lab.color && ctxColor(cc.id)}<span class="w-2 h-2 rounded-full" style:background={ctxColor(cc.id)}></span>{/if}
    <ConnIcon connId={cc.id} size={18} ring="var(--pd-content-bg)" /><span class="font-medium">{cc.name}</span>
    {#if CTX_LABEL[cc.id]}<span class="px-1 rounded text-[9px] font-bold text-white bg-[var(--pd-status-dead)]">{CTX_LABEL[cc.id]}</span>{/if}
  {:else}
    <AppIcon icon={faLayerGroup} size="16px" /><span class="font-medium">All connections</span>
  {/if}
{/snippet}

{#snippet kindSeg()}
  <AppIcon icon={kindIcon} size="16px" /><span class:font-bold={!leaf} class:text-lg={!leaf} class:text-[var(--pd-content-header)]={!leaf}>{isK8sChild ? `Kubernetes › ${kindLabel}` : kindLabel}</span>
  {#if !leaf}<span class="text-sm opacity-60">{resItems.length}</span>{/if}
{/snippet}

{#snippet resSeg()}
  {#if leaf}<span>{leaf.name}</span>{:else}<span class="text-sm opacity-60 italic">open…</span>{/if}
{/snippet}

<Frame {tint}>
  <KindsNav {entries} selected={wb.active === HOME ? homeId : navIdOf(active)} collapsed={lab.rail === 'icons'} onselect={onnav} label="Resource kinds" />
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    {#if crumbKind}
      <div class="relative flex items-center gap-0.5 h-12 px-3 shrink-0 border-b border-[var(--pd-content-divider)]" aria-label="Breadcrumb">
        <div class="relative">
          {@render seg('conn', connSeg)}
          {#if menu === 'conn'}
            <ConnPicker selected={crumbConn ? [crumbConn] : []} allowAll onchange={pickConn} onkind={jump} onclose={(): void => { menu = undefined; }} class="left-0 top-full mt-1" />
          {/if}
        </div>
        <span class="text-[10px] opacity-50"><AppIcon icon={faChevronRight} /></span>
        <div class="relative">
          {@render seg('kind', kindSeg, false)}
          {#if menu === 'kind'}
            <SearchMenu items={kindItems} selected={navIdOf(crumbKind)} placeholder="Go to kind in {cc?.name ?? 'all connections'}" onpick={(id): void => { const t = navTarget(id); if (t) wb.goHome(t); }} onclose={(): void => { menu = undefined; }} class="left-0 top-full mt-1" />
          {/if}
        </div>
        <span class="text-[10px] opacity-50"><AppIcon icon={faChevronRight} /></span>
        <div class="relative">
          {@render seg('res', resSeg, !!leaf)}
          {#if menu === 'res'}
            <SearchMenu items={resItems} selected={leaf?.id} placeholder="Open {kindLabel.toLowerCase()}" onpick={(id): void => { const r = resource(id); if (r) wb.open({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }); }} onclose={(): void => { menu = undefined; }} class="left-0 top-full mt-1" />
          {/if}
        </div>
      </div>
    {/if}
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === HOME ? JSON.stringify(wb.home) + bcConn : wb.active}
        {#if wb.active === HOME && wb.home?.kind === 'dashboard'}
          <Dashboard selected={bcConn ? [bcConn] : []} hint="Click a card to set the breadcrumb connection." onpick={(id, k): void => jump(id, k ?? defaultKind(findConn(id)))} />
        {:else}
          <Content target={active} onopen={open} scope={scope ?? []} headerless={!!crumbKind} />
        {/if}
      {/key}
    </div>
    <BottomPanel sessions={PANEL_SESSIONS} {tint} />
  </div>
</Frame>
