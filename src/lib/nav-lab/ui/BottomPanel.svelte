<script lang="ts">
/**
 * Bottom panel (#18062), JetBrains tool-window style (rule A2): "Sessions"
 * title + the same `Tab` as the editor strip (32px, kind icon + provider
 * badge, source name, close, context menu) + toolbar; one pane by default; Split (or dragging a tab onto the body) shows panes
 * side by side. Each pane has its own toolbar with the source chip.
 * "Ask Lightspeed" opens a RHEL Lightspeed chat session (kind 'chat').
 */
import { faAlignLeft, faChevronDown, faCode, faPlus, faTableColumns, faTerminal, faUpRightAndDownLeftFromCenter, faXmark } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import type { IconRef } from '#lib/ext/types.ts';

import type { LabTarget, PanelSession } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { chatClosed } from '../r3/lightspeed.svelte.ts';
import { logLine, type MenuItem } from '../r3/live.svelte.ts';
import Tab from './Tab.svelte';
import { tabCloseMenu } from './tab-menu.ts';
import TabIcon from './TabIcon.svelte';
import SessionPane, { sessionSource } from './SessionPane.svelte';

interface Props {
  sessions: PanelSession[];
  /** Lens-style dock title. */
  title?: string;
  /** Overlay H: tinted top border when one connection is in scope. */
  tint?: string;
  /** Source chip: open / focus the resource tab a session comes from. */
  onopen?: (t: LabTarget, o: { preview?: boolean }) => void;
}

let { sessions: initial, title, tint, onopen }: Props = $props();
let dropHint = $state(false);

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
  // Re-opening logs of the same resource focuses its existing tab.
  if (!sessions.some(x => x.id === p.id)) sessions.push(p);
  if (!panes.includes(p.id)) panes = [p.id];
  active = p.id;
  lab.pending = undefined;
  lab.pendingSplit = false;
});

// Logs sessions opened with `stream` keep appending lines while shown.
$effect(() => {
  const shown = sessions.filter(x => panes.includes(x.id) && x.stream && !x.paused);
  if (!shown.length || !lab.panel) return;
  const timer = setInterval(() => {
    for (const s of shown) {
      if (s.script) {
        // Task output: next scripted lines, then stop streaming.
        s.lines.push(...s.script.splice(0, 2));
        if (!s.script.length) {
          s.stream = false;
          const done = s.ondone;
          s.ondone = undefined;
          done?.();
        }
        continue;
      }
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

function split(id?: string): void {
  const next = id ? sessions.find(x => x.id === id) : sessions.find(x => !panes.includes(x.id));
  if (!next) return;
  if (!panes.includes(next.id)) panes = [...panes.slice(-2), next.id];
  active = next.id;
}

function closePane(id: string): void {
  panes = panes.filter(x => x !== id);
  if (!panes.length) panes = sessions[0] ? [sessions[0].id] : [];
  if (active === id) active = panes.at(-1) ?? '';
}

const ICON: Record<PanelSession['kind'], IconRef> = { terminal: faTerminal, logs: faAlignLeft, yaml: faCode, chat: 'icons/redhat.rhel-lightspeed.png' };

const layout = $derived.by(() => {
  const avail = width - 150;
  let used = 0;
  const visible: PanelSession[] = [];
  const hidden: PanelSession[] = [];
  for (const s of sessions) {
    const w = 64 + sessionSource(s).name.length * 6.6;
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
  if (sessions[idx]?.kind === 'chat') chatClosed(id);
  sessions.splice(idx, 1);
  panes = panes.filter(x => x !== id);
  if (active === id) active = panes.at(-1) ?? (sessions[idx] ?? sessions[idx - 1])?.id ?? '';
  if (!panes.length && active) panes = [active];
  // Closing the last session closes the panel.
  if (!sessions.length) lab.panel = false;
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
  <section aria-label="Panel" data-island="panel" tabindex="-1" class="relative flex flex-col shrink-0 border-t border-[var(--pd-content-divider)] bg-[var(--pd-terminal-background)]" style:height="{height}px" style:border-top={tint ? `2px solid ${tint}` : undefined}>
    <div
      role="separator"
      aria-orientation="horizontal"
      class="h-1 -mt-0.5 cursor-row-resize hover:bg-[var(--pd-tab-highlight)]"
      onpointerdown={startResize}></div>
    <div role="tablist" aria-label="Sessions" data-testid="panel-strip" class="flex items-stretch h-8 shrink-0 bg-[var(--pd-secondary-nav-bg)] border-b border-[var(--pd-content-divider)]" bind:clientWidth={width}>
      <span class="flex items-center pl-3 pr-2 text-[12px] font-semibold text-[var(--pd-content-header)]">{title ?? 'Sessions'}</span>
      {#each layout.visible as s (s.id)}
        {@const src = sessionSource(s)}
        <Tab
          testid="panel-tab"
          data-session={s.id}
          draggable="true"
          ondragstart={(e: DragEvent): void => {
            e.dataTransfer?.setData('text/x-session', s.id);
          }}
          icon={ICON[s.kind]}
          connId={s.connId}
          title={src.name}
          tooltip="{src.name} · {s.label ?? s.kind}"
          selected={panes.includes(s.id)}
          dim={panes.length > 1 && active !== s.id}
          onselect={(): void => show(s.id)}
          onclose={(): void => close(s.id)}
          menu={(): MenuItem[] => [
            ...tabCloseMenu(
              sessions.map(x => x.id),
              s.id,
              close,
            ),
            { label: 'Split right', sep: true, disabled: panes.includes(s.id), run: (): void => split(s.id) },
            ...(src.target ? [{ label: `Open ${src.name}`, run: (): void => onopen?.(src.target!, {}), sep: true }] : []),
          ]} />
      {/each}
      {#if layout.hidden.length}
        <div class="relative flex items-center px-1">
          <button
            type="button"
            class="flex items-center gap-1 h-6 px-2 rounded text-[11px] font-semibold text-[var(--pd-tab-text)] hover:bg-[var(--pd-content-card-hover-bg)] border border-[var(--pd-content-divider)]"
            aria-label="{layout.hidden.length} more sessions"
            onclick={(): void => {
              menuOpen = !menuOpen;
            }}>+{layout.hidden.length}<AppIcon icon={faChevronDown} size="xs" /></button>
          {#if menuOpen}
            <div role="menu" class="absolute left-0 bottom-full mb-1 w-64 rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-xl py-1 z-50">
              {#each layout.hidden as s (s.id)}
                {@const src = sessionSource(s)}
                <button
                  type="button"
                  role="menuitem"
                  class="w-full flex items-center gap-2 px-3 h-7 text-left text-[12px] text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)]"
                  onclick={(): void => {
                    show(s.id);
                    menuOpen = false;
                  }}><TabIcon icon={ICON[s.kind]} connId={s.connId} /><span class="truncate">{src.name}</span><span class="text-[var(--pd-table-body-text)]">{s.label ?? s.kind}</span></button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      <div class="flex-1"></div>
      <div class="flex items-center gap-0.5 px-1.5 text-[var(--pd-tab-text)]">
        <button type="button" title="Split" aria-label="Split panel" class="pbtn" onclick={(): void => split()}><AppIcon icon={faTableColumns} /></button>
        <button type="button" title="New terminal" aria-label="New terminal" class="pbtn" onclick={newTerminal}><AppIcon icon={faPlus} /></button>
        <button type="button" title="Maximize" aria-label="Maximize panel" class="pbtn" onclick={(): void => { height = height > 400 ? 230 : 520; }}><AppIcon icon={faUpRightAndDownLeftFromCenter} /></button>
        <button type="button" title="Hide panel (`)" aria-label="Hide panel" class="pbtn" onclick={(): void => { lab.panel = false; }}><AppIcon icon={faXmark} /></button>
      </div>
    </div>
    <div
      data-testid="nav-lab-panel-body"
      role="group"
      class="relative flex flex-1 min-h-0 text-[var(--pd-terminal-foreground)]"
      ondragover={(e): void => {
        if (e.dataTransfer?.types.includes('text/x-session')) {
          e.preventDefault();
          dropHint = true;
        }
      }}
      ondragleave={(): void => {
        dropHint = false;
      }}
      ondrop={(e): void => {
        e.preventDefault();
        dropHint = false;
        const id = e.dataTransfer?.getData('text/x-session');
        if (id) split(id);
      }}>
      {#each shown as cur (cur.id)}
        <div class="flex flex-1 min-w-0 border-l first:border-l-0 border-[var(--pd-content-divider)]">
          <SessionPane session={cur} active={shown.length > 1 && cur.id === active} closable={shown.length > 1} onclose={(): void => closePane(cur.id)} onfocus={(): void => { active = cur.id; }} {onopen} />
        </div>
      {/each}
      {#if dropHint}<div class="pointer-events-none absolute inset-y-0 right-0 w-1/2 border-2 border-dashed border-[var(--pd-tab-highlight)] bg-[color-mix(in_srgb,var(--pd-tab-highlight)_10%,transparent)]"></div>{/if}
    </div>
  </section>
{/if}

<style>
.pbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
}
.pbtn:hover {
  background: var(--pd-action-button-details-bg);
  color: var(--pd-tab-text-highlight);
}
</style>
