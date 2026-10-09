<script lang="ts">
/**
 * Bottom panel (#18062): session tabs (terminals, logs, YAML) with a 4px top
 * accent on the active tab, overflow "+N" badge, resize handle (min 120px),
 * backtick toggle (handled by the lab shell).
 */
import { faAlignLeft, faChevronDown, faCode, faPlus, faTableColumns, faTerminal, faUpRightAndDownLeftFromCenter, faXmark } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type PanelSession } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import CodeView from '../r3/CodeView.svelte';
import { logLine } from '../r3/live.svelte.ts';
import ConnIcon from './ConnIcon.svelte';

interface Props {
  sessions: PanelSession[];
  /** Lens-style dock title. */
  title?: string;
  /** Overlay H: tinted top border when one connection is in scope. */
  tint?: string;
}

let { sessions: initial, title, tint }: Props = $props();

let sessions = $state<PanelSession[]>([]);
let active = $state('');
/** Sessions shown side by side (split); the tab strip highlights them all. */
let panes = $state<string[]>([]);
let height = $state(230);
let width = $state(0);
let menuOpen = $state(false);

$effect.pre(() => {
  sessions = [...initial];
  const first = initial[0]?.id ?? '';
  active = first;
  panes = first ? [first] : [];
});

// Sessions queued from a resource (Open terminal / Show logs): add and focus.
$effect(() => {
  const p = lab.pending;
  if (!p) return;
  sessions.push(p);
  const keep = lab.pendingSplit ? panes.filter(id => id !== p.id && sessions.some(x => x.id === id)).slice(-2) : [];
  panes = [...keep, p.id];
  active = p.id;
  lab.pending = undefined;
  lab.pendingSplit = false;
});

// Logs sessions opened with `stream` keep appending lines while shown.
$effect(() => {
  const shown = sessions.filter(x => panes.includes(x.id) && x.stream);
  if (!shown.length || !lab.panel) return;
  const timer = setInterval(() => {
    for (const s of shown) {
      s.lines.push(logLine(s.title, s.lines.length));
      if (s.lines.length > 400) s.lines.splice(0, 100);
    }
  }, 900);
  return (): void => clearInterval(timer);
});

function show(id: string): void {
  active = id;
  if (!panes.includes(id)) panes = [id];
}

function split(): void {
  const next = sessions.find(x => !panes.includes(x.id));
  if (next && panes.length < 3) {
    panes = [...panes, next.id];
    active = next.id;
  }
}

function closePane(id: string): void {
  panes = panes.filter(x => x !== id);
  if (!panes.length) panes = sessions[0] ? [sessions[0].id] : [];
  if (active === id) active = panes.at(-1) ?? '';
}

const ICON = { terminal: faTerminal, logs: faAlignLeft, yaml: faCode };

const layout = $derived.by(() => {
  const avail = width - 140;
  let used = 0;
  const visible: PanelSession[] = [];
  const hidden: PanelSession[] = [];
  for (const s of sessions) {
    const w = 64 + s.title.length * 6.3;
    if (hidden.length === 0 && used + w <= avail) {
      visible.push(s);
      used += w;
    } else hidden.push(s);
  }
  // Keep the active session visible (a session just opened from a resource).
  const ai = hidden.findIndex(s => s.id === active);
  if (ai >= 0 && visible.length) hidden.splice(ai, 1, visible.splice(visible.length - 1, 1, hidden[ai])[0]);
  return { visible, hidden };
});

const shown = $derived(panes.map(id => sessions.find(s => s.id === id)).filter((s): s is PanelSession => !!s));

function startResize(e: PointerEvent): void {
  const startY = e.clientY;
  const startH = height;
  const move = (ev: PointerEvent): void => {
    height = Math.max(120, Math.min(600, startH + startY - ev.clientY));
  };
  const up = (): void => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function close(id: string): void {
  const idx = sessions.findIndex(s => s.id === id);
  sessions.splice(idx, 1);
  panes = panes.filter(x => x !== id);
  if (active === id) active = panes.at(-1) ?? (sessions[idx] ?? sessions[idx - 1])?.id ?? '';
  if (!panes.length && active) panes = [active];
}

function newTerminal(): void {
  const n = sessions.filter(s => s.kind === 'terminal').length + 1;
  const s: PanelSession = { id: `new-${n}-${Date.now()}`, kind: 'terminal', title: `podman-machine-default (${n})`, connId: 'podman-machine-default', lines: ['$ '] };
  sessions.push(s);
  active = s.id;
  panes = [s.id];
}
</script>

{#if lab.panel}
  <section aria-label="Panel" class="flex flex-col shrink-0 border-t border-[var(--pd-content-divider)] bg-[var(--pd-terminal-background)]" style:height="{height}px" style:border-top={tint ? `2px solid ${tint}` : undefined}>
    <div
      role="separator"
      aria-orientation="horizontal"
      class="h-1 -mt-0.5 cursor-row-resize hover:bg-[var(--pd-tab-highlight)]"
      onpointerdown={startResize}></div>
    <div class="flex items-stretch h-8 shrink-0 bg-[var(--pd-secondary-nav-bg)] border-b border-[var(--pd-content-divider)]" bind:clientWidth={width}>
      {#if title}<span class="flex items-center px-3 text-sm font-semibold text-[var(--pd-nav-group-header)] uppercase tracking-wide">{title}</span>{/if}
      {#each layout.visible as s (s.id)}
        {@const sel = panes.includes(s.id)}
        <div
          role="tab"
          tabindex="0"
          aria-selected={sel}
          class="group/pt relative flex items-center gap-1.5 pl-3 pr-1 text-base cursor-pointer border-r border-[var(--pd-content-divider)] whitespace-nowrap"
          class:bg-[var(--pd-terminal-background)]={sel}
          class:text-[var(--pd-tab-text-highlight)]={sel}
          class:text-[var(--pd-tab-text)]={!sel}
          onclick={(): void => show(s.id)}
          onkeydown={(): void => show(s.id)}>
          {#if sel}<span class="absolute left-0 right-0 top-0 h-1 bg-[var(--pd-tab-highlight)]"></span>{/if}
          <span class="text-[11px] opacity-80"><AppIcon icon={ICON[s.kind]} /></span>
          <ConnIcon connId={s.connId} size={13} dot={false} />
          <span>{s.title}</span>
          <button
            type="button"
            aria-label="Close {s.title}"
            class="w-5 h-5 flex items-center justify-center rounded invisible group-hover/pt:visible hover:bg-[var(--pd-content-card-hover-inset-bg)]"
            class:!visible={sel}
            onclick={(e): void => {
              e.stopPropagation();
              close(s.id);
            }}><AppIcon icon={faXmark} size="xs" /></button>
        </div>
      {/each}
      {#if layout.hidden.length}
        <div class="relative flex items-center px-1">
          <button
            type="button"
            class="flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-semibold bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]"
            aria-label="{layout.hidden.length} more sessions"
            onclick={(): void => {
              menuOpen = !menuOpen;
            }}>+{layout.hidden.length}<AppIcon icon={faChevronDown} size="xs" /></button>
          {#if menuOpen}
            <div role="menu" class="absolute left-0 bottom-full mb-1 w-64 rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-xl py-1 z-50">
              {#each layout.hidden as s (s.id)}
                <button
                  type="button"
                  role="menuitem"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)]"
                  onclick={(): void => {
                    show(s.id);
                    menuOpen = false;
                  }}><AppIcon icon={ICON[s.kind]} /> {s.title}</button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      <div class="flex-1"></div>
      <div class="flex items-center gap-0.5 px-2 text-[var(--pd-tab-text)]">
        <button type="button" title="Split" aria-label="Split panel" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={split}><AppIcon icon={faTableColumns} /></button>
        <button type="button" title="New terminal" aria-label="New terminal" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={newTerminal}><AppIcon icon={faPlus} /></button>
        <button type="button" title="Maximize" aria-label="Maximize panel" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => { height = height > 400 ? 230 : 520; }}><AppIcon icon={faUpRightAndDownLeftFromCenter} /></button>
        <button type="button" title="Hide panel (`)" aria-label="Hide panel" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => { lab.panel = false; }}><AppIcon icon={faXmark} /></button>
      </div>
    </div>
    <div data-testid="nav-lab-panel-body" class="flex flex-1 min-h-0 text-[var(--pd-terminal-foreground)]">
      {#each shown as cur (cur.id)}
        <div data-testid="panel-pane" data-kind={cur.kind} class="flex flex-col flex-1 min-w-0 border-l first:border-l-0 border-[var(--pd-content-divider)]">
          {#if shown.length > 1}
            <div class="flex items-center gap-1.5 h-6 shrink-0 px-2 text-[11px] border-b border-[var(--pd-content-divider)]" class:bg-[var(--pd-content-card-bg)]={cur.id === active}>
              <AppIcon icon={ICON[cur.kind]} size="xs" /><span class="truncate">{cur.title}</span><span class="opacity-50 truncate">{cur.label ?? ''}</span>
              <span class="flex-1"></span>
              <button type="button" aria-label="Close pane" class="w-4 h-4 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => closePane(cur.id)}><AppIcon icon={faXmark} size="xs" /></button>
            </div>
          {/if}
          {#if cur.kind === 'logs'}
            <CodeView lines={cur.lines} lang="log" follow testid="panel-logs" class="bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)]" />
          {:else}
            <div class="flex-1 min-h-0 overflow-auto px-4 py-2 font-mono text-[12px] leading-5">
              <div class="mb-1 text-[11px] opacity-60">{cur.kind === 'yaml' ? 'Editing (apply with ⌘S)' : (cur.label ?? 'Terminal')} · {findConn(cur.connId)?.name}</div>
              {#each cur.lines as line, i (i)}
                <div class="whitespace-pre">{line}{#if i === cur.lines.length - 1 && cur.kind === 'terminal'}<span class="inline-block w-2 h-4 align-middle bg-[var(--pd-terminal-cursor)]"></span>{/if}</div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>
{/if}
