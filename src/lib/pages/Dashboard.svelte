<script lang="ts">
/**
 * Dashboard – PD's DashboardPage (NavPage + ListOrganizer) with the System
 * Overview card (every connection, #17991) and a configurable "Extensions"
 * section holding contributed dashboard cards (docs/ia.md rule 5, P17).
 */
import { faChevronRight, faCircleCheck, faCircleExclamation, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, Expandable, ListOrganizer, type ListOrganizerItem, NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { SvelteMap } from 'svelte/reactivity';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import HintChip from '#lib/components/HintChip.svelte';
import Label from '#lib/components/Label.svelte';
import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { connectionHome, navigate, startVerb, STATUS_DOT_CLASS, statusLabel } from '#lib/nav.ts';
import { plural } from '#lib/util.ts';
import { startConnection, world } from '#lib/world.svelte.ts';

const STATUS_TEXT_CLASS: Record<string, string> = {
  healthy: 'text-[var(--pd-status-running)]',
  stable: 'text-[var(--pd-status-stopped)]',
  progressing: 'text-[var(--pd-status-starting)]',
  critical: 'text-[var(--pd-status-terminated)]',
};
const STATUS_BG_CLASS: Record<string, string> = {
  healthy: 'bg-[var(--pd-status-running-bg)]',
  stable: 'bg-[var(--pd-status-stopped-bg)]',
  progressing: 'bg-[var(--pd-status-starting-bg)]',
  critical: 'bg-[var(--pd-status-terminated-bg)]',
};

const conns = $derived(registry.activeConnections);
/** Scaling: running engines first (stable order inside), capped with "Show all". */
const ENGINE_CAP = 6;
const CHIP_CAP = 10;
const CARD_CAP = 4;
const engines = $derived(conns.filter(c => c.kind === 'engine').toSorted((a, b) => Number(a.status !== 'started') - Number(b.status !== 'started')));
const otherGroups = $derived(
  [
    { id: 'kubernetes', label: 'Kubernetes', list: conns.filter(c => c.kind === 'kubernetes') },
    { id: 'vms', label: 'VMs & services', list: conns.filter(c => c.kind === 'vm' || c.kind === 'service') },
  ].filter(g => g.list.length),
);
let allEngines = $state(false);
let allChips = $state<string[]>([]);
let allCards = $state(false);
const shownEngines = $derived(allEngines || engines.length <= ENGINE_CAP + 1 ? engines : engines.slice(0, ENGINE_CAP));

function toggleEngines(): void {
  allEngines = !allEngines;
}

function toggleChips(id: string): void {
  allChips = allChips.includes(id) ? allChips.filter(x => x !== id) : [...allChips, id];
}

function toggleCards(): void {
  allCards = !allCards;
}
const overall = $derived.by(() => {
  if (conns.some(c => c.status === 'error')) return { status: 'critical', text: 'Some connections need attention', icon: faCircleExclamation };
  if (conns.some(c => ['starting', 'stopping', 'creating'].includes(c.status))) return { status: 'progressing', text: 'Connections are changing state', icon: faCircleInfo };
  const running = conns.filter(c => c.status === 'started').length;
  if (running === conns.length) return { status: 'healthy', text: 'All systems are running', icon: faCircleCheck };
  return { status: 'stable', text: `${running} of ${conns.length} connections running`, icon: faCircleInfo };
});

let expanded = $state(true);
let initialized = $state(true);
const enabledSections = new SvelteMap<string, boolean>();
let ordering = $state(new SvelteMap<string, number>());

const sections: ListOrganizerItem[] = $derived([
  { id: 'system-overview', label: 'System overview', enabled: enabledSections.get('system-overview') ?? true, originalOrder: 0 },
  ...registry.dashboardCards.map((c, i) => ({ id: `${c.ext.id}:${c.id}`, label: `${c.title} (${c.ext.displayName})`, enabled: enabledSections.get(`${c.ext.id}:${c.id}`) ?? true, originalOrder: i + 1 })),
]);

function isOn(id: string): boolean {
  return enabledSections.get(id) ?? true;
}

function onToggle(id: string, enabled: boolean): void {
  enabledSections.set(id, enabled);
}

function onOrder(next: SvelteMap<string, number>): void {
  ordering = next;
}

function onReset(): void {
  enabledSections.clear();
  ordering = new SvelteMap();
}

const allEnabledCards = $derived(
  registry.dashboardCards
    .filter(c => isOn(`${c.ext.id}:${c.id}`))
    .toSorted((a, b) => (ordering.get(`${a.ext.id}:${a.id}`) ?? 0) - (ordering.get(`${b.ext.id}:${b.id}`) ?? 0)),
);
// compact one-line cards (update notices) sit above the grid and never use a capped slot
const compactCards = $derived(allEnabledCards.filter(c => c.compact));
const gridCards = $derived(allEnabledCards.filter(c => !c.compact));
const cards = $derived(allCards || gridCards.length <= CARD_CAP + 1 ? gridCards : gridCards.slice(0, CARD_CAP));

function open(c: ConnectionView): void {
  navigate(connectionHome(c));
}

function start(c: ConnectionView): void {
  startConnection(c.id, c.name);
}

function goResources(): void {
  navigate('/settings/resources');
}

function counts(c: ConnectionView): string {
  const n = world.containers.filter(x => x.engineId === c.id);
  const running = n.filter(x => x.state === 'RUNNING').length;
  return `${running} of ${plural(n.length, 'container')} running · ${plural(world.images.filter(i => i.engineId === c.id).length, 'image')}`;
}

let organizer = $state<HTMLDivElement>();

/** "Customize" does what the header pencil does: opens the ListOrganizer dropdown. */
function customize(): void {
  // after this click has finished bubbling, so ListOrganizer's outside-click handler doesn't close it again
  requestAnimationFrame(() => {
    const pencil = organizer?.querySelector('button');
    pencil?.scrollIntoView({ block: 'nearest' });
    pencil?.click();
  });
}

function toggle(): void {
  expanded = !expanded;
}
</script>

<NavPage searchEnabled={false} title="Dashboard">
  {#snippet additionalActions()}
    <div class="contents" bind:this={organizer}>
    <ListOrganizer
      items={sections}
      {ordering}
      title="Configure dashboard sections"
      enableReorder={true}
      enableToggle={true}
      onOrderChange={onOrder}
      {onToggle}
      {onReset}
      resetButtonLabel="Reset layout" />
    </div>
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col min-w-full grow bg-[var(--pd-content-bg)] py-5">
      <div class="px-5 space-y-5 h-full">
        {#if isOn('system-overview')}
          <div class="flex flex-1 flex-col bg-[var(--pd-content-card-bg)] p-5 rounded-lg">
            <Expandable bind:initialized bind:expanded onclick={toggle}>
              {#snippet title()}
                <span class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">System overview</span>
              {/snippet}
              <div class="pt-2" aria-label="System Overview">
                <button
                  class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-transparent {STATUS_BG_CLASS[overall.status]} {STATUS_TEXT_CLASS[overall.status]}"
                  aria-label="System Overview - Overall status"
                  onclick={goResources}>
                  <Icon icon={overall.icon} size="lg" />
                  <span class="text-sm leading-none">{overall.text}</span>
                  <Icon icon={faChevronRight} size="sm" />
                </button>

                <div class="font-semibold text-[var(--pd-content-card-header-text)] pt-3">Engines ({engines.length})</div>
                <div class="flex flex-col gap-2 pt-2">
                  <div class="grid grid-cols-2 gap-2" aria-label="Engines">
                  {#each shownEngines as c (c.id)}
                    <Contribution ext={c.ext} kind="connection" api="P1">
                      <div class="flex flex-col gap-3 rounded-lg p-2 bg-[var(--pd-content-card-carousel-card-bg)]">
                        <div class="flex flex-row items-center gap-3">
                          <div class="relative flex-shrink-0 inline-flex">
                            <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full {STATUS_DOT_CLASS[c.status]} z-1"></span>
                            <button
                              class="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-carousel-card-hover-bg)]"
                              aria-label="Navigate to {c.name}"
                              title="Navigate to {c.name}"
                              onclick={open.bind(undefined, c)}>
                              <AppIcon icon={c.icon} size="28px" />
                            </button>
                          </div>
                          <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                            <div class="flex items-center gap-2 text-[var(--pd-content-card-text)] [--pd-label-bg:var(--pd-content-card-bg)] [--pd-label-text:var(--pd-content-text-sub)]">
                              <span class="font-medium truncate" title={c.name}>{c.name}</span>
                              {#if c.version}<span><Label name="{c.providerName} v{c.version}" /></span>{/if}
                              {#if c.hint}<HintChip hint={c.hint} tooltip={c.hintTooltip} />{/if}
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                              <span class="text-sm {c.status === 'started' ? STATUS_TEXT_CLASS.healthy : STATUS_TEXT_CLASS.stable}">{statusLabel(c)}</span>
                              <span class="text-sm text-[var(--pd-content-text-sub)] truncate">
                                · {c.status === 'started' ? counts(c) : 'Required to run containers and pods'}
                              </span>
                            </div>
                          </div>
                          {#if c.status === 'stopped'}
                            <Button type="primary" onclick={start.bind(undefined, c)}>{startVerb(c)}</Button>
                          {:else if c.status !== 'started'}
                            <Button type="secondary" inProgress={true}>{statusLabel(c)}</Button>
                          {/if}
                        </div>
                      </div>
                    </Contribution>
                  {/each}
                  </div>
                  {#if engines.length > shownEngines.length || allEngines}
                    <Button type="link" padding="px-0 py-0" class="self-start" onclick={toggleEngines}>
                      {allEngines ? 'Show running engines first' : `Show all ${engines.length} engines`}
                    </Button>
                  {/if}
                  {#each otherGroups as g (g.id)}
                    {@const all = allChips.includes(g.id)}
                    {@const list = all || g.list.length <= CHIP_CAP + 1 ? g.list : g.list.slice(0, CHIP_CAP)}
                    <div class="font-semibold text-[var(--pd-content-card-header-text)] pt-1">{g.label} ({g.list.length})</div>
                    <div class="flex flex-wrap items-center gap-2" aria-label="{g.label} connections">
                      {#each list as c (c.id)}
                        <Contribution ext={c.ext} kind="connection" api="P1">
                          <button
                            class="relative flex items-center gap-1.5 rounded-md pl-1.5 pr-2.5 py-1 text-sm text-[var(--pd-content-card-text)] bg-[var(--pd-content-card-carousel-card-bg)] hover:bg-[var(--pd-content-card-carousel-card-hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--pd-button-primary-bg)]"
                            onclick={open.bind(undefined, c)}
                            aria-label="Navigate to {c.name}"
                            title="{c.name} · {statusLabel(c)} · {c.providerName}">
                            <span class="relative w-5 h-5 flex items-center justify-center shrink-0">
                              <AppIcon icon={c.icon} size="18px" />
                              <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full {STATUS_DOT_CLASS[c.status]}"></span>
                            </span>
                            <span class="whitespace-nowrap" class:opacity-60={c.status !== 'started'}>{c.name}</span>
                          </button>
                        </Contribution>
                      {/each}
                      {#if g.list.length > list.length || all}
                        <Button type="link" padding="px-1 py-0" onclick={toggleChips.bind(undefined, g.id)}>{all ? 'Show less' : `+${g.list.length - list.length} more`}</Button>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            </Expandable>
          </div>
        {/if}

        {#if registry.dashboardCards.length}
          <div class="flex flex-col gap-3 bg-[var(--pd-content-card-bg)] p-5 rounded-lg" aria-label="Extensions">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">Extensions</span>
              <Button type="link" padding="px-1 py-0" title="Choose and reorder dashboard sections" onclick={customize}>Customize</Button>
            </div>
            {#each compactCards as card (card.ext.id + card.id)}
              <Contribution ext={card.ext} kind="dashboardCard" api="P17">
                <div class="rounded-lg px-4 py-2 bg-[var(--pd-content-card-carousel-card-bg)]">
                  <LazyComponent component={card.component} />
                </div>
              </Contribution>
            {/each}
            <div class="grid grid-cols-2 gap-3">
              {#each cards as card (card.ext.id + card.id)}
                <Contribution ext={card.ext} kind="dashboardCard" api="P17">
                  <div class="rounded-lg p-4 bg-[var(--pd-content-card-carousel-card-bg)] h-full">
                    <LazyComponent component={card.component} />
                  </div>
                </Contribution>
              {/each}
            </div>
            {#if gridCards.length > cards.length || allCards}
              <Button type="secondary" class="self-center" onclick={toggleCards}>
                {allCards ? 'Show fewer cards' : `Show ${gridCards.length - cards.length} more cards`}
              </Button>
            {/if}
          </div>
        {:else}
          <EmptyScreen title="No extension cards" message="Extensions can contribute cards to the dashboard." />
        {/if}
      </div>
    </div>
  {/snippet}
</NavPage>
