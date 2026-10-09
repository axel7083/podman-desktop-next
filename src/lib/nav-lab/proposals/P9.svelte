<script lang="ts">
/**
 * P9 Dashboard launcher + scoped tab groups (Portainer/Compass home, Chrome
 * tab groups, Lens 2025 contextual tab filtering): Dashboard is the home tab;
 * a card opens a connection tab with in-page kind sub-tabs; resources opened
 * from it join that connection's coloured, collapsible tab group; the dock
 * follows the active group. A slim kinds nav opens cross-connection lists.
 */
import { faChevronDown, faHouse, faXmark } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, FEW_TABS, type LabTarget, MANY_TABS, PANEL_SESSIONS, targetKey } from '../data.ts';
import { describe, lab } from '../lab.svelte.ts';
import ConnPage from '../r2/ConnPage.svelte';
import { CTX_LABEL, ctxColor, PD_KINDS } from '../r2/ctx.ts';
import Dashboard from '../r2/Dashboard.svelte';
import ExtPages from '../r2/ExtPages.svelte';
import Frame from '../r2/Frame.svelte';
import KindsNav from '../r2/KindsNav.svelte';
import { navEntries, navIdOf, navTarget } from '../r2/nav.ts';
import BottomPanel from '../ui/BottomPanel.svelte';
import Content from '../ui/Content.svelte';
import TabIcon from '../ui/TabIcon.svelte';

interface Tab {
  key: string;
  target: LabTarget;
}
interface Group {
  connId: string;
  collapsed: boolean;
  tabs: Tab[];
}

const HOME = '__dash__';
let groups = $state<Group[]>([]);
let loose = $state<Tab[]>([]);
let active = $state(HOME);
let subOf = $state<Record<string, string>>({});
// svelte-ignore state_referenced_locally
let menuOpen = $state(lab.openKey);

const tab = (t: LabTarget): Tab => ({ key: targetKey(t), target: t });
const connTab = (id: string): Tab => tab({ kind: 'connection', connId: id });

function build(list: LabTarget[], many: boolean): void {
  const gs: Group[] = [];
  const ls: Tab[] = [];
  for (const t of list) {
    if (t.connId && (t.kind === 'resource' || t.kind === 'connection')) {
      let g = gs.find(x => x.connId === t.connId);
      if (!g) {
        g = { connId: t.connId, collapsed: false, tabs: [connTab(t.connId)] };
        gs.push(g);
      }
      if (t.kind === 'resource') g.tabs.push(tab(t));
    } else ls.push(tab(t));
  }
  if (many) for (const g of gs) g.collapsed = g.connId !== (lab.ctx ?? 'ocp-dev');
  groups = gs;
  loose = ls;
  const focus = lab.ctx ?? 'ocp-dev';
  const fg = gs.find(g => g.connId === focus);
  if (fg) fg.collapsed = false;
  active = many || lab.ctx ? (fg?.tabs[1]?.key ?? fg?.tabs[0]?.key ?? HOME) : HOME;
}

$effect.pre(() => {
  const many = lab.tabs === 'many';
  build(many ? MANY_TABS : FEW_TABS, many);
});

const allTabs = $derived([...groups.flatMap(g => g.tabs), ...loose]);
const activeTarget = $derived(active === HOME ? ({ kind: 'dashboard' } as LabTarget) : allTabs.find(t => t.key === active)?.target);
const activeGroup = $derived(groups.find(g => g.tabs.some(t => t.key === active)));

function color(id: string): string {
  return ctxColor(id) ?? findConn(id)?.color ?? '#888';
}

/** Open a connection tab (creating its group) and optionally a sub-tab. */
function openConn(id: string, sub?: string): void {
  let g = groups.find(x => x.connId === id);
  if (!g) {
    groups.push({ connId: id, collapsed: false, tabs: [connTab(id)] });
    g = groups[groups.length - 1];
  }
  g.collapsed = false;
  if (sub) subOf[id] = sub;
  active = g.tabs[0].key;
}

function open(t: LabTarget): void {
  if (t.kind === 'connection' && t.connId) return openConn(t.connId);
  if (t.kind === 'list' && t.connId) return openConn(t.connId, t.sectionId);
  const key = targetKey(t);
  if (allTabs.some(x => x.key === key)) {
    const g = groups.find(x => x.tabs.some(y => y.key === key));
    if (g) g.collapsed = false;
    active = key;
    return;
  }
  if (t.kind === 'resource' && t.connId) {
    openConn(t.connId);
    const g = groups.find(x => x.connId === t.connId)!;
    g.tabs.push(tab(t));
    active = key;
    return;
  }
  loose.push(tab(t));
  active = key;
}

function close(key: string): void {
  for (const g of groups) {
    const i = g.tabs.findIndex(t => t.key === key);
    if (i === 0) {
      groups = groups.filter(x => x !== g);
      if (g.tabs.some(t => t.key === active)) active = HOME;
      return;
    }
    if (i > 0) {
      g.tabs.splice(i, 1);
      if (active === key) active = g.tabs[i - 1].key;
      return;
    }
  }
  loose = loose.filter(t => t.key !== key);
  if (active === key) active = HOME;
}

function onnav(id: string): void {
  if (id === 'dashboard') {
    active = HOME;
    return;
  }
  const t = navTarget(id);
  if (t) open(t);
}

const hiddenCount = $derived(groups.filter(g => g.collapsed).reduce((a, g) => a + g.tabs.length, 0));
const dockSessions = $derived(activeGroup ? PANEL_SESSIONS.filter(s => s.connId === activeGroup.connId) : PANEL_SESSIONS);
const tint = $derived(lab.color && activeGroup ? ctxColor(activeGroup.connId) : undefined);
</script>

{#snippet tabEl(t: Tab, gcol?: string)}
  {@const d = describe(t.target)}
  {@const sel = t.key === active}
  {@const isConn = t.target.kind === 'connection'}
  <div
    role="tab"
    tabindex="0"
    aria-selected={sel}
    title={d.title}
    class="group/tab relative flex items-center gap-2 h-full pl-2.5 pr-1 cursor-pointer shrink-0 select-none max-w-[190px] {sel ? 'bg-[var(--pd-content-bg)] text-[var(--pd-tab-text-highlight)]' : 'text-[var(--pd-tab-text)] hover:bg-[var(--pd-content-card-hover-bg)]'}"
    style:background={gcol && !sel ? `color-mix(in srgb, ${gcol} 9%, transparent)` : undefined}
    onclick={(): void => { active = t.key; }}
    onkeydown={(e): void => { if (e.key === 'Enter') active = t.key; }}>
    {#if gcol}<span class="absolute left-0 right-0 bottom-0 h-[3px]" style:background={gcol}></span>{/if}
    {#if sel}<span class="absolute left-0 right-0 top-0 h-[2px] bg-[var(--pd-tab-highlight)]"></span>{/if}
    {#if isConn}
      <TabIcon icon={findConn(t.target.connId)?.icon ?? ''} size={15} />
      {@const cc = findConn(t.target.connId)}
      <span class="truncate text-base font-medium">{cc?.sections.find(x => x.id === subOf[cc.id])?.label ?? cc?.sections[0]?.label ?? 'Overview'}</span>
    {:else}
      <TabIcon icon={d.icon} connId={gcol ? undefined : d.connId} size={15} />
      <span class="truncate text-base">{d.title}</span>
    {/if}
    <button
      type="button"
      aria-label="Close {d.title}"
      class="w-5 h-5 shrink-0 flex items-center justify-center rounded hover:bg-[var(--pd-content-card-hover-inset-bg)] {sel ? '' : 'invisible group-hover/tab:visible'}"
      onclick={(e): void => {
        e.stopPropagation();
        close(t.key);
      }}><AppIcon icon={faXmark} size="xs" /></button>
  </div>
{/snippet}

<Frame {tint}>
  <KindsNav entries={navEntries(undefined, {})} selected={active === HOME ? 'dashboard' : navIdOf(activeTarget)} collapsed={lab.rail !== 'expanded'} onselect={onnav} label="Cross-connection lists" />
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <div role="tablist" aria-label="Open tabs" class="flex items-stretch h-9 shrink-0 bg-[var(--pd-secondary-nav-bg)] border-b border-[var(--pd-content-divider)]">
      <div
        role="tab"
        tabindex="0"
        aria-selected={active === HOME}
        class="relative flex items-center gap-2 px-3 shrink-0 cursor-pointer border-r border-[var(--pd-content-divider)] {active === HOME ? 'bg-[var(--pd-content-bg)] text-[var(--pd-tab-text-highlight)]' : 'text-[var(--pd-tab-text)]'}"
        onclick={(): void => { active = HOME; }}
        onkeydown={(): void => { active = HOME; }}>
        {#if active === HOME}<span class="absolute left-0 right-0 top-0 h-[2px] bg-[var(--pd-tab-highlight)]"></span>{/if}
        <AppIcon icon={faHouse} size="xs" /><span class="font-medium">Dashboard</span>
      </div>
      <div class="flex items-stretch min-w-0 overflow-x-auto [scrollbar-width:none]">
        {#each groups as g (g.connId)}
          {@const c = findConn(g.connId)}
          {@const gcol = color(g.connId)}
          <div class="flex items-stretch shrink-0 border-r border-[var(--pd-content-divider)]">
            <button
              type="button"
              aria-expanded={!g.collapsed}
              title="{c?.name}: {g.collapsed ? 'expand' : 'collapse'} group ({g.tabs.length} tabs)"
              class="flex items-center gap-1 self-center mx-1.5 h-[22px] pl-1.5 pr-2 rounded-md text-[11px] font-semibold text-white whitespace-nowrap shadow-sm"
              style:background={gcol}
              onclick={(): void => { g.collapsed = !g.collapsed; if (!g.collapsed) active = g.tabs[0].key; }}>
              <span class="w-3.5 h-3.5 rounded-sm bg-white/90 flex items-center justify-center"><TabIcon icon={c?.icon ?? ''} size={11} /></span>
              {c?.name}
              {#if CTX_LABEL[g.connId]}<span class="px-1 rounded bg-black/30 text-[9px]">{CTX_LABEL[g.connId]}</span>{/if}
              {#if g.collapsed}<span class="px-1 rounded-full bg-black/25">{g.tabs.length}</span>{/if}
            </button>
            {#if !g.collapsed}
              {#each g.tabs as t (t.key)}{@render tabEl(t, gcol)}{/each}
            {/if}
          </div>
        {/each}
        {#each loose as t (t.key)}<div class="flex items-stretch border-r border-[var(--pd-content-divider)]">{@render tabEl(t)}</div>{/each}
      </div>
      <div class="relative flex items-center px-1.5">
        <button type="button" class="flex items-center gap-1 h-6 px-2 rounded text-sm font-semibold whitespace-nowrap text-[var(--pd-tab-text)] border border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => { menuOpen = !menuOpen; }}>
          {allTabs.length} tabs{#if hiddenCount} · {hiddenCount} folded{/if}<AppIcon icon={faChevronDown} size="xs" />
        </button>
        {#if menuOpen}
          <div role="menu" class="absolute right-0 top-full mt-1 w-80 max-h-[60vh] overflow-auto rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-xl py-1 z-50">
            {#each groups as g (g.connId)}
              <div class="flex items-center gap-2 px-3 pt-2 pb-0.5 text-xs font-semibold"><span class="w-2 h-2 rounded-full" style:background={color(g.connId)}></span>{findConn(g.connId)?.name}</div>
              {#each g.tabs as t (t.key)}
                <button type="button" role="menuitem" class="w-full flex items-center gap-2 pl-6 pr-3 py-1 text-left hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => { g.collapsed = false; active = t.key; menuOpen = false; }}>
                  <TabIcon icon={describe(t.target).icon} size={14} />{t.target.kind === 'connection' ? 'Connection' : describe(t.target).title}
                </button>
              {/each}
            {/each}
          </div>
        {/if}
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key active + (activeTarget?.kind === 'connection' ? subOf[activeTarget.connId ?? ''] : '')}
        {#if active === HOME}
          <Dashboard hint="Click a card to open its connection tab; click a count to open that kind." onpick={(id, k): void => openConn(id, k ? findConn(id)?.sections.find(s => PD_KINDS.find(x => x.id === k)?.sections.includes(s.id))?.id : undefined)} />
        {:else if activeTarget?.kind === 'connection' && activeTarget.connId}
          {@const cid = activeTarget.connId}
          <ConnPage connId={cid} sub={subOf[cid] ?? ''} onsub={(sid): void => { subOf[cid] = sid; }} onopen={(t): void => open(t)} />
        {:else if activeTarget?.kind === 'extensions'}
          <ExtPages favs={[]} ontoggle={(): void => undefined} onopen={(id): void => open({ kind: 'tool', toolId: id })} />
        {:else}
          <Content target={activeTarget} onopen={(t): void => open(t)} />
        {/if}
      {/key}
    </div>
    <BottomPanel sessions={dockSessions} title={activeGroup ? findConn(activeGroup.connId)?.name : undefined} {tint} />
  </div>
</Frame>
