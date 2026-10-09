<script lang="ts" module>
import { conn as findConn, type LabTarget, type PanelSession, RESOURCES, resource, section as findSection } from '../data.ts';
import { connStatus, live, resStatus } from '../r3/live.svelte.ts';
import type { IconRef } from '#lib/ext/types.ts';

export interface SessionSource {
  name: string;
  icon: IconRef | undefined;
  target: LabTarget | undefined;
  status: string | undefined;
}

/** Resource a session comes from (explicit target, else matched by name, else its connection). */
export function sessionSource(s: PanelSession): SessionSource {
  const c = findConn(s.connId);
  let target = s.target;
  let icon = s.icon;
  if (!target) {
    const name = s.title.replace(/ (logs|\(tty\))$/, '').replace(/^(ssh |oc rsh )/, '');
    const r = RESOURCES.find(x => x.connId === s.connId && x.name === name);
    if (r) {
      const sec = findSection(c, r.sectionId);
      target = { kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id };
      icon ??= sec?.ext?.icon ?? sec?.icon;
    } else {
      target = { kind: 'connection', connId: s.connId };
      icon ??= c?.icon;
    }
  }
  let status: string | undefined;
  let name = s.title;
  if (target.kind === 'resource') {
    const r = resource(target.resId);
    if (r) {
      status = resStatus(r);
      name = r.name;
    }
  } else if (target.kind === 'node' && target.nodeId) status = live.status[target.nodeId] ?? 'running';
  else if (target.kind === 'connection') {
    status = connStatus(c);
    if (s.title.startsWith('kubectl') || s.title.startsWith('ssh')) name = c?.name ?? s.title;
  }
  return { name, icon, target, status };
}
</script>

<script lang="ts">
/**
 * One bottom-panel pane (logs or terminal). A compact single toolbar row:
 * resource chip (kind icon, name, status: opens / focuses the resource tab)
 * and connection chip (provider icon, name: opens the connection Overview),
 * rule F25; then for logs: time range, level, follow, timestamps, wrap,
 * find (Ctrl+F), download, clear. Logs and terminals offer "Ask Lightspeed"
 * (inline on error lines, right-click menu, failed-command row); chat
 * sessions render the RHEL Lightspeed chat.
 */
import {
  faAnglesDown,
  faBan,
  faChevronDown,
  faClock,
  faCopy,
  faDownload,
  faMagnifyingGlass,
  faTextHeight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { STATUS_DOT } from '../data.ts';
import CodeView from '../r3/CodeView.svelte';
import { askLabel, askLightspeed, clearChat, ERROR_LINE, failedBlocks, lastFailed, LS_ICON } from '../r3/lightspeed.svelte.ts';
import { type MenuItem, openMenu } from '../r3/live.svelte.ts';
import ConnIcon from './ConnIcon.svelte';
import LabIcon from './LabIcon.svelte';
import LightspeedChat from './LightspeedChat.svelte';

interface Props {
  session: PanelSession;
  active: boolean;
  /** Split: show a close-pane button. */
  closable?: boolean;
  onclose?: () => void;
  onfocus?: () => void;
  onopen?: (t: LabTarget, o: { preview?: boolean }) => void;
}

let { session, active, closable = false, onclose, onfocus, onopen }: Props = $props();

const src = $derived(sessionSource(session));
const c = $derived(findConn(session.connId));

const RANGES: [string, string][] = [
  ['live', 'Live'],
  ['5m', 'Last 5 minutes'],
  ['1h', 'Last hour'],
  ['24h', 'Last 24 hours'],
];
let range = $state('live');
let since = $state('2026-10-09T09:00');
let until = $state('2026-10-09T10:00');
let rangeOpen = $state(false);
let customOpen = $state(false);
let follow = $state(true);
let stamps = $state(true);
let wrap = $state(false);
let level = $state('all');
let code = $state<ReturnType<typeof CodeView>>();

const LEVEL = /\b(DEBUG|INFO|WARN|ERROR)\b|"level":"(debug|info|warn|error)"/i;
const RANK: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const hasLevels = $derived(session.kind === 'logs' && session.lines.some(l => LEVEL.test(l)));
const rangeLabel = $derived(range === 'custom' ? 'Custom' : range === 'live' ? 'Live' : range);

function setRange(r: string): void {
  range = r;
  rangeOpen = false;
  customOpen = r === 'custom';
  session.paused = r !== 'live';
  if (r !== 'live') follow = false;
  else follow = true;
}

const lines = $derived.by(() => {
  let out = session.lines;
  if (range === '5m') out = out.slice(-12);
  else if (range === '1h') out = out.slice(-40);
  if (level !== 'all') {
    const min = RANK[level];
    out = out.filter(l => {
      const m = LEVEL.exec(l);
      return !m || RANK[(m[1] ?? m[2]).toLowerCase()] >= min;
    });
  }
  if (!stamps) out = out.map(l => l.replace(/^((?:\S+ \| )?)(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d |[A-Z][a-z]{2} \d\d \d\d:\d\d:\d\d )/, '$1'));
  return out;
});

function download(): void {
  const url = URL.createObjectURL(new Blob([session.lines.join('\n')], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${src.name}.log`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clear(): void {
  session.lines.splice(0, session.lines.length);
}

let paneEl = $state<HTMLDivElement>();

/** Failed command blocks of a terminal, keyed by their last output line. */
const failed = $derived(session.kind === 'terminal' ? new Map(failedBlocks(session.lines).map(b => [b.end, b])) : new Map<number, { start: number; end: number }>());

function ask(context: string): void {
  askLightspeed(context, session.connId, `${src.name} ${session.kind === 'logs' ? 'logs' : 'terminal'}`);
}

/** Context of a terminal line: the failed command block it belongs to, else the line. */
function lineContext(i: number): string {
  if (session.kind !== 'terminal') return session.lines[i] ?? '';
  for (const b of failed.values()) if (i >= b.start && i <= b.end) return session.lines.slice(b.start, b.end + 1).join('\n');
  return session.lines[i] ?? '';
}

/** Text selected inside this pane. */
function selection(): string {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !paneEl?.contains(sel.anchorNode)) return '';
  return sel.toString().trim();
}

function paneMenu(e: MouseEvent, line?: string): void {
  const sel = selection();
  const items: MenuItem[] = [];
  if (sel) items.push({ label: askLabel('Ask Lightspeed about selection'), icon: LS_ICON, run: (): void => ask(sel) });
  if (line?.trim()) items.push({ label: askLabel('Ask Lightspeed about this line'), icon: LS_ICON, run: (): void => ask(line) });
  if (session.kind === 'terminal') {
    const f = lastFailed(session.lines);
    items.push({ label: askLabel('Explain last failed command'), icon: LS_ICON, disabled: !f, run: (): void => {
        if (f) ask(f);
      } });
  }
  items.push({ label: 'Copy', icon: faCopy, sep: true, disabled: !sel && !line, run: (): void => void navigator.clipboard?.writeText(sel || line || '') });
  if (session.kind === 'logs') items.push({ label: 'Find…', icon: faMagnifyingGlass, run: (): void => code?.find() });
  openMenu(e, items);
}
</script>

{#snippet askInline(line: string, i: number)}
  {@const err = ERROR_LINE.test(line)}
  {#if line.trim() && !(session.kind === 'terminal' && /^\S*\$\s*$|\]\$\s*$/.test(line))}
    <button
      type="button"
      data-testid="ask-lightspeed-inline"
      class="ask {err ? 'inline-flex' : 'hidden group-hover:inline-flex'}"
      title="Ask RHEL Lightspeed about this line"
      onclick={(e): void => {
        e.stopPropagation();
        ask(session.kind === 'terminal' ? lineContext(i) : line);
      }}><LabIcon icon={LS_ICON} size={14} />Ask Lightspeed</button>
  {/if}
{/snippet}

{#snippet tool(icon: IconRef, label: string, run: () => void, pressed?: boolean, testid?: string)}
  <button
    type="button"
    class="tb"
    class:on={pressed}
    title={label}
    aria-label={label}
    aria-pressed={pressed}
    data-testid={testid}
    onclick={(e): void => {
      e.stopPropagation();
      run();
    }}><AppIcon {icon} /></button>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div bind:this={paneEl} data-testid="panel-pane" data-kind={session.kind} data-session={session.id} class="flex flex-col flex-1 min-w-0 min-h-0" onclick={onfocus}>
  <div data-testid="pane-toolbar" class="relative flex items-center gap-1 h-8 shrink-0 pl-1.5 pr-1 text-[12px] border-b border-[color-mix(in_srgb,var(--pd-content-divider)_60%,transparent)]" class:bg-[color-mix(in_srgb,var(--pd-content-card-bg)_55%,transparent)]={active}>
    {#if src.target && src.target.kind !== 'connection'}
      <button
        type="button"
        data-testid="pane-source"
        class="chip font-medium text-[var(--pd-content-header)]"
        title="Open {src.name}"
        onclick={(e): void => {
          e.stopPropagation();
          if (src.target) onopen?.(src.target, {});
        }}>
        {#if src.icon}<LabIcon icon={src.icon} size={14} />{/if}
        <span class="truncate">{src.name}</span>
        {#if src.status}<span class="w-1.5 h-1.5 rounded-full shrink-0 {STATUS_DOT[src.status] ?? STATUS_DOT.stopped}" title={src.status}></span>{/if}
      </button>
    {/if}
    {#if c}
      <button
        type="button"
        data-testid="pane-conn"
        class="chip text-[var(--pd-table-body-text)] hover:text-[var(--pd-content-header)]"
        title="Open {c.name} overview"
        onclick={(e): void => {
          e.stopPropagation();
          onopen?.({ kind: 'connection', connId: c.id }, {});
        }}>
        <ConnIcon connId={c.id} size={14} dot={false} />
        <span class="truncate max-w-40">{c.name}</span>
        {#if src.target?.kind === 'connection' && src.status}<span class="w-1.5 h-1.5 rounded-full shrink-0 {STATUS_DOT[src.status] ?? STATUS_DOT.stopped}" title={src.status}></span>{/if}
      </button>
    {/if}
    {#if session.label}<span class="truncate text-[var(--pd-table-body-text)] font-mono">{session.label}</span>{/if}
    <span class="flex-1"></span>
    {#if session.kind === 'logs'}
      <div class="relative">
        <button
          type="button"
          data-testid="logs-range"
          class="flex items-center gap-1 h-6 px-1.5 rounded hover:bg-[var(--pd-action-button-details-bg)] text-[var(--pd-content-header)]"
          aria-haspopup="menu"
          title="Time range"
          onclick={(e): void => {
            e.stopPropagation();
            rangeOpen = !rangeOpen;
          }}>
          {#if range === 'live'}<span class="w-1.5 h-1.5 rounded-full bg-[var(--pd-status-running)]"></span>{:else}<AppIcon icon={faClock} size="xs" />{/if}
          {rangeLabel}<AppIcon icon={faChevronDown} size="xs" /></button>
        {#if rangeOpen || customOpen}
          <div role="menu" tabindex="-1" class="absolute right-0 top-7 z-50 w-56 rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-xl py-1 text-[12px]" onclick={(e): void => e.stopPropagation()}>
            {#if rangeOpen}
              {#each RANGES as [id, label] (id)}
                <button type="button" role="menuitemradio" aria-checked={range === id} class="w-full flex items-center px-3 h-7 text-left text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)]" class:font-semibold={range === id} onclick={(): void => setRange(id)}>{label}</button>
              {/each}
              <button type="button" role="menuitemradio" aria-checked={range === 'custom'} class="w-full flex items-center px-3 h-7 text-left text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)] border-t border-[var(--pd-content-divider)]" onclick={(): void => setRange('custom')}>Custom…</button>
            {:else}
              <div data-testid="logs-custom" class="flex flex-col gap-2 px-3 py-2 text-[var(--pd-dropdown-item-text)]">
                <label class="flex flex-col gap-1">Since<input type="datetime-local" bind:value={since} class="h-6 px-1.5 rounded bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)]" /></label>
                <label class="flex flex-col gap-1">Until<input type="datetime-local" bind:value={until} class="h-6 px-1.5 rounded bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)]" /></label>
                <div class="flex justify-end gap-1">
                  <button type="button" class="h-6 px-2 rounded hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => setRange('live')}>Cancel</button>
                  <button type="button" class="h-6 px-2 rounded bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-primary-text)]" onclick={(): void => { customOpen = false; }}>Apply</button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      {#if hasLevels}
        <select
          data-testid="logs-level"
          aria-label="Level"
          bind:value={level}
          onclick={(e): void => e.stopPropagation()}
          class="h-6 pl-1 pr-0 rounded text-[12px] bg-transparent text-[var(--pd-content-header)] hover:bg-[var(--pd-action-button-details-bg)] outline-none cursor-pointer">
          <option value="all">All levels</option>
          <option value="info">Info+</option>
          <option value="warn">Warn+</option>
          <option value="error">Error</option>
        </select>
      {/if}
      <span class="sep"></span>
      {@render tool(faAnglesDown, 'Follow (auto-scroll)', () => (follow = !follow), follow, 'logs-follow')}
      {@render tool(faClock, 'Timestamps', () => (stamps = !stamps), stamps, 'logs-stamps')}
      {@render tool(faTextHeight, 'Wrap lines', () => (wrap = !wrap), wrap, 'logs-wrap')}
      <span class="sep"></span>
      {@render tool(faMagnifyingGlass, 'Find (Ctrl+F)', () => code?.find(), undefined, 'logs-find')}
      {@render tool(faDownload, 'Download', download, undefined, 'logs-download')}
      {@render tool(faBan, 'Clear', clear, undefined, 'logs-clear')}
    {/if}
    {#if session.kind === 'chat'}
      {@render tool(faBan, 'Clear chat', () => clearChat(session.id), undefined, 'ls-clear')}
    {/if}
    {#if closable}
      <span class="sep"></span>
      {@render tool(faXmark, 'Close pane', () => onclose?.(), undefined, 'pane-close')}
    {/if}
  </div>
  {#if session.kind === 'logs'}
    <div class="contents" role="presentation" oncontextmenu={(e): void => paneMenu(e)}>
      <CodeView
        bind:this={code}
        {lines}
        lang="log"
        follow={follow && range === 'live'}
        {wrap}
        findButton={false}
        testid="panel-logs"
        class="bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)]"
        lineaction={askInline}
        onlinecontextmenu={(e, l): void => paneMenu(e, l)} />
    </div>
  {:else if session.kind === 'chat'}
    <LightspeedChat {session} />
  {:else if session.kind === 'terminal'}
    <div class="flex-1 min-h-0 overflow-auto px-4 py-2 font-mono text-[12px] leading-5" role="presentation" oncontextmenu={(e): void => paneMenu(e)}>
      {#each session.lines as line, i (i)}
        <div class="group flex items-center gap-3 min-h-5 whitespace-pre" role="presentation" oncontextmenu={(e): void => paneMenu(e, line)}>
          <span class="min-w-0">{line}{#if i === session.lines.length - 1}<span class="inline-block w-2 h-4 align-middle bg-[var(--pd-terminal-cursor)]"></span>{/if}</span>
          {@render askInline(line, i)}
        </div>
        {#if failed.has(i)}
          {@const b = failed.get(i)!}
          <button
            type="button"
            data-testid="ask-lightspeed-failed"
            class="flex items-center gap-1.5 h-6 my-1 px-2 rounded font-sans text-[12px] text-[var(--pd-table-body-text)] bg-[var(--pd-content-card-bg)] hover:text-[var(--pd-content-header)] hover:bg-[var(--pd-content-card-hover-bg)]"
            title="Explain this failure with RHEL Lightspeed"
            onclick={(e): void => {
              e.stopPropagation();
              ask(session.lines.slice(b.start, b.end + 1).join('\n'));
            }}>
            <span class="w-1.5 h-1.5 rounded-full shrink-0 {STATUS_DOT.error ?? STATUS_DOT.stopped}"></span>Command failed<span class="opacity-60">·</span><LabIcon icon={LS_ICON} size={14} /><span class="text-[var(--pd-content-header)]">{askLabel()}</span>
          </button>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="flex-1 min-h-0 overflow-auto px-4 py-2 font-mono text-[12px] leading-5">
      {#if session.kind === 'yaml'}<div class="mb-1 text-[11px] opacity-60">Editing (apply with ⌘S)</div>{/if}
      {#each session.lines as line, i (i)}
        <div class="whitespace-pre">{line}</div>
      {/each}
    </div>
  {/if}
</div>

<style>
.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  border-radius: 4px;
}
.chip:hover {
  background: var(--pd-action-button-details-bg);
}
.tb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--pd-action-button-details-text);
}
.tb:hover {
  opacity: 1;
  background: var(--pd-action-button-details-bg);
  color: var(--pd-action-button-details-hover-text);
}
.tb.on {
  opacity: 1;
  color: var(--pd-button-primary-bg);
  background: color-mix(in srgb, var(--pd-button-primary-bg) 14%, transparent);
}
.ask {
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 20px;
  margin-left: auto;
  padding: 0 6px;
  border-radius: 4px;
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 11px;
  color: var(--pd-content-header);
  background: var(--pd-content-card-bg);
}
.ask:hover {
  background: var(--pd-content-card-hover-bg);
}
.sep {
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: var(--pd-content-divider);
}
</style>
