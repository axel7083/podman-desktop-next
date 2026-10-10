<script lang="ts">
/**
 * P13 P1 without the rail: editor tabs with the Dashboard as a fixed first
 * tab (home glyph), one shared compact header for every tab (lists with the
 * search inline), PD tables for lists (Quadlets included), PD details tabs,
 * logs / terminals / TTY as side-by-side panes in the bottom panel, Grype scan
 * tabs, Ctrl+F inside code views. One left panel: the connection switcher, a
 * filter, then the selected connection as a tree. Placement rule: core
 * resources first (Overview, Containers, Pods, Images, Volumes, Networks / the
 * Kubernetes kinds), then an EXTENSIONS sub-header holding every extension
 * contribution, one entry per extension with its logo (Compose included):
 * extensions with resources on this connection first, then extension tool
 * pages. Extension sub-tree children use semantic icons; every overview uses
 * the Overview icon. Right-click a tree item for its actions. Lab toggle
 * "Install: Vanilla | All extensions" switches what is installed.
 * Design rules: docs/p13-design-rules.md (audit: docs/p13-audit.md).
 */
import { faArrowCircleDown, faChevronDown, faChevronRight, faEllipsisVertical, faFolder, faFolderOpen, faHammer, faMagnifyingGlass, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { untrack } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import {
  conn as findConn,
  FEW_TABS,
  KUBE_KINDS,
  type LabResource,
  type LabSection,
  type LabTarget,
  KUBE_GROUP_ICON,
  MANY_TABS,
  PANEL_SESSIONS,
  resource,
  resourcesOf,
  section as findSection,
  STATUS_DOT,
  targetKey,
  tool as findTool,
} from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import Frame from '../r2/Frame.svelte';
import SimpleSwitcher from '../r2/SimpleSwitcher.svelte';
import { extPagesFor, labConns } from '../r2/simple.ts';
import TitleActions from '../r2/TitleActions.svelte';
import AccountsView from '../r3/AccountsView.svelte';
import ConnView from '../r3/ConnView.svelte';
import ExtensionsView from '../r3/ExtensionsView.svelte';
import FilterInput from '../r3/FilterInput.svelte';
import { connVisible, isInstalled, sectionVisible, toolVisible } from '../r3/exts.ts';
import { flows } from '../r3/flows.svelte.ts';
import HomeDashboard from '../r3/HomeDashboard.svelte';
import KubeListView from '../r3/KubeListView.svelte';
import { inNs } from '../r3/kube-ns.svelte.ts';
import { kubeMenu } from '../r3/kube-details.svelte.ts';
import { nsMenu } from '../r3/kube-menu.ts';
import KubeOverview from '../r3/KubeOverview.svelte';
import KubeResourceView from '../r3/KubeResourceView.svelte';
import OperatorsView from '../r3/OperatorsView.svelte';
import Palette from '../r3/Palette.svelte';
import { tour } from '../r3/tours.svelte.ts';
import TourOverlay from '../r3/TourOverlay.svelte';
import KomposeView from '../r3/KomposeView.svelte';
import { kompose } from '../r3/kompose.svelte.ts';
import KubePlayView from '../r3/KubePlayView.svelte';
import ListView from '../r3/ListView.svelte';
import ScanView from '../r3/ScanView.svelte';
import SettingsView from '../r3/SettingsView.svelte';
import ToolView from '../r3/ToolView.svelte';
import { connActions, isUp, live, type MenuItem, openMenu, resActions, resStatus } from '../r3/live.svelte.ts';
import NodeView from '../r3/NodeView.svelte';
import { hbImage } from '../r3/hb-data.ts';
import { pullHardened, pullState, rebuildOnHardened, rebuildState } from '../r3/hummingbird.ts';
import { OVERVIEW_ICON, TREE_PROVIDERS, type TreeNode, treeRoot } from '../r3/trees.ts';
import BottomPanel from '../ui/BottomPanel.svelte';
import Content from '../ui/Content.svelte';
import LabIcon from '../ui/LabIcon.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
wb.home = { kind: 'dashboard' };

function targetVisible(t: LabTarget): boolean {
  const c = findConn(t.connId);
  if (c && !connVisible(c)) return false;
  const s = findSection(c, t.sectionId);
  if (s && !sectionVisible(s)) return false;
  const tl = findTool(t.toolId);
  return !tl || toolVisible(tl);
}

$effect.pre(() => {
  const mode = lab.tabs;
  void lab.install;
  untrack(() => wb.reset((mode === 'many' ? MANY_TABS : FEW_TABS).filter(targetVisible)));
});

$effect(() => {
  live.ondelete = (resId: string): void => {
    for (const t of wb.tabs.filter(x => x.target.resId === resId)) wb.close(t.key);
  };
  return (): void => {
    live.ondelete = undefined;
  };
});

// svelte-ignore state_referenced_locally
let sel = $state(lab.ctx ?? 'podman-machine-default');
let filter = $state('');
let treeW = $state(272);

function resizeTree(e: PointerEvent): void {
  const startX = e.clientX;
  const startW = treeW;
  const move = (ev: PointerEvent): void => {
    treeW = Math.max(200, Math.min(480, startW + ev.clientX - startX));
  };
  const up = (): void => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
// A flow (new RHEL machine, VM…) made a connection current.
$effect(() => {
  const id = flows.select;
  if (!id) return;
  untrack(() => {
    flows.select = undefined;
    select(id);
  });
});

// Kompose deploy: expand the folders holding the new resources on that cluster.
$effect(() => {
  const r = kompose.reveal;
  if (!r) return;
  untrack(() => {
    kompose.reveal = undefined;
    const cur = expanded[r.connId] ?? [];
    expanded[r.connId] = [...new Set([...cur, ...r.keys])];
  });
});

/** Expanded tree keys, remembered per connection (sections collapsed by default). */
let expanded = $state<Record<string, string[]>>({});
let palette = $state(false);

// Guided tours (r3/tours.svelte.ts) drive the tree and tabs through these.
tour.host = {
  open: (t: LabTarget): void => open(t),
  select: (id: string): void => {
    if (c?.id !== id && labConns().some(x => x.id === id)) select(id);
  },
  expand: (connId: string, keys: string[]): void => {
    const cur = expanded[connId] ?? [];
    if (keys.some(k => !cur.includes(k))) expanded[connId] = [...new Set([...cur, ...keys])];
  },
};

const c = $derived(findConn(labConns().some(x => x.id === sel) ? sel : labConns()[0]?.id));
const f = $derived(filter.trim().toLowerCase());
const open1 = $derived(c ? (expanded[c.id] ?? []) : []);
const trees = $derived(c ? TREE_PROVIDERS.filter(p => p.connIds.includes(c.id) && isInstalled(p.extId)) : []);
const sections = $derived(c ? c.sections.filter(s => sectionVisible(s) && !trees.some(p => p.replaces.includes(s.id))) : []);
/** Core resources (no extension) first; extension-contributed sections go under EXTENSIONS. */
const coreSections = $derived(sections.filter(s => !s.ext));
/** Core sections and Kubernetes folders (Compute, Config…) in tree order. */
const coreItems = $derived.by(() => {
  const out: ({ s: LabSection } | { group: string; list: LabSection[] })[] = [];
  for (const s of coreSections) {
    if (!s.group) out.push({ s });
    else {
      const g = out.find(x => 'group' in x && x.group === s.group) as { group: string; list: LabSection[] } | undefined;
      if (g) g.list.push(s);
      else out.push({ group: s.group, list: [s] });
    }
  }
  return out;
});
const extSections = $derived(sections.filter(s => !!s.ext));
const extS = $derived(extSections.filter(s => !f || rows(s.id).length > 0));
const extT = $derived(c ? trees.filter(p => !f || nodeMatches(treeRoot(p, c.id))) : []);
const pages = $derived(
  extPagesFor(c).filter(t => !trees.some(p => p.extId === t.id) && !extSections.some(s => s.ext?.id === t.id) && (!f || t.name.toLowerCase().includes(f))),
);
const activeKind = $derived(wb.activeTarget?.kind);
const sessions = $derived.by(() => {
  void lab.install;
  void lab.conns;
  return untrack(() => {
    const ids = labConns().map(x => x.id);
    return PANEL_SESSIONS.filter(s => ids.includes(s.connId));
  });
});

function toggle(key: string): void {
  if (!c) return;
  const cur = expanded[c.id] ?? [];
  expanded[c.id] = cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key];
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'dashboard') {
    wb.active = HOME;
    return;
  }
  if (t.connId && t.connId !== c?.id && labConns().some(x => x.id === t.connId)) sel = t.connId;
  wb.open(t, opts);
}

function select(id: string): void {
  sel = id;
  filter = '';
  open({ kind: 'connection', connId: id }, { preview: true });
}

function rows(sectionId: string): LabResource[] {
  if (!c) return [];
  void live.added;
  return resourcesOf(c.id, sectionId).filter(r => !live.deleted.includes(r.id) && inNs(r) && (!f || r.name.toLowerCase().includes(f)));
}

/** Kubernetes kinds: count in the selected namespaces; others: dataset count ± runtime changes. */
function countOf(s: LabSection): number {
  if (!c) return 0;
  if (c.group === 'Kubernetes' && KUBE_KINDS.includes(s.id)) return rows(s.id).length;
  return s.count + live.added.filter(id => id.startsWith(`${c.id}/${s.id}/`)).length - live.deleted.filter(id => id.startsWith(`${c.id}/${s.id}/`)).length;
}

function nodeMatches(n: TreeNode): boolean {
  return n.label.toLowerCase().includes(f) || (n.children ?? []).some(nodeMatches);
}

function flat(x: TreeNode): TreeNode[] {
  return [x, ...(x.children ?? []).flatMap(flat)];
}

function nodeMenu(n: TreeNode): MenuItem[] {
  const st = n.status ? (live.status[n.id] ?? n.status) : undefined;
  const openIt = { label: 'Open', run: (): void => open({ kind: 'node', connId: c?.id, nodeId: n.id }) };
  // Hummingbird nodes: hardened image (pull) / local image alternative (compare, rebuild).
  const hb = hbImage(n.data?.hb);
  if (hb && c) return [openIt, { label: 'Pull image', icon: faArrowCircleDown, disabled: !!pullState(hb), run: (): void => pullHardened(hb, c.id), sep: true }];
  if (n.data?.local && c) {
    const local = n.data.local;
    return [{ ...openIt, label: 'Compare' }, { label: 'Rebuild on hardened image', icon: faHammer, disabled: rebuildState(local) === 'rebuilding', run: (): void => rebuildOnHardened(local, c.id), sep: true }];
  }
  return [
    openIt,
    { label: 'Start', icon: faPlay, disabled: !st || isUp(st), run: (): void => void (live.status[n.id] = 'running'), sep: true },
    { label: 'Stop', icon: faStop, disabled: !st || !isUp(st), run: (): void => void (live.status[n.id] = 'stopped') },
  ];
}

function rowMenu(t: LabTarget): MenuItem[] | undefined {
  if (t.kind === 'resource') {
    const r = resource(t.resId);
    if (r && c?.group === 'Kubernetes' && KUBE_KINDS.includes(r.sectionId)) return kubeMenu(r, open);
    return r ? resActions(r, open) : undefined;
  }
  if (t.kind === 'connection' && c) return c.group === 'Kubernetes' ? [...connActions(c, open), ...nsMenu(c, open)] : connActions(c, open);
  if (t.kind === 'node' && t.nodeId && c) {
    const n = trees.flatMap(p => flat(treeRoot(p, c.id))).find(x => x.id === t.nodeId);
    return n ? nodeMenu(n) : undefined;
  }
  return undefined;
}
</script>

{#snippet row(depth: number, label: string, o: { key?: string; chevron?: boolean; open?: boolean; target: LabTarget; icon?: IconRef; status?: string; count?: number | string; dim?: string })}
  {@const on = wb.active === targetKey(o.target)}
  {@const menu = rowMenu(o.target)}
  <div
    role="treeitem"
    tabindex="-1"
    aria-selected={on}
    aria-expanded={o.chevron ? o.open : undefined}
    data-key={o.key}
    class="group/row flex items-center gap-1.5 h-6 pr-1 cursor-pointer whitespace-nowrap text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    class:bg-[var(--pd-secondary-nav-selected-bg)]={on}
    class:fresh={!on && !!o.target.resId && kompose.fresh.includes(o.target.resId)}
    data-fresh={o.target.resId && kompose.fresh.includes(o.target.resId) ? '' : undefined}
    class:!text-[var(--pd-secondary-nav-text-selected)]={on}
    style:padding-left="{6 + depth * 14}px"
    onclick={(): void => open(o.target, { preview: true })}
    ondblclick={(): void => open(o.target)}
    oncontextmenu={(e): void => {
      if (menu) openMenu(e, menu);
    }}
    onkeydown={(e): void => {
      if (e.key === 'Enter') open(o.target);
    }}>
    <span
      class="flex w-3 shrink-0 justify-center text-[9px] opacity-70"
      role="presentation"
      data-chevron={o.chevron ? o.key : undefined}
      onclick={(e): void => {
        if (o.chevron && o.key) {
          e.stopPropagation();
          toggle(o.key);
        }
      }}>{#if o.chevron}<AppIcon icon={o.open ? faChevronDown : faChevronRight} />{/if}</span>
    {#if o.status}
      <span class="flex w-4 h-4 items-center justify-center shrink-0"><span class="w-2 h-2 rounded-full {STATUS_DOT[o.status] ?? STATUS_DOT.running}" data-status={o.status}></span></span>
    {:else if o.icon}
      <LabIcon icon={o.icon} size={16} />
    {/if}
    <span class="truncate">{label}</span>
    {#if o.dim}<span class="truncate text-[11px] text-[var(--pd-table-body-text)]">{o.dim}</span>{/if}
    <span class="flex-1"></span>
    {#if o.count !== undefined}<span class="text-[11px] text-[var(--pd-table-body-text)] {menu ? 'group-hover/row:hidden' : ''}">{o.count}</span>{/if}
    {#if menu}
      <button
        type="button"
        aria-label="Actions for {label}"
        class="w-5 h-5 shrink-0 items-center justify-center rounded hover:bg-[var(--pd-content-card-hover-inset-bg)] text-[11px] hidden group-hover/row:flex"
        onclick={(e): void => openMenu(e, menu)}><AppIcon icon={faEllipsisVertical} /></button>
    {/if}
  </div>
{/snippet}

{#snippet nodeRows(n: TreeNode, depth: number)}
  {@const isOpen = open1.includes(n.id) || (!!f && nodeMatches(n))}
  {@const st = n.status ? (live.status[n.id] ?? n.status) : undefined}
  {@const leaf = !n.children?.length}
  {@render row(depth, n.label, { key: n.id, chevron: !leaf, open: isOpen, target: { kind: 'node', connId: c?.id, nodeId: n.id }, icon: n.icon, status: st, dim: leaf ? n.detail : undefined, count: leaf ? undefined : n.detail })}
  {#if isOpen}
    {#each (n.children ?? []).filter(x => !f || nodeMatches(x) || n.label.toLowerCase().includes(f)) as ch (ch.id)}
      {@render nodeRows(ch, depth + 1)}
    {/each}
  {/if}
{/snippet}

{#snippet sectionRows(s: LabSection, depth = 0)}
  {@const list = rows(s.id)}
  {@const sOpen = open1.includes(s.id) || !!f}
  {@render row(depth, s.label, { key: s.id, chevron: list.length > 0, open: sOpen, target: { kind: 'list', connId: c!.id, sectionId: s.id }, icon: s.ext?.icon ?? s.icon, count: f ? list.length : countOf(s) })}
  {#if sOpen}
    {#each list.slice(0, 40) as r (r.id)}
      {@render row(depth + 1, r.name, { target: { kind: 'resource', connId: c!.id, sectionId: s.id, resId: r.id }, status: resStatus(r), dim: r.group ?? r.ns })}
    {/each}
  {/if}
{/snippet}

{#snippet folderRows(group: string, list: LabSection[])}
  {@const key = `grp:${group}`}
  {@const gOpen = open1.includes(key) || !!f}
  <div
    role="treeitem"
    tabindex="-1"
    aria-selected="false"
    aria-expanded={gOpen}
    data-key={key}
    data-folder={group}
    class="flex items-center gap-1.5 h-6 pr-1 pl-1.5 cursor-pointer whitespace-nowrap text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    onclick={(): void => toggle(key)}
    onkeydown={(e): void => {
      if (e.key === 'Enter') toggle(key);
    }}>
    <span class="flex w-3 shrink-0 justify-center text-[9px] opacity-70" data-chevron={key}><AppIcon icon={gOpen ? faChevronDown : faChevronRight} /></span>
    <LabIcon icon={KUBE_GROUP_ICON[group] ?? (gOpen ? faFolderOpen : faFolder)} size={16} />
    <span class="truncate">{group}</span>
    <span class="flex-1"></span>
    <span class="text-[11px] text-[var(--pd-table-body-text)]">{list.reduce((n, s) => n + countOf(s), 0)}</span>
  </div>
  {#if gOpen}
    {#each list as s (s.id)}{@render sectionRows(s, 1)}{/each}
  {/if}
{/snippet}

{#snippet titleLeft()}<TitleActions side="left" dashboard={false} active={activeKind} onopen={(t): void => open(t)} />{/snippet}
{#snippet titleCenter()}
  <button type="button" data-testid="p13-search" class="flex items-center gap-2 w-[360px] max-w-[30vw] h-6 px-2 rounded-md bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] text-sm text-[var(--pd-input-field-placeholder-text)]" onclick={(): void => void (palette = true)}>
    <AppIcon icon={faMagnifyingGlass} size="xs" /><span class="flex-1 text-left truncate">Search</span><kbd class="opacity-70">⌘K</kbd>
  </button>
{/snippet}
{#snippet titleRight()}<TitleActions side="right" active={activeKind} onopen={(t): void => open(t)} />{/snippet}

<Frame {titleLeft} {titleCenter} {titleRight}>
  {#if c}
    <aside data-island="tree" tabindex="-1" style:width="{treeW}px" class="flex flex-col shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)]">
      <div class="px-2 pt-2 pb-1 shrink-0">
        <SimpleSwitcher selected={c.id} onselect={select} onmanage={(): void => open({ kind: 'settings' })} />
      </div>
      <div class="px-2 pb-2 shrink-0">
        <FilterInput testid="tree-filter" placeholder="Filter {c.name}" bind:value={filter} />
      </div>
      <div role="tree" aria-label="{c.name} resources" data-testid="p13-tree" class="flex-1 min-h-0 overflow-auto pb-2 text-base">
        {#if !f}{@render row(0, 'Overview', { target: { kind: 'connection', connId: c.id }, icon: OVERVIEW_ICON })}{/if}
        {#each coreItems as it ('group' in it ? `grp:${it.group}` : it.s.id)}
          {#if 'group' in it}
            {@const list = it.list.filter(s => !f || rows(s.id).length > 0)}
            {#if list.length}{@render folderRows(it.group, list)}{/if}
          {:else if !f || rows(it.s.id).length > 0}
            {@render sectionRows(it.s)}
          {/if}
        {/each}
        {#if extS.length || extT.length || pages.length}
          <div data-testid="tree-extensions" class="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Extensions</div>
          {#each extS as s (s.id)}
            {@render sectionRows(s)}
          {/each}
          {#each extT as p (p.id)}
            {@render nodeRows(treeRoot(p, c.id), 0)}
          {/each}
          {#each pages as t (t.id)}
            {@render row(0, t.name, { target: { kind: 'tool', toolId: t.id }, icon: t.icon })}
          {/each}
        {/if}
      </div>
    </aside>
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the tree"
      data-resizer="tree"
      class="relative z-10 w-1 -mx-0.5 shrink-0 cursor-col-resize hover:bg-[var(--pd-tab-highlight)]"
      onpointerdown={resizeTree}></div>
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <div data-island="editor" tabindex="-1" class="flex flex-col flex-1 min-h-0 min-w-0">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active}
        {@const t = wb.activeTarget}
        {@const tc = findConn(t?.connId)}
        {@const ts = findSection(tc, t?.sectionId)}
        {@const tr = resource(t?.resId)}
        {#if t?.kind === 'dashboard'}
          <HomeDashboard onopen={open} />
        {:else if t?.kind === 'list' && tc && ts && tc.group === 'Kubernetes' && KUBE_KINDS.includes(ts.id)}
          <KubeListView c={tc} s={ts} onopen={open} />
        {:else if t?.kind === 'list' && tc && ts && ts.id === 'operators'}
          <OperatorsView c={tc} s={ts} onopen={open} />
        {:else if t?.kind === 'list' && tc && ts}
          <ListView c={tc} s={ts} onopen={open} />
        {:else if t?.kind === 'resource' && tc && ts && tr && tc.group === 'Kubernetes' && KUBE_KINDS.includes(ts.id)}
          <KubeResourceView res={tr} c={tc} s={ts} onopen={open} />
        {:else if t?.kind === 'kompose' && t.resId}
          <KomposeView key={t.resId} onopen={open} />
        {:else if t?.kind === 'scan' && tr}
          <ScanView res={tr} onopen={open} />
        {:else if t?.kind === 'settings'}
          <SettingsView />
        {:else if t?.kind === 'kubeplay' && tc}
          <KubePlayView connId={tc.id} onopen={open} />
        {:else if t?.kind === 'connection' && tc && tc.group === 'Kubernetes'}
          <KubeOverview c={tc} onopen={open} />
        {:else if t?.kind === 'connection' && tc}
          <ConnView c={tc} onopen={open} />
        {:else if t?.kind === 'node' && t.nodeId}
          <NodeView nodeId={t.nodeId} onopen={open} />
        {:else if t?.kind === 'extensions'}
          <ExtensionsView />
        {:else if t?.kind === 'accounts'}
          <AccountsView onopen={open} />
        {:else if t?.kind === 'tool' && t.toolId}
          <ToolView toolId={t.toolId} onopen={open} />
        {:else}
          <Content target={t} onopen={open} selectedRes={t?.resId} />
        {/if}
      {/key}
    </div>
    </div>
    <BottomPanel {sessions} onopen={open} />
  </div>
</Frame>
<Palette bind:open={palette} onselect={select} />
<TourOverlay />

<style>
/* Resources just deployed by a flow (Kompose): soft accent tint until the next deploy. */
.fresh {
  background: color-mix(in srgb, var(--pd-status-running) 14%, transparent);
}
</style>
