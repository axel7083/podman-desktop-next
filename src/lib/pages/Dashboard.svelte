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
import Label from '#lib/components/Label.svelte';
import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { connectionHome, navigate, STATUS_DOT_CLASS, STATUS_LABEL } from '#lib/nav.ts';
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
const engines = $derived(conns.filter(c => c.kind === 'engine'));
const others = $derived(conns.filter(c => c.kind !== 'engine'));
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
  { id: 'system-overview', label: 'System Overview', enabled: enabledSections.get('system-overview') ?? true, originalOrder: 0 },
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

const cards = $derived(
  registry.dashboardCards
    .filter(c => isOn(`${c.ext.id}:${c.id}`))
    .toSorted((a, b) => (ordering.get(`${a.ext.id}:${a.id}`) ?? 0) - (ordering.get(`${b.ext.id}:${b.id}`) ?? 0)),
);

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
  return `${running} running · ${n.length} containers · ${world.images.filter(i => i.engineId === c.id).length} images`;
}

function toggle(): void {
  expanded = !expanded;
}
</script>

<NavPage searchEnabled={false} title="Dashboard">
  {#snippet additionalActions()}
    <ListOrganizer
      items={sections}
      {ordering}
      title="Configure Dashboard Sections"
      enableReorder={true}
      enableToggle={true}
      onOrderChange={onOrder}
      {onToggle}
      {onReset}
      resetButtonLabel="Reset Layout" />
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col min-w-full grow bg-[var(--pd-content-bg)] py-5">
      <div class="px-5 space-y-5 h-full">
        {#if isOn('system-overview')}
          <div class="flex flex-1 flex-col bg-[var(--pd-content-card-bg)] p-5 rounded-lg">
            <Expandable bind:initialized bind:expanded onclick={toggle}>
              {#snippet title()}
                <span class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">System Overview</span>
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

                <div class="font-semibold text-[var(--pd-content-card-header-text)] pt-3">Container engines:</div>
                <div class="flex flex-col gap-2 pt-2">
                  {#each engines as c (c.id)}
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
                              <span class="font-medium">{c.name}</span>
                              {#if c.version}<span><Label name="{c.providerName} v{c.version}" /></span>{/if}
                              {#if c.hint}<span><Label name={c.hint} /></span>{/if}
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                              <span class="text-sm {c.status === 'started' ? STATUS_TEXT_CLASS.healthy : STATUS_TEXT_CLASS.stable}">{STATUS_LABEL[c.status]}</span>
                              <span class="text-sm text-[var(--pd-content-text-sub)]">
                                – {c.status === 'started' ? counts(c) : 'Required to run containers and pods'}
                              </span>
                            </div>
                          </div>
                          {#if c.status === 'stopped'}
                            <Button type="primary" onclick={start.bind(undefined, c)}>Start</Button>
                          {:else if c.status !== 'started'}
                            <Button type="secondary" inProgress={true}>{STATUS_LABEL[c.status]}</Button>
                          {/if}
                        </div>
                      </div>
                    </Contribution>
                  {/each}
                  {#if others.length}
                    <div class="font-semibold text-[var(--pd-content-card-header-text)]">Kubernetes, VM and service connections:</div>
                    <div class="rounded-lg p-2 bg-[var(--pd-content-card-carousel-card-bg)]">
                      <div class="flex flex-wrap items-center gap-2">
                        {#each others as c (c.id)}
                          <Contribution ext={c.ext} kind="connection" api="P1">
                            <div class="relative flex-shrink-0 inline-flex">
                              <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full {STATUS_DOT_CLASS[c.status]} z-1"></span>
                              <Button type="secondary" onclick={open.bind(undefined, c)} title="Navigate to {c.name}" padding="px-2 py-[3px]">
                                <div class="flex items-center gap-1.5">
                                  <div class="flex-shrink-0 w-7 h-7 flex items-center justify-center"><AppIcon icon={c.icon} size="24px" /></div>
                                  <span class="text-xs whitespace-nowrap">{c.name}</span>
                                </div>
                              </Button>
                            </div>
                          </Contribution>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </Expandable>
          </div>
        {/if}

        {#if registry.dashboardCards.length}
          <div class="flex flex-col gap-3 bg-[var(--pd-content-card-bg)] p-5 rounded-lg" aria-label="Extensions">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">Extensions</span>
              <span class="text-sm text-[var(--pd-content-card-text)]">{cards.length} of {registry.dashboardCards.length} cards shown</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              {#each cards as card (card.ext.id + card.id)}
                <Contribution ext={card.ext} kind="dashboardCard" api="P17">
                  <div class="rounded-lg p-4 bg-[var(--pd-content-card-carousel-card-bg)] h-full">
                    <LazyComponent component={card.component} />
                  </div>
                </Contribution>
              {/each}
            </div>
          </div>
        {:else}
          <EmptyScreen title="No extension cards" message="Extensions can contribute cards to the dashboard." />
        {/if}
      </div>
    </div>
  {/snippet}
</NavPage>
