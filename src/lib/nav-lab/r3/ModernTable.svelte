<script lang="ts" module>
import { SvelteSet } from 'svelte/reactivity';

/** Collapsed group rows, remembered across tabs / remounts (keyed by row name). */
const collapsed = new SvelteSet<string>();
</script>

<script lang="ts">
/**
 * P13 list, IDE-shell flavours (lab toggle `table=`):
 * - modern: full-bleed 34px rows, hairline dividers, inline status dot, hover
 *   checkbox / actions, slim group headers, bulk bar on selection.
 * - grid: dense 26px JetBrains-like grid, row numbers, filter row, resizable columns.
 */
import { faCheck, faChevronDown, faChevronRight, faEllipsis, faEllipsisVertical, faPlay, faSortDown, faSortUp, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import LabIcon from '../ui/LabIcon.svelte';

import { openMenu } from './live.svelte.ts';
import type { LabRow } from './cells/types.ts';

interface Props {
  rows: LabRow[];
  /** Text columns: [title, key in `row.cols`, width, numeric?]. */
  cols: [string, string, string, boolean?][];
  variant: 'modern' | 'grid';
  /** Initial sort column ('' = keep the given order). */
  initialSort?: string;
  /** Column keys rendered in monospace (versions, digests…). */
  mono?: string[];
  /** Extra bulk-bar actions on the selected rows (e.g. Convert to Kubernetes). */
  bulkActions?: { label: string; icon?: IconRef; run: (rows: LabRow[]) => void }[];
  /** Hide the row checkbox / bulk bar (read-only results). */
  readonly?: boolean;
  /** Column keys whose comma-separated values render as compact chips (arch, variants…). */
  chips?: string[];
}

let { rows, cols, variant, initialSort = '__name', mono = [], readonly = false, bulkActions = [], chips = [] }: Props = $props();

const grid = $derived(variant === 'grid');

// svelte-ignore state_referenced_locally
let sortKey = $state(initialSort);
let sortDir = $state<1 | -1>(1);
const hidden = new SvelteSet<string>();
const selected = new SvelteSet<string>();
let highlight = $state<string | undefined>(undefined);
let colFilter = $state<Record<string, string>>({});
let widths = $state<Record<string, number>>({});
let root = $state<HTMLDivElement>();

interface Col {
  key: string;
  title: string;
  width: string;
  numeric: boolean;
}

const allCols = $derived<Col[]>([
  { key: '__name', title: 'Name', width: 'minmax(14rem, 2fr)', numeric: false },
  ...cols.map(([title, key, width, numeric]) => ({ key, title, width, numeric: !!numeric || /size|age|uptime/i.test(key) })),
]);
const shown = $derived(allCols.filter(c => !hidden.has(c.key)));
const template = $derived(
  [grid ? '40px 20px' : readonly ? '12px' : '28px', ...shown.map(c => (widths[c.key] ? `${widths[c.key]}px` : c.width)), grid ? '96px' : '132px'].join(' '),
);

function num(v: string): number {
  const m = /([\d.]+)\s*(GB|MB|kB|B|minute|hour|day|week)?/.exec(v);
  if (!m) return 0;
  const mul: Record<string, number> = { GB: 1e9, MB: 1e6, kB: 1e3, B: 1, minute: 60, hour: 3600, day: 86400, week: 604800 };
  return Number(m[1]) * (mul[m[2] ?? ''] ?? 1);
}

function val(r: LabRow, key: string): string {
  return key === '__name' ? r.title : (r.cols[key] ?? '');
}

function cmp(a: LabRow, b: LabRow): number {
  if (!sortKey) return 0;
  const c = allCols.find(x => x.key === sortKey);
  const d = c?.numeric ? num(val(a, sortKey)) - num(val(b, sortKey)) : val(a, sortKey).localeCompare(val(b, sortKey));
  return d * sortDir;
}

function passes(r: LabRow): boolean {
  if (!grid) return true;
  return Object.entries(colFilter).every(([k, f]) => !f || val(r, k).toLowerCase().includes(f.toLowerCase()));
}

interface Flat {
  row: LabRow;
  depth: number;
  group: boolean;
  /** Last child of its group (tree connector ends here). */
  last?: boolean;
}

const flat = $derived.by((): Flat[] => {
  const out: Flat[] = [];
  const top = rows
    .map(r => (r.children ? { ...r, children: r.children.filter(passes).sort(cmp) } : r))
    .filter(r => (r.children ? r.children.length > 0 : passes(r)))
    .sort(cmp);
  for (const r of top) {
    if (r.children) {
      out.push({ row: r, depth: 0, group: true });
      if (!collapsed.has(r.name)) r.children.forEach((k, j, arr) => out.push({ row: k, depth: 1, group: false, last: j === arr.length - 1 }));
    } else out.push({ row: r, depth: 0, group: false });
  }
  return out;
});

const leaves = $derived(flat.filter(f => !f.group).map(f => f.row));
const selMode = $derived(selected.size > 0);
const selRows = $derived(rows.flatMap(r => r.children ?? [r]).filter(r => selected.has(r.name)));

function sortBy(key: string): void {
  if (sortKey === key) sortDir = sortDir === 1 ? -1 : 1;
  else {
    sortKey = key;
    sortDir = 1;
  }
}

function toggleSel(r: LabRow): void {
  if (selected.has(r.name)) selected.delete(r.name);
  else selected.add(r.name);
}

function toggleGroup(r: LabRow): void {
  if (collapsed.has(r.name)) collapsed.delete(r.name);
  else collapsed.add(r.name);
}

function click(e: MouseEvent, f: Flat): void {
  highlight = f.row.name;
  root?.focus();
  if (f.group) return toggleGroup(f.row);
  if (!readonly && (e.ctrlKey || e.metaKey || selMode)) return toggleSel(f.row);
  f.row.open?.();
}

function bulk(title: string): void {
  for (const r of selRows) r.buttons.find(b => b.title === title && b.enabled !== false)?.run();
  if (title === 'Delete') selected.clear();
}

function key(e: KeyboardEvent): void {
  const i = flat.findIndex(f => f.row.name === highlight);
  const cur = flat[i];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = flat[Math.max(0, Math.min(flat.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (n) {
      highlight = n.row.name;
      root?.querySelector(`[data-row="${CSS.escape(n.row.name)}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  } else if (e.key === ' ' && cur) {
    e.preventDefault();
    if (cur.group) toggleGroup(cur.row);
    else toggleSel(cur.row);
  } else if (e.key === 'Enter' && cur) {
    if (cur.group) toggleGroup(cur.row);
    else (cur.row.pin ?? cur.row.open)?.();
  } else if (e.key === 'Escape') selected.clear();
}

function colMenu(e: MouseEvent): void {
  openMenu(
    e,
    allCols
      .filter(c => c.key !== '__name')
      .map(c => ({
        label: c.title,
        icon: hidden.has(c.key) ? undefined : faCheck,
        run: (): void => {
          if (hidden.has(c.key)) hidden.delete(c.key);
          else hidden.add(c.key);
        },
      })),
  );
}

function resize(e: PointerEvent, c: Col): void {
  e.preventDefault();
  e.stopPropagation();
  const cell = (e.currentTarget as HTMLElement).parentElement!;
  const start = e.clientX;
  const w0 = cell.getBoundingClientRect().width;
  const move = (m: PointerEvent): void => {
    widths[c.key] = Math.max(48, Math.round(w0 + m.clientX - start));
  };
  const up = (): void => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function tone(st: string): string {
  if (/^(CRITICAL|HIGH|MEDIUM|LOW|NEGLIGIBLE)$/.test(st)) return `sev-${st.toLowerCase()}`;
  return st === 'RUNNING' || st === 'USED' ? 'running' : st === 'DEGRADED' ? 'degraded' : st === 'CREATED' ? 'created' : 'stopped';
}

/** Drop the uppercase status word from the PD second line (the dot says it). */
function subOf(r: LabRow): string[] {
  return r.sub.filter(s => s && !/^[A-Z]+$/.test(s)).map(s => (/^PORTS? /.test(s) ? s.replace(/^PORTS? /, ':') : s));
}
</script>

{#snippet dot(r: LabRow)}
  {#if r.status}<span class="dot {tone(r.status)}" data-testid="mt-dot" title={r.dotTitle ?? r.status}></span>{/if}
{/snippet}

{#snippet acts(r: LabRow)}
  <div class="acts" class:always={r.buttons.some(b => b.label)}>
    {#each r.buttons as b (b.title)}
      {#if b.label}
        <button type="button" class="ghost-txt lbl" data-testid="row-btn" disabled={b.enabled === false} onclick={(e): void => { e.stopPropagation(); b.run(e); }}><AppIcon icon={b.icon} size="xs" />{b.title}</button>
      {:else}
        <button type="button" class="ghost" class:danger={b.danger} title={b.title} aria-label={b.title} disabled={b.enabled === false} onclick={(e): void => { e.stopPropagation(); b.run(); }}><AppIcon icon={b.icon} size="xs" /></button>
      {/if}
    {/each}
    {#if r.menu}
      <button type="button" class="ghost" title="More actions" aria-label="More actions for {r.title}" onclick={(e): void => openMenu(e, r.menu!())}><AppIcon icon={faEllipsisVertical} size="xs" /></button>
    {/if}
  </div>
{/snippet}

<div
  bind:this={root}
  data-testid="modern-table"
  data-variant={variant}
  class="mt"
  class:grid-v={grid}
  class:sel-mode={selMode}
  role="grid"
  tabindex="0"
  aria-multiselectable="true"
  onkeydown={key}>
  <div class="stick">
    {#if selMode}
      <div class="bulk" data-testid="bulk-bar">
        <span class="font-medium text-[var(--pd-content-header)]">{selected.size} selected</span>
        <span class="opacity-40">·</span>
        <button type="button" class="ghost-txt" onclick={(): void => bulk('Start')}><AppIcon icon={faPlay} size="xs" />Start</button>
        <button type="button" class="ghost-txt" onclick={(): void => bulk('Stop')}><AppIcon icon={faStop} size="xs" />Stop</button>
        <button type="button" class="ghost-txt danger" onclick={(): void => bulk('Delete')}><AppIcon icon={faTrash} size="xs" />Delete</button>
        {#each bulkActions as a (a.label)}
          <button type="button" class="ghost-txt" data-testid="bulk-action" onclick={(): void => a.run(selRows)}>{#if a.icon}<LabIcon icon={a.icon} size={14} />{/if}{a.label}</button>
        {/each}
        <span class="flex-1"></span>
        <button type="button" class="ghost-txt" data-testid="bulk-clear" onclick={(): void => selected.clear()}>Clear</button>
      </div>
    {/if}
    <div class="row head" style:grid-template-columns={template} role="row">
      {#if grid}
        <span class="gut">#</span><span></span>
      {:else}
        <span class="cb">
          {#if !readonly}<input
            type="checkbox"
            aria-label="Select all"
            checked={leaves.length > 0 && leaves.every(r => selected.has(r.name))}
            onchange={(e): void => {
              if (e.currentTarget.checked) leaves.forEach(r => selected.add(r.name));
              else selected.clear();
            }} />{/if}
        </span>
      {/if}
      {#each shown as c (c.key)}
        <div class="hcell" class:num={c.numeric} role="columnheader">
          <button type="button" class="hbtn" onclick={(): void => sortBy(c.key)}>
            <span class="truncate">{c.title}</span>
            <span class="caret" class:on={sortKey === c.key}><AppIcon icon={sortKey === c.key && sortDir === -1 ? faSortDown : faSortUp} size="xs" /></span>
          </button>
          {#if grid}<span class="rz" role="presentation" onpointerdown={(e): void => resize(e, c)}></span>{/if}
        </div>
      {/each}
      <span class="flex justify-end pr-2">
        <button type="button" class="ghost" title="Columns" aria-label="Column visibility" data-testid="col-menu" onclick={colMenu}><AppIcon icon={faEllipsis} size="xs" /></button>
      </span>
    </div>
    {#if grid}
      <div class="row filt" style:grid-template-columns={template}>
        <span></span><span></span>
        {#each shown as c (c.key)}
          <input class="fin" placeholder="filter" aria-label="Filter {c.title}" bind:value={colFilter[c.key]} />
        {/each}
        <span></span>
      </div>
    {/if}
  </div>

  {#each flat as f, i (f.row.name)}
    {@const r = f.row}
    {#if f.group}
      <div
        class="row grp"
        data-testid="mt-group"
        data-row={r.name}
        role="row"
        tabindex="-1"
        aria-expanded={!collapsed.has(r.name)}
        style:grid-template-columns={template}
        class:hl={highlight === r.name}
        class:open={!collapsed.has(r.name)}
        onclick={(e): void => click(e, f)}
        ondblclick={(): void => r.pin?.()}
        onkeydown={(): void => undefined}
        oncontextmenu={(e): void => openMenu(e, [...r.buttons.map(b => ({ label: b.title, icon: b.icon, danger: b.danger, run: b.run })), ...(r.menu?.().map((m, i) => ({ ...m, sep: i === 0 })) ?? [])])}>
        {#if grid}<span class="gut">{i + 1}</span>{/if}
        <span class="chev" data-testid="mt-group-toggle"><AppIcon icon={collapsed.has(r.name) ? faChevronRight : faChevronDown} size="xs" /></span>
        <span class="name" style:grid-column="span {shown.length}">
          <span class="gicon"><LabIcon icon={r.icon} size={16} /></span>
          <span class="title">{r.title}</span>
          {#if r.chip}<span class="kind">{r.chip}</span>{/if}
          <span class="agg" data-testid="mt-agg" title={r.agg}>{@render dot(r)}<span class="truncate">{r.agg ?? `${r.children?.length ?? 0}`}</span></span>
        </span>
        {@render acts(r)}
      </div>
    {:else}
      <div
        class="row item"
        class:child={f.depth > 0}
        class:last={f.last}
        data-testid="mt-row"
        data-row={r.name}
        role="row"
        tabindex="-1"
        aria-selected={selected.has(r.name)}
        style:grid-template-columns={template}
        class:hl={highlight === r.name}
        class:sel={selected.has(r.name)}
        onclick={(e): void => click(e, f)}
        ondblclick={(): void => (r.pin ?? r.open)?.()}
        onkeydown={(): void => undefined}
        oncontextmenu={(e): void => { highlight = r.name; if (r.menu) openMenu(e, r.menu()); }}>
        {#if grid}
          <button type="button" class="gut" aria-label="Select {r.title}" onclick={(e): void => { e.stopPropagation(); toggleSel(r); }}>{i + 1}</button>
          <span class="flex items-center justify-center">{@render dot(r)}</span>
        {:else}
          <span class="cb">
            {#if !readonly}<input type="checkbox" data-testid="mt-check" aria-label="Select {r.title}" checked={selected.has(r.name)} onclick={(e): void => e.stopPropagation()} onchange={(): void => toggleSel(r)} />{/if}
          </span>
        {/if}
        {#each shown as c (c.key)}
          {#if c.key === '__name'}
            <span class="name" style:padding-left={f.depth ? '22px' : undefined}>
              {#if !grid}{@render dot(r)}{/if}
              {#if r.desc}
                <span class="two" title={`${r.title}\n${r.desc}`}><span class="title">{r.title}</span><span class="desc">{r.desc}</span></span>
              {:else}
                <span class="title" title={r.title}>{r.title}</span>
              {/if}
              {#if r.shortId}<span class="muted mono">{r.shortId.slice(0, 8)}</span>{/if}
              {#each subOf(r) as s, j (j)}
                {#if r.shortId}<span class="pill">{s}</span>{:else}<span class="muted truncate">{s}</span>{/if}
              {/each}
            </span>
          {:else}
            <span class="cell" class:num={c.numeric} class:mono={(grid && (c.numeric || /id|size/i.test(c.key))) || mono.includes(c.key)} title={r.badge?.col === c.key ? `${r.badge.title ?? r.badge.text} · ${r.cols[c.key] ?? ''}` : r.cols[c.key]}
              >{#if r.badge?.col === c.key}<span class="badge {tone(r.badge.tone)}" data-testid="mt-badge">{r.badge.text}</span>{/if}{#if chips.includes(c.key)}{#each (r.cols[c.key] ?? '').split(', ').filter(Boolean) as ch (ch)}<span class="chip">{ch}</span>{/each}{:else}{r.cols[c.key] ?? ''}{/if}</span>
          {/if}
        {/each}
        {@render acts(r)}
      </div>
    {/if}
  {/each}
  {#if !flat.length}
    <div class="px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">No rows match the column filters.</div>
  {/if}
</div>

<style>
.mt {
  --line: color-mix(in srgb, var(--pd-content-divider) 55%, transparent);
  --accent: var(--pd-button-primary-bg);
  --row-h: 34px;
  /* Rule E17b: columns fit the width (min/max tracks, truncation + tooltip), never a horizontal scroll. */
  width: 100%;
  min-width: 0;
  font-size: 12px;
  color: var(--pd-table-body-text);
  outline: none;
  align-self: flex-start;
  --guide-x: 13px;
}
.grid-v {
  --guide-x: 51px;
}
.grid-v {
  --row-h: 26px;
  --line: color-mix(in srgb, var(--pd-content-divider) 80%, transparent);
  font-size: 12px;
}
.stick {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--pd-content-bg);
}
.row {
  display: grid;
  align-items: center;
  height: var(--row-h);
  border-bottom: 1px solid var(--line);
  border-left: 2px solid transparent;
}
.row > * {
  min-width: 0;
}
.head {
  height: 28px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pd-table-header-text, var(--pd-table-body-text));
}
.grid-v .head {
  height: 24px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  background: var(--pd-content-card-bg, var(--pd-content-bg));
}
.hcell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 8px;
  text-align: left;
  text-transform: inherit;
}
.hcell.num {
  justify-content: flex-end;
}
.hbtn {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  text-transform: inherit;
}
.hcell:hover .caret {
  opacity: 0.5;
}
.caret {
  opacity: 0;
  font-size: 10px;
}
.hcell:hover .caret {
  opacity: 0.5;
}
.caret.on {
  opacity: 0.9;
}
.rz {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 1;
}
.rz:hover {
  background: var(--accent);
}
.item,
.grp {
  cursor: default;
}
.item:hover,
.grp:hover,
.hl {
  background: var(--pd-content-card-hover-bg, color-mix(in srgb, var(--pd-content-header) 5%, transparent));
}
.sel {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-left-color: var(--accent);
}
.sel:hover {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}
.mt:focus-visible .hl {
  outline: 1px solid color-mix(in srgb, var(--accent) 60%, transparent);
  outline-offset: -1px;
}
.cb {
  display: flex;
  justify-content: center;
}
.cb input {
  accent-color: var(--accent);
  opacity: 0;
  cursor: pointer;
}
.head .cb input,
.item:hover .cb input,
.sel-mode .cb input,
.cb input:focus-visible {
  opacity: 1;
}
.head .cb input {
  opacity: 0;
}
.sel-mode .head .cb input,
.head:hover .cb input {
  opacity: 1;
}
.name {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
}
.title {
  color: var(--pd-table-body-text-highlight);
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 3rem;
}
.grp .title {
  font-weight: 600;
  color: var(--pd-content-header);
}
/* Group header: tinted band, kind icon, bold name, aggregate status. */
.grp {
  position: relative;
}
.grp:not(:hover):not(.hl) {
  background: var(--pd-content-card-bg);
}
.chev {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  opacity: 0.7;
}
.gicon {
  display: inline-flex;
  width: 16px;
  justify-content: center;
  flex-shrink: 0;
  color: var(--pd-content-header-icon, var(--pd-table-body-text));
}
.kind {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pd-table-body-text);
  opacity: 0.75;
}
.agg {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--pd-table-body-text);
}
/* Children: indented, thin tree connector aligned under the group chevron. */
.child {
  position: relative;
}
.child:not(:hover):not(.sel):not(.hl) {
  background: color-mix(in srgb, var(--pd-content-card-bg) 35%, transparent);
}
.child::before {
  content: '';
  position: absolute;
  left: var(--guide-x);
  top: 0;
  bottom: 0;
  width: 1px;
  background: color-mix(in srgb, var(--pd-table-body-text) 35%, transparent);
  pointer-events: none;
}
.child.last::before {
  bottom: 50%;
}
.child::after {
  content: '';
  position: absolute;
  left: var(--guide-x);
  top: 50%;
  width: 14px;
  height: 1px;
  background: color-mix(in srgb, var(--pd-table-body-text) 35%, transparent);
  pointer-events: none;
}
.child .cb input {
  position: relative;
  z-index: 1;
}
.muted {
  color: var(--pd-table-body-text);
  font-size: 12px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.pill {
  flex-shrink: 0;
  padding: 0 6px;
  line-height: 16px;
  border-radius: 9999px;
  font-size: 11px;
  background: var(--pd-label-bg);
  color: var(--pd-label-text);
}
.two {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 15px;
}
.two .title {
  min-width: 0;
  white-space: nowrap;
}
.desc {
  font-size: 11px;
  color: var(--pd-table-body-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chip {
  display: inline-block;
  margin-right: 4px;
  padding: 0 5px;
  line-height: 16px;
  border-radius: 4px;
  font-size: 11px;
  background: var(--pd-label-bg);
  color: var(--pd-label-text);
}
.badge {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  line-height: 16px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #fff;
  background: var(--pd-status-stopped);
}
.badge.sev-critical {
  background: var(--pd-status-dead);
}
.badge.sev-high {
  background: var(--pd-status-degraded);
}
.badge.sev-medium {
  background: var(--pd-status-starting);
}
.badge.running {
  background: var(--pd-status-running);
}
.cell {
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--pd-table-body-text);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: var(--pd-status-stopped);
}
.dot.running {
  background: var(--pd-status-running);
}
.dot.degraded {
  background: var(--pd-status-degraded);
}
.dot.sev-critical {
  background: var(--pd-status-dead);
}
.dot.sev-high {
  background: var(--pd-status-degraded);
}
.dot.sev-medium {
  background: var(--pd-status-starting);
}
.dot.sev-low {
  background: var(--pd-status-stopped);
}
.dot.sev-negligible {
  background: transparent;
  border: 1.5px solid var(--pd-status-stopped);
}
.cb input:disabled {
  visibility: hidden;
}
.dot.created {
  background: transparent;
  border: 1.5px solid var(--pd-status-stopped);
}
.acts {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  padding-right: 8px;
  opacity: 0;
  color: var(--pd-action-button-details-text);
}
.item:hover .acts,
.grp:hover .acts,
.hl .acts,
.acts.always {
  opacity: 1;
}
.ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--pd-action-button-details-text);
}
.grid-v .ghost {
  height: 20px;
  width: 20px;
}
.ghost:hover {
  color: var(--pd-action-button-details-hover-text);
  background: var(--pd-action-button-details-bg);
}
.ghost:disabled {
  opacity: 0.3;
}
.ghost.danger:hover,
.ghost-txt.danger:hover {
  color: var(--pd-status-dead);
}
.bulk {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  background: color-mix(in srgb, var(--accent) 12%, var(--pd-content-bg));
  border-bottom: 1px solid var(--line);
  animation: slide 120ms ease-out;
}
@keyframes slide {
  from {
    transform: translateY(-6px);
    opacity: 0;
  }
}
.ghost-txt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  color: var(--pd-content-header);
}
.ghost-txt.lbl {
  white-space: nowrap;
  border: 1px solid var(--pd-button-secondary-border, var(--pd-content-divider));
  border-radius: 6px;
}
.ghost-txt:disabled {
  opacity: 0.4;
}
.ghost-txt:hover {
  background: var(--pd-action-button-details-bg);
}
/* Grid: vertical lines, gutter, filter row */
.grid-v .row > * {
  border-right: 1px solid var(--line);
  height: 100%;
  display: flex;
  align-items: center;
}
.grid-v .cell.num {
  justify-content: flex-end;
}
.gut {
  justify-content: flex-end;
  padding-right: 6px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--pd-table-body-text);
  background: var(--pd-content-card-bg, transparent);
  width: 100%;
}
.filt {
  height: 24px;
}
.fin {
  width: 100%;
  height: 100%;
  padding: 0 8px;
  font-size: 11px;
  background: transparent;
  color: var(--pd-content-header);
  outline: none;
}
.fin::placeholder {
  color: var(--pd-table-body-text);
  opacity: 0.6;
}
.fin:focus {
  box-shadow: inset 0 0 0 1px var(--accent);
}
</style>
