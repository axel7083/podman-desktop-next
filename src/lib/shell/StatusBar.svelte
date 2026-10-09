<script lang="ts">
/**
 * Status bar – always dark (data-pd-force-theme="dark" + .dark scope), markup
 * from PD's statusbar/StatusBar.svelte. Left: aggregated connection status
 * with a popover listing every connection (#19219), contributed status items.
 * Right: tasks, notifications, version. A running task is shown once as a
 * toast plus the task counter (no duplicate progress item here), and the
 * aggregate text stays stable while connections start (spinner only).
 * Contributed items beyond STATUS_ITEM_CAP collapse into a "⋯" overflow
 * (docs/ia.md "Status bar").
 */
import { faBell, faChevronDown, faChevronRight, faChevronUp, faCircleCheck, faCircleDot, faCircleXmark, faEllipsis, faListCheck } from '@fortawesome/free-solid-svg-icons';
import { faCirclePlay, faCircleStop } from '@fortawesome/free-regular-svg-icons';
import { Spinner, Tooltip } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import HintChip from '#lib/components/HintChip.svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import MenuItem from '#lib/components/MenuItem.svelte';
import Popover from '#lib/components/Popover.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, Contributed, StatusItemDef } from '#lib/ext/types.ts';
import { connectionHome, GROUPS, navigate, STATUS_DOT_CLASS, startVerb, statusLabel } from '#lib/nav.ts';
import { ui } from '#lib/ui.svelte.ts';
import { startConnection, stopConnection, world } from '#lib/world.svelte.ts';

const conns = $derived(registry.activeConnections);
const running = $derived(conns.filter(c => c.status === 'started'));
const busy = $derived(conns.filter(c => ['starting', 'stopping', 'creating'].includes(c.status)));
const errors = $derived(conns.filter(c => c.status === 'error'));

const summary = $derived.by(() => {
  if (conns.length === 0) return { text: 'No connections', state: 'stopped' };
  if (errors.length) return { text: `${errors.length} connection${errors.length > 1 ? 's' : ''} with errors`, state: 'error' };
  // stable text while something starts/connects: the spinner carries the state, the popover has the details
  if (busy.length) return { text: `${running.length} of ${conns.length} running`, state: 'busy', tooltip: busy.map(c => `${c.name}: ${statusLabel(c).toLowerCase()}`).join('\n') };
  if (running.length === conns.length) return { text: 'All systems running', state: 'ok' };
  return { text: `${running.length} of ${conns.length} running`, state: 'partial' };
});

const runningTasks = $derived(world.tasks.filter(t => t.status === 'in-progress'));
const tasksTitle = $derived(runningTasks.length ? runningTasks.map(t => t.name).join('\n') : 'Tasks');
const unread = $derived(world.notifications.filter(n => !n.read).length);

let popoverAnchor = $state<HTMLButtonElement>();
let notifAnchor = $state<HTMLButtonElement>();
let notifOpen = $state(false);

/** Contributed items shown inline; the rest go to the "More status items" overflow. */
const STATUS_ITEM_CAP = 3;
const shownItems = $derived(registry.statusItems.slice(0, STATUS_ITEM_CAP));
const overflowItems = $derived(registry.statusItems.slice(STATUS_ITEM_CAP));
const left = $derived(shownItems.filter(s => s.align === 'left'));
const right = $derived(shownItems.filter(s => s.align === 'right'));

let overflowAnchor = $state<HTMLButtonElement>();
let overflowOpen = $state(false);

function toggleOverflow(): void {
  overflowOpen = !overflowOpen;
}

function closeOverflow(): void {
  overflowOpen = false;
}

function runOverflowItem(item: Contributed<StatusItemDef>): void {
  overflowOpen = false;
  runItemCommand(item.command);
}

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
        <span title={summary.tooltip}>{summary.text}</span>
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
      <!-- tasks: counter only (the progress toast already names the task); a spinner while tasks run -->
      <button
        class="px-1 py-px flex h-full items-center gap-1 hover:bg-[var(--pd-statusbar-hover-bg)]"
        title={tasksTitle}
        aria-label="Toggle Task Manager"
        onclick={toggleTasks}>
        {#if runningTasks.length}<Spinner size="11px" />{:else}<Icon icon={faListCheck} />{/if}
        {#if runningTasks.length}<span role="status" aria-label="{runningTasks.length} running tasks">{runningTasks.length}</span>{/if}
      </button>
      {#if overflowItems.length}
        <button
          bind:this={overflowAnchor}
          class="px-1 py-px flex h-full items-center gap-1 hover:bg-[var(--pd-statusbar-hover-bg)]"
          title="More status items ({overflowItems.length})"
          aria-label="More status items"
          aria-expanded={overflowOpen}
          onclick={toggleOverflow}>
          <Icon icon={faEllipsis} />
          <span>{overflowItems.length}</span>
        </button>
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
                {#if c.hint}<HintChip hint={c.hint} />{/if}
              </button>
              <!-- status: dot + neutral text; colour lives in the dot only -->
              <span class="shrink-0 text-xs flex items-center gap-1.5 text-[var(--pd-table-body-text)]">
                {#if busyRow}<Spinner size="10px" />{:else}<span class="w-2 h-2 rounded-full {STATUS_DOT_CLASS[c.status] ?? ''}" aria-hidden="true"></span>{/if}
                {statusLabel(c)}
              </span>
              {#if c.status === 'started' || c.status === 'stopped'}
                <!-- labelled icon button: round play/stop glyph in secondary text, hover background, tooltip names the action -->
                <Tooltip left tip={actionLabel(c)}>
                  <button
                    class="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[var(--pd-content-card-text)] opacity-80 hover:opacity-100 hover:bg-[var(--pd-content-bg)] focus-visible:outline-2 focus-visible:outline-[var(--pd-button-primary-bg)]"
                    aria-label={actionLabel(c)}
                    onclick={toggleConnection.bind(undefined, c)}>
                    <Icon icon={c.status === 'started' ? faCircleStop : faCirclePlay} class="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
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

<Popover open={overflowOpen} anchor={overflowAnchor} placement="top-end" onclose={closeOverflow} class="w-64 py-1">
  <div class="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-[var(--pd-nav-group-header)]">More status items</div>
  {#each overflowItems as item (item.ext.id + item.id)}
    <Contribution ext={item.ext} kind="statusItem" api="P17">
      <MenuItem dense title={item.text(world)} icon={item.icon ?? item.ext.icon} detail={item.ext.displayName} onclick={runOverflowItem.bind(undefined, item)} />
    </Contribution>
  {/each}
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
