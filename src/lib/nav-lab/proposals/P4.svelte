<script lang="ts">
/**
 * P4 Kind-first: rail of resource kinds like today's PD; lists span every
 * connection with a connection scope bar (multi-select chips) and a
 * Connection column; opened items become tabs with a provider badge.
 */
import { faCheck, faChevronDown, faToolbox } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import DashboardIcon from '#lib/images/DashboardIcon.svelte';

import { CONNECTIONS, connectionsForKind, KINDS, type LabTarget, PANEL_SESSIONS, RESOURCES, TOOLS } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import AppFrame from '../ui/AppFrame.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import Rail from '../ui/Rail.svelte';
import TabStrip from '../ui/TabStrip.svelte';
import { BOTTOM_ITEMS, PINNED_TOOLS } from './shared.ts';

const wb = new Workbench();
let railSel = $state('containers');
let scope = $state<string[]>([]);
let moreOpen = $state(false);
wb.home = { kind: 'kind', kindId: 'containers' };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  ...KINDS.map(k => ({ id: k.id, label: k.label, icon: k.icon, group: k.group === 'main' ? 'Resources' : 'Platform' })),
  ...TOOLS.filter(t => PINNED_TOOLS.includes(t.id)).map(t => ({ id: `tool:${t.id}`, label: t.name, icon: t.icon, group: 'Tools' })),
  { id: 'tools', label: `All tools (${TOOLS.length})`, icon: faToolbox, group: 'Tools' },
];

const kind = $derived(KINDS.find(k => k.id === (wb.home?.kindId ?? railSel)));
const kindConns = $derived(kind ? connectionsForKind(kind) : []);
/** Kubernetes kind: sub-nav of resource types (core + contributed). */
const kubeSections = $derived.by(() => {
  if (kind?.id !== 'kubernetes') return [];
  const out: { id: string; label: string; icon: unknown; ext?: string; count: number }[] = [];
  for (const id of kind.sections) {
    const sec = CONNECTIONS.flatMap(c => c.sections).find(s => s.id === id);
    if (sec) out.push({ id, label: sec.label, icon: sec.icon, ext: sec.ext?.icon, count: RESOURCES.filter(r => r.sectionId === id && (scope.length === 0 || scope.includes(r.connId))).length });
  }
  return out;
});

function onrail(id: string): void {
  railSel = id;
  if (id.startsWith('tool:')) {
    wb.open({ kind: 'tool', toolId: id.slice(5) });
    return;
  }
  if (KINDS.some(k => k.id === id)) {
    scope = [];
    wb.goHome({ kind: 'kind', kindId: id, sectionId: id === 'kubernetes' ? 'deployments' : undefined });
    return;
  }
  if (id === 'dashboard' || id === 'tools') {
    wb.goHome({ kind: id });
    return;
  }
  wb.open({ kind: id as LabTarget['kind'] });
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list') {
    const k = KINDS.find(x => x.sections.includes(t.sectionId ?? ''));
    if (k) {
      railSel = k.id;
      scope = t.connId ? [t.connId] : [];
      wb.goHome({ kind: 'kind', kindId: k.id, sectionId: k.id === 'kubernetes' ? t.sectionId : undefined });
      return;
    }
  }
  wb.open(t, opts);
}

function toggleScope(id: string): void {
  scope = scope.includes(id) ? scope.filter(x => x !== id) : [...scope, id];
}

const VISIBLE_CHIPS = 6;
</script>

{#snippet chip(id: string | undefined, label: string, count: number)}
  {@const on = id ? scope.includes(id) : scope.length === 0}
  <button
    type="button"
    aria-pressed={on}
    class="flex items-center gap-1.5 h-6 pl-1.5 pr-2 rounded-full border text-sm whitespace-nowrap"
    class:border-[var(--pd-tab-highlight)]={on}
    class:bg-[var(--pd-content-card-selected-bg)]={on}
    class:text-[var(--pd-tab-text-highlight)]={on}
    class:border-[var(--pd-content-divider)]={!on}
    onclick={(): void => {
      if (id) toggleScope(id);
      else scope = [];
    }}>
    {#if id}<ConnIcon connId={id} size={14} ring="var(--pd-content-bg)" />{:else if on}<AppIcon icon={faCheck} size="xs" />{/if}
    {label}<span class="opacity-60">{count}</span>
  </button>
{/snippet}

{#snippet scopeBar()}
  {#if kind}
    <div class="flex items-center gap-1.5 flex-wrap">
      {@render chip(undefined, 'All connections', kindConns.length)}
      {#each kindConns.slice(0, VISIBLE_CHIPS) as c (c.id)}
        {@render chip(c.id, c.name, RESOURCES.filter(r => r.connId === c.id && kind.sections.includes(r.sectionId)).length)}
      {/each}
      {#if kindConns.length > VISIBLE_CHIPS}
        <div class="relative">
          <button type="button" class="flex items-center gap-1 h-6 px-2 rounded-full border border-[var(--pd-content-divider)] text-sm" onclick={(): void => { moreOpen = !moreOpen; }}>
            +{kindConns.length - VISIBLE_CHIPS} more <AppIcon icon={faChevronDown} size="xs" />
          </button>
          {#if moreOpen}
            <div class="absolute left-0 top-full mt-1 w-60 rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-xl py-1 z-50">
              {#each kindConns.slice(VISIBLE_CHIPS) as c (c.id)}
                <button type="button" class="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => toggleScope(c.id)}>
                  <input type="checkbox" checked={scope.includes(c.id)} tabindex="-1" />
                  <ConnIcon connId={c.id} size={14} ring="var(--pd-dropdown-bg)" />{c.name}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

<AppFrame>
  <Rail mode={lab.rail} selected={railSel} onselect={onrail} {items} bottom={BOTTOM_ITEMS} label="Resource kinds" />
  {#if kind?.id === 'kubernetes' && wb.active === HOME}
    <aside class="flex flex-col w-[188px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)] overflow-auto pt-2">
      <div class="px-3 pb-1 text-sm font-semibold text-[var(--pd-nav-group-header)]">Kubernetes</div>
      {#each kubeSections as s (s.id)}
        {@const sel = wb.home?.sectionId === s.id}
        <button
          type="button"
          class="w-full flex items-center gap-2 h-8 pl-3 pr-2 text-left border-l-[3px] text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
          class:border-l-[var(--pd-secondary-nav-selected-highlight)]={sel}
          class:bg-[var(--pd-secondary-nav-selected-bg)]={sel}
          class:border-l-transparent={!sel}
          onclick={(): void => wb.goHome({ kind: 'kind', kindId: 'kubernetes', sectionId: s.id })}>
          <span class="w-4 flex justify-center" style:font-size="14px"><AppIcon icon={s.icon as never} size="16px" /></span>
          <span class="flex-1 truncate">{s.label}</span>
          {#if s.ext}<AppIcon icon={s.ext} size="12px" />{/if}
          <span class="text-sm opacity-60">{s.count}</span>
        </button>
      {/each}
    </aside>
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === HOME ? JSON.stringify(wb.home) : wb.active}<Content target={wb.activeTarget} onopen={open} {scope} {scopeBar} />{/key}
    </div>
    <BottomPanel sessions={PANEL_SESSIONS} />
  </div>
</AppFrame>
