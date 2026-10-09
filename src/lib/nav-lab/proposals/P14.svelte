<script lang="ts">
/**
 * P14 P5 nav + switcher: P5's per-connection secondary nav (Overview, grouped
 * sections Workloads / Images & storage / Network / Config / Cluster,
 * contributed sections) exactly, without the hotbar. The connection switcher
 * sits at the top of that nav; Extensions pages for the connection come last.
 * Global destinations live in the title bar. Tabs + bottom dock as in P5.
 */
import { faChevronDown, faChevronRight, faCircleInfo } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabSection, type LabTarget, PANEL_SESSIONS, targetKey, YAML_SESSION } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import Frame from '../r2/Frame.svelte';
import SimpleSwitcher from '../r2/SimpleSwitcher.svelte';
import { extPagesFor, labConns } from '../r2/simple.ts';
import TitleActions from '../r2/TitleActions.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
// svelte-ignore state_referenced_locally
let sel = $state(lab.ctx ?? 'podman-machine-default');
let collapsed = $state<string[]>([]);
// svelte-ignore state_referenced_locally
wb.home = { kind: 'list', connId: sel, sectionId: 'containers' };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const c = $derived(findConn(labConns().some(x => x.id === sel) ? sel : labConns()[0]?.id));
const pages = $derived(extPagesFor(c));
const globalKind = $derived(wb.active === HOME ? wb.home?.kind : wb.activeTarget?.kind);

const LENS_GROUPS: [string, string[]][] = [
  ['Workloads', ['kpods', 'deployments', 'jobs', 'cronjobs', 'containers', 'pods']],
  ['Images & storage', ['images', 'volumes', 'pvcs']],
  ['Network', ['services', 'routes', 'networks']],
  ['Config', ['config']],
  ['Cluster', ['nodes']],
];

const groups = $derived.by((): [string, LabSection[]][] => {
  if (!c) return [];
  const used = new Set<string>();
  const out: [string, LabSection[]][] = [];
  for (const [g, ids] of LENS_GROUPS) {
    const list = c.sections.filter(s => !s.ext && ids.includes(s.id));
    list.forEach(s => used.add(s.id));
    if (list.length) out.push([g, list]);
  }
  const rest = c.sections.filter(s => !s.ext && !used.has(s.id));
  if (rest.length) out.push(['More', rest]);
  const ext = c.sections.filter(s => s.ext);
  if (ext.length) out.push(['Contributed', ext]);
  return out;
});

function select(id: string): void {
  sel = id;
  wb.goHome({ kind: 'connection', connId: id });
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' || t.kind === 'connection' || t.kind === 'dashboard') {
    if (t.connId && labConns().some(x => x.id === t.connId)) sel = t.connId;
    wb.goHome(t);
    return;
  }
  wb.open(t, opts);
}

function toggle(g: string): void {
  collapsed = collapsed.includes(g) ? collapsed.filter(x => x !== g) : [...collapsed, g];
}
</script>

{#snippet secRow(id: string | undefined, label: string, icon: unknown, count?: number, ext?: string)}
  {@const on = c && wb.active === HOME && wb.home?.connId === c.id && (id ? wb.home?.sectionId === id : wb.home?.kind === 'connection')}
  <button
    type="button"
    class="w-full flex items-center gap-2 h-7 pl-6 pr-2 text-left text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    class:bg-[var(--pd-secondary-nav-selected-bg)]={on}
    class:!text-[var(--pd-secondary-nav-text-selected)]={on}
    onclick={(): void => {
      if (c) wb.goHome(id ? { kind: 'list', connId: c.id, sectionId: id } : { kind: 'connection', connId: c.id });
    }}>
    <span class="w-4 flex justify-center" style:font-size="13px"><AppIcon icon={icon as never} size="15px" /></span>
    <span class="flex-1 truncate">{label}</span>
    {#if ext}<AppIcon icon={ext} size="12px" />{/if}
    {#if count !== undefined}<span class="text-sm opacity-50">{count}</span>{/if}
  </button>
{/snippet}

{#snippet groupHeader(g: string)}
  <button type="button" class="w-full flex items-center gap-1.5 h-7 px-2 text-left font-semibold text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" onclick={(): void => toggle(g)}>
    <span class="w-3 text-[9px]"><AppIcon icon={collapsed.includes(g) ? faChevronRight : faChevronDown} /></span>{g}
  </button>
{/snippet}

{#snippet titleLeft()}<TitleActions side="left" active={globalKind} onopen={(t): void => open(t)} />{/snippet}
{#snippet titleRight()}<TitleActions side="right" active={globalKind} onopen={(t): void => open(t)} />{/snippet}

<Frame {titleLeft} {titleRight}>
  {#if c}
    <aside class="flex flex-col w-[220px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)]">
      <div class="px-2 pt-2 pb-1 shrink-0 border-b border-[var(--pd-global-nav-bg-border)]">
        <SimpleSwitcher selected={c.id} onselect={select} onmanage={(): void => open({ kind: 'settings' })} />
      </div>
      <div class="flex-1 min-h-0 overflow-auto py-1">
        {@render secRow(undefined, 'Overview', faCircleInfo)}
        {#each groups as [g, list] (g)}
          {@render groupHeader(g)}
          {#if !collapsed.includes(g)}
            {#each list as s (s.id)}{@render secRow(s.id, s.label, s.icon, s.count, s.ext?.icon)}{/each}
          {/if}
        {/each}
        {#if pages.length}
          {@render groupHeader('Extensions')}
          {#if !collapsed.includes('Extensions')}
            {#each pages as t (t.id)}
              {@const on = wb.active === targetKey({ kind: 'tool', toolId: t.id })}
              <button
                type="button"
                class="w-full flex items-center gap-2 h-7 pl-6 pr-2 text-left text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
                class:bg-[var(--pd-secondary-nav-selected-bg)]={on}
                class:!text-[var(--pd-secondary-nav-text-selected)]={on}
                onclick={(): void => wb.open({ kind: 'tool', toolId: t.id })}>
                <span class="w-4 flex justify-center"><AppIcon icon={t.icon} size="15px" /></span>
                <span class="flex-1 truncate">{t.name}</span>
              </button>
            {/each}
          {/if}
        {/if}
      </div>
    </aside>
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === HOME ? JSON.stringify(wb.home) : wb.active}<Content target={wb.activeTarget} onopen={open} />{/key}
    </div>
    <BottomPanel sessions={[...PANEL_SESSIONS.slice(0, 2), YAML_SESSION, ...PANEL_SESSIONS.slice(2)]} />
  </div>
</Frame>
