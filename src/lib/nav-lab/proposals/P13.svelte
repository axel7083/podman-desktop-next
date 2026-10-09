<script lang="ts">
/**
 * P13 P1 without the rail: P1's editor tabs (preview tabs, provider badges),
 * Summary | Inspect | Split details and bottom panel, but no activity rail and
 * no Explorer / Workflows / Tools concepts. One left panel: the connection
 * switcher on top, then the selected connection as a tree (Overview,
 * resource types ▸ resources, contributed sections) and its Extensions pages.
 * Global destinations live in the title bar (Dashboard left; notifications,
 * Extensions, Accounts, Settings right).
 */
import { faChevronDown, faChevronRight, faCircleInfo, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn, type LabTarget, PANEL_SESSIONS, resourcesOf, STATUS_DOT, targetKey } from '../data.ts';
import { lab, Workbench } from '../lab.svelte.ts';
import Frame from '../r2/Frame.svelte';
import SimpleSwitcher from '../r2/SimpleSwitcher.svelte';
import { extPagesFor, labConns } from '../r2/simple.ts';
import TitleActions from '../r2/TitleActions.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

// svelte-ignore state_referenced_locally
let sel = $state(lab.ctx ?? 'podman-machine-default');
let filter = $state('');
let expanded = $state<string[]>(['containers', 'kpods']);

const c = $derived(findConn(labConns().some(x => x.id === sel) ? sel : labConns()[0]?.id));
const f = $derived(filter.trim().toLowerCase());
const pages = $derived(extPagesFor(c).filter(t => !f || t.name.toLowerCase().includes(f)));
const activeKind = $derived(wb.activeTarget?.kind);

function toggle(id: string): void {
  expanded = expanded.includes(id) ? expanded.filter(x => x !== id) : [...expanded, id];
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.connId && t.connId !== c?.id && labConns().some(x => x.id === t.connId)) sel = t.connId;
  wb.open(t, opts);
}

function select(id: string): void {
  sel = id;
  filter = '';
  open({ kind: 'connection', connId: id }, { preview: true });
}

function matches(sectionId: string): number {
  return c && f ? resourcesOf(c.id, sectionId).filter(r => r.name.toLowerCase().includes(f)).length : 0;
}
</script>

{#snippet row(depth: number, label: string, o: { key?: string; chevron?: boolean; open?: boolean; target: LabTarget; icon?: IconRef; ext?: string; status?: string; count?: number; dim?: string })}
  {@const on = wb.active === targetKey(o.target)}
  <div
    role="treeitem"
    tabindex="-1"
    aria-selected={on}
    aria-expanded={o.chevron ? o.open : undefined}
    class="flex items-center gap-1.5 h-6 pr-2 cursor-pointer whitespace-nowrap text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    class:bg-[var(--pd-secondary-nav-selected-bg)]={on}
    class:!text-[var(--pd-secondary-nav-text-selected)]={on}
    style:padding-left="{6 + depth * 14}px"
    onclick={(): void => open(o.target, { preview: true })}
    ondblclick={(): void => open(o.target)}
    onkeydown={(e): void => { if (e.key === 'Enter') open(o.target); }}>
    <span
      class="w-3 shrink-0 text-[9px] opacity-70"
      role="presentation"
      onclick={(e): void => {
        if (o.chevron && o.key) {
          e.stopPropagation();
          toggle(o.key);
        }
      }}>{#if o.chevron}<AppIcon icon={o.open ? faChevronDown : faChevronRight} />{/if}</span>
    {#if o.status}
      <span class="w-2 h-2 mx-1 rounded-full shrink-0 {STATUS_DOT[o.status] ?? STATUS_DOT.running}"></span>
    {:else if o.icon}
      <span class="relative flex w-4 h-4 items-center justify-center shrink-0" style:font-size="13px"
        ><AppIcon icon={o.icon} size="15px" />{#if o.ext}<span class="absolute -bottom-1 -right-1.5 flex"><AppIcon icon={o.ext} size="9px" /></span>{/if}</span>
    {/if}
    <span class="truncate">{label}</span>
    {#if o.dim}<span class="truncate text-sm opacity-50">{o.dim}</span>{/if}
    <span class="flex-1"></span>
    {#if o.count !== undefined}<span class="text-sm opacity-50">{o.count}</span>{/if}
  </div>
{/snippet}

{#snippet titleLeft()}<TitleActions side="left" active={activeKind} onopen={(t): void => open(t)} />{/snippet}
{#snippet titleRight()}<TitleActions side="right" active={activeKind} onopen={(t): void => open(t)} />{/snippet}

<Frame {titleLeft} {titleRight}>
  {#if c}
    <aside class="flex flex-col w-[272px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)]">
      <div class="px-2 pt-2 pb-1 shrink-0">
        <SimpleSwitcher selected={c.id} onselect={select} onmanage={(): void => open({ kind: 'settings' })} />
      </div>
      <div class="px-2 pb-2 shrink-0">
        <label class="flex items-center gap-2 h-7 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
          <AppIcon icon={faMagnifyingGlass} size="xs" />
          <input class="flex-1 min-w-0 bg-transparent outline-none text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" placeholder="Filter {c.name}" bind:value={filter} />
        </label>
      </div>
      <div role="tree" aria-label="{c.name} resources" class="flex-1 min-h-0 overflow-auto pb-2 text-base">
        {#if !f}{@render row(0, 'Overview', { target: { kind: 'connection', connId: c.id }, icon: faCircleInfo })}{/if}
        {#each c.sections.filter(s => !f || matches(s.id) > 0) as s (s.id)}
          {@const sOpen = expanded.includes(s.id) || !!f}
          {@render row(0, s.label, { key: s.id, chevron: s.count > 0, open: sOpen, target: { kind: 'list', connId: c.id, sectionId: s.id }, icon: s.icon, ext: s.ext?.icon, count: f ? matches(s.id) : s.count })}
          {#if sOpen}
            {#each resourcesOf(c.id, s.id).filter(r => !f || r.name.toLowerCase().includes(f)).slice(0, 40) as r (r.id)}
              {@render row(1, r.name, { target: { kind: 'resource', connId: c.id, sectionId: s.id, resId: r.id }, status: r.status, dim: r.group })}
            {/each}
          {/if}
        {/each}
        {#if pages.length}
          <div class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Extensions</div>
          {#each pages as t (t.id)}
            {@render row(0, t.name, { target: { kind: 'tool', toolId: t.id }, icon: t.icon })}
          {/each}
        {/if}
      </div>
    </aside>
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active}<Content target={wb.activeTarget} onopen={open} selectedRes={wb.activeTarget?.resId} />{/key}
    </div>
    <BottomPanel sessions={c ? PANEL_SESSIONS.filter(s => s.connId === c.id).concat(PANEL_SESSIONS.filter(s => s.connId !== c.id)) : PANEL_SESSIONS} />
  </div>
</Frame>
