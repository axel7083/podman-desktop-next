<script lang="ts">
/**
 * Status bar – always dark (data-pd-force-theme="dark" + .dark scope), markup
 * from PD's statusbar/StatusBar.svelte. Left: aggregated connection status
 * with a popover listing every connection (#19219), contributed status items.
 * Right: tasks, notifications, version.
 */
import { faBell, faChevronDown, faChevronRight, faChevronUp, faCircleCheck, faCircleDot, faCircleXmark, faListCheck, faPlay, faStop, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { ProgressBar, Spinner, Tooltip } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import Popover from '#lib/components/Popover.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { connectionHome, GROUPS, navigate, STATUS_DOT_CLASS, startVerb, statusLabel } from '#lib/nav.ts';
import { ui } from '#lib/ui.svelte.ts';
import { cancelTask, startConnection, stopConnection, world } from '#lib/world.svelte.ts';

const conns = $derived(registry.activeConnections);
const running = $derived(conns.filter(c => c.status === 'started'));
const busy = $derived(conns.filter(c => ['starting', 'stopping', 'creating'].includes(c.status)));
const errors = $derived(conns.filter(c => c.status === 'error'));

const summary = $derived.by(() => {
  if (conns.length === 0) return { text: 'No connections', state: 'stopped' };
  if (errors.length) return { text: `${errors.length} connection${errors.length > 1 ? 's' : ''} with errors`, state: 'error' };
  if (busy.length) return { text: `${busy[0].name} ${statusLabel(busy[0]).toLowerCase()}…`, state: 'busy' };
  if (running.length === conns.length) return { text: 'All systems running', state: 'ok' };
  return { text: `${running.length} of ${conns.length} running`, state: 'partial' };
});

const runningTasks = $derived(world.tasks.filter(t => t.status === 'in-progress'));
const unread = $derived(world.notifications.filter(n => !n.read).length);

let popoverAnchor = $state<HTMLButtonElement>();
let notifAnchor = $state<HTMLButtonElement>();
let notifOpen = $state(false);

const left = $derived(registry.statusItems.filter(s => s.align === 'left'));
const right = $derived(registry.statusItems.filter(s => s.align === 'right'));

function togglePopover(): void {
  ui.statusPopoverOpen = !ui.statusPopoverOpen;
}

function closePopover(): void {
  ui.statusPopoverOpen = false;
}

function toggleTasks(): void {
  ui.taskManagerOpen = !ui.taskManagerOpen;
}

function toggleNotifications(): void {
  notifOpen = !notifOpen;
  if (!notifOpen) world.notifications.forEach(n => (n.read = true));
}

function closeNotifications(): void {
  notifOpen = false;
  world.notifications.forEach(n => (n.read = true));
}

function openConnection(c: ConnectionView): void {
  ui.statusPopoverOpen = false;
  navigate(connectionHome(c));
}

function toggleConnection(c: ConnectionView, e: MouseEvent): void {
  e.stopPropagation();
  if (c.status === 'started') stopConnection(c.id, c.name);
  else if (c.status === 'stopped') startConnection(c.id, c.name);
}

function runItemCommand(command: string | undefined): void {
  if (!command) return;
  registry.commands.find(c => c.id === command)?.run();
}

function cancelFirstTask(): void {
  if (runningTasks[0]) cancelTask(runningTasks[0].id);
}

/* Connections popover: groups by kind, collapsible, capped at GROUP_CAP rows */

const GROUP_CAP = 6;
let collapsedGroups = $state<string[]>([]);
let expandedGroups = $state<string[]>([]);

/** Busy / error / running first, stopped last; stable otherwise. */
function rank(c: ConnectionView): number {
  return c.status === 'stopped' || c.status === 'unknown' ? 1 : 0;
}

const popoverGroups = $derived(
  GROUPS.map(g => {
    const list = conns.filter(c => g.kinds.includes(c.kind)).toSorted((a, b) => rank(a) - rank(b));
    const showAll = expandedGroups.includes(g.id) || list.length <= GROUP_CAP + 1;
    return {
      id: g.id,
      label: g.label,
      total: list.length,
      runningCount: list.filter(c => c.status === 'started').length,
      rows: showAll ? list : list.slice(0, GROUP_CAP),
    };
  }).filter(g => g.total > 0),
);

function toggleGroup(id: string): void {
  collapsedGroups = collapsedGroups.includes(id) ? collapsedGroups.filter(x => x !== id) : [...collapsedGroups, id];
}

function showAll(id: string): void {
  expandedGroups = [...expandedGroups, id];
}

function actionLabel(c: ConnectionView): string {
  return `${c.status === 'started' ? 'Stop' : startVerb(c)} ${c.name}`;
}

const statusIcon: Record<string, typeof faCircleCheck> = {
  ok: faCircleCheck,
  partial: faCircleDot,
  stopped: faCircleDot,
  error: faCircleXmark,
};
</script>

<div class="dark contents">
  <div
    class="flex justify-between px-1 h-[24px] shrink-0 bg-[var(--pd-statusbar-bg)] text-[var(--pd-statusbar-text)] text-sm space-x-2 z-40"
    role="contentinfo"
    aria-label="Status Bar"
    data-pd-force-theme="dark">
    <div class="flex flex-nowrap gap-x-1.5 h-full text-ellipsis whitespace-nowrap">
      <button
        bind:this={popoverAnchor}
        class="px-1 py-px flex h-full items-center gap-1.5 hover:bg-[var(--pd-statusbar-hover-bg)]"
        aria-label="Connections status"
        aria-expanded={ui.statusPopoverOpen}
        onclick={togglePopover}>
        {#if summary.state === 'busy'}
          <Spinner size="11px" />
        {:else}
          <Icon
            icon={statusIcon[summary.state]}
            class={summary.state === 'ok' ? 'text-[var(--pd-status-running)]' : summary.state === 'error' ? 'text-[var(--pd-status-terminated)]' : ''} />
        {/if}
        <span>{summary.text}</span>
        <Icon icon={faChevronUp} size="xs" />
      </button>
      {#each left as item (item.ext.id + item.id)}
        <Contribution ext={item.ext} kind="statusItem" api="P17" class="h-full flex">
          <button
            class="px-1 py-px flex h-full items-center gap-1 hover:bg-[var(--pd-statusbar-hover-bg)]"
            title={item.tooltip}
            onclick={runItemCommand.bind(undefined, item.command)}>
            {#if item.icon}<AppIcon icon={item.icon} size="12px" />{/if}
            <span>{item.text(world)}</span>
          </button>
        </Contribution>
      {/each}
    </div>
    <div class="flex flex-row-reverse gap-x-1.5 h-full place-self-end items-center">
      <span class="px-1" title="Podman Desktop next (mockup)">v2.0.0-next</span>
      <button
        bind:this={notifAnchor}
        class="relative px-1 py-px flex h-full items-center hover:bg-[var(--pd-statusbar-hover-bg)]"
        title="Notifications"
        aria-label="Notifications"
        onclick={toggleNotifications}>
        <Icon icon={faBell} />
        {#if unread}
          <span role="status" class="absolute bg-[var(--pd-notification-dot)] rounded-full p-1 top-[1px] right-[-1px]"></span>
        {/if}
      </button>
      <button
        class="px-1 py-px flex h-full items-center gap-1 hover:bg-[var(--pd-statusbar-hover-bg)]"
        title="Tasks"
        aria-label="Toggle Task Manager"
        onclick={toggleTasks}>
        <Icon icon={faListCheck} />
        {#if runningTasks.length}<span>{runningTasks.length}</span>{/if}
      </button>
      {#if runningTasks.length > 0}
        <div class="flex items-center">
          <Tooltip top tip={runningTasks[0].name}>
            <button aria-label="Toggle Task Manager" onclick={toggleTasks}>
              <div class="flex items-center gap-x-2">
                <span role="status" class="max-w-40 text-ellipsis overflow-hidden whitespace-nowrap">{runningTasks[0].name}</span>
                <ProgressBar class="items-center" height="h-1" width="w-20" progress={runningTasks[0].progress} />
              </div>
            </button>
          </Tooltip>
          <button class="cursor-pointer ml-1" onclick={cancelFirstTask} aria-label="Cancel task {runningTasks[0].name}" title="Cancel task">
            <Icon size="0.750x" icon={faTimesCircle} />
          </button>
        </div>
      {/if}
      {#each right as item (item.ext.id + item.id)}
        <Contribution ext={item.ext} kind="statusItem" api="P17" class="h-full flex">
          <button class="px-1 py-px flex h-full items-center gap-1 hover:bg-[var(--pd-statusbar-hover-bg)]" title={item.tooltip} onclick={runItemCommand.bind(undefined, item.command)}>
            {#if item.icon}<AppIcon icon={item.icon} size="12px" />{/if}
            <span>{item.text(world)}</span>
          </button>
        </Contribution>
      {/each}
    </div>
  </div>
</div>

<Popover open={ui.statusPopoverOpen} anchor={popoverAnchor} placement="top-start" surface="modal" onclose={closePopover} class="w-[340px] py-2 text-[var(--pd-modal-text)]">
  <div class="px-3 pb-2 flex items-center justify-between">
    <span class="font-semibold text-[var(--pd-modal-header-text)]">Connections</span>
    <span class="text-xs text-[var(--pd-table-body-text)]">{running.length} of {conns.length} running</span>
  </div>
  <div class="max-h-[60vh] overflow-y-auto">
    {#each popoverGroups as g (g.id)}
      {@const collapsed = collapsedGroups.includes(g.id)}
      <section aria-label={g.label}>
        <button
          class="w-full flex items-center gap-1.5 px-3 pt-2 pb-1 text-[11px] font-semibold text-[var(--pd-nav-group-header)] hover:text-[var(--pd-modal-header-text)]"
          aria-expanded={!collapsed}
          onclick={toggleGroup.bind(undefined, g.id)}>
          <span class="w-3"><Icon icon={collapsed ? faChevronRight : faChevronDown} size="xs" /></span>
          <span>{g.label}</span>
          <span class="font-normal">({g.total})</span>
          <span class="ml-auto font-normal">{g.runningCount} running</span>
        </button>
        {#if !collapsed}
          {#each g.rows as c (c.id)}
            {@const busyRow = ['starting', 'stopping', 'creating'].includes(c.status)}
            <div class="flex items-center gap-2 px-3 py-1 hover:bg-[var(--pd-modal-dropdown-highlight)]">
              <button class="flex items-center gap-2 grow min-w-0 text-left" title={c.name} onclick={openConnection.bind(undefined, c)}>
                <AppIcon icon={c.icon} size="16px" />
                <span class="truncate">{c.name}</span>
                {#if c.hint}<span class="text-[9px] uppercase rounded-sm px-1 bg-[var(--pd-nav-hint-bg)] text-[var(--pd-nav-hint-text)]">{c.hint}</span>{/if}
              </button>
              <!-- status: dot + neutral text; colour lives in the dot only -->
              <span class="shrink-0 text-xs flex items-center gap-1.5 text-[var(--pd-table-body-text)]">
                {#if busyRow}<Spinner size="10px" />{:else}<span class="w-2 h-2 rounded-full {STATUS_DOT_CLASS[c.status] ?? ''}" aria-hidden="true"></span>{/if}
                {statusLabel(c)}
              </span>
              {#if c.status === 'started' || c.status === 'stopped'}
                <button
                  class="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--pd-button-icon-text)] hover:text-[var(--pd-button-icon-hover-text)] hover:bg-[var(--pd-button-icon-bg)] focus-visible:outline-2 focus-visible:outline-[var(--pd-button-primary-bg)]"
                  title={actionLabel(c)}
                  aria-label={actionLabel(c)}
                  onclick={toggleConnection.bind(undefined, c)}>
                  <Icon icon={c.status === 'started' ? faStop : faPlay} size="xs" />
                </button>
              {:else}
                <span class="w-6 shrink-0"></span>
              {/if}
            </div>
          {/each}
          {#if g.rows.length < g.total}
            <button class="px-3 py-1 pl-[34px] text-xs text-[var(--pd-link)] hover:underline" onclick={showAll.bind(undefined, g.id)}>
              Show all {g.total}
            </button>
          {/if}
        {/if}
      </section>
    {/each}
  </div>
</Popover>

<Popover open={notifOpen} anchor={notifAnchor} placement="top-end" surface="modal" onclose={closeNotifications} class="w-[360px] py-2 text-[var(--pd-modal-text)]">
  <div class="px-3 pb-2 font-semibold text-[var(--pd-modal-header-text)]">Notifications</div>
  {#if world.notifications.length === 0}
    <div class="px-3 py-4 text-[var(--pd-table-body-text)]">No notifications</div>
  {/if}
  <div class="max-h-[50vh] overflow-y-auto">
    {#each world.notifications as n (n.id)}
      <div class="px-3 py-2 border-t border-[var(--pd-content-divider)]">
        <div class="font-semibold" class:text-[var(--pd-state-error)]={n.type === 'error'}>{n.title}</div>
        <div class="text-[var(--pd-content-text)]">{n.body}</div>
      </div>
    {/each}
  </div>
</Popover>
