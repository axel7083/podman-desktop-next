<script lang="ts">
/**
 * P13 Views query field, GitHub-style: a raw input over a highlighted copy of
 * the query, and a listbox of qualifiers then values at the term being edited.
 * Keyboard: arrows move, Enter or Tab accept, Escape closes, `/` and Ctrl+F focus.
 */
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { tick } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import Popover from '#lib/components/Popover.svelte';

import LabIcon from '../ui/LabIcon.svelte';
import { parseQuery, type QueryTerm, termAt } from './query/parse.ts';
import { applySuggestion, type Suggestion, suggest } from './query/suggest.ts';

interface Props {
  value: string;
  currentConnId?: string;
  focusOnMount?: boolean;
  placeholder?: string;
  oninput: (value: string) => void;
}

let { value, currentConnId, focusOnMount = false, placeholder = 'Filter resources, or pick a filter', oninput }: Props = $props();

const LIST_ID = 'view-suggestions';

let input = $state<HTMLInputElement>();
let marker = $state<HTMLElement>();
let open = $state(false);
let focused = $state(false);
let caret = $state(0);
let sel = $state(-1);
let scroll = $state(0);
let list = $state<HTMLElement>();

const terms = $derived(parseQuery(value));
const active = $derived(termAt(terms, caret));
const suggestions = $derived(open ? suggest(value, caret, { currentConnId }) : []);
/** Group headers, in the order the suggestions come. */
const firstOfGroup = $derived(new Set(suggestions.filter((s, i) => s.group && s.group !== suggestions[i - 1]?.group).map(s => s.id)));

interface Piece {
  text: string;
  cls: string;
}
interface Seg {
  start: number;
  pieces: Piece[];
}

function piecesOf(t: QueryTerm, raw: string): Piece[] {
  if (!t.key) return [{ text: raw, cls: t.negated ? 'q-neg' : '' }];
  const colon = raw.indexOf(':');
  if (!t.valid) return [{ text: raw, cls: 'q-bad' }];
  return [
    { text: raw.slice(0, colon + 1), cls: 'q-key' },
    { text: raw.slice(colon + 1), cls: t.value === '@current' ? 'q-me' : 'q-val' },
  ];
}

const segs = $derived.by((): Seg[] => {
  const out: Seg[] = [];
  let pos = 0;
  for (const t of terms) {
    if (t.start > pos) out.push({ start: pos, pieces: [{ text: value.slice(pos, t.start), cls: '' }] });
    out.push({ start: t.start, pieces: piecesOf(t, value.slice(t.start, t.end)) });
    pos = t.end;
  }
  if (pos < value.length) out.push({ start: pos, pieces: [{ text: value.slice(pos), cls: '' }] });
  return out;
});

/** The dropdown hangs under the term being edited. */
const anchorAt = $derived(active?.start ?? value.length);

function resetSel(): void {
  sel = active?.key ? 0 : -1;
}

function syncFromInput(): void {
  if (!input) return;
  caret = input.selectionStart ?? value.length;
  scroll = input.scrollLeft;
}

function onInput(e: Event & { currentTarget: HTMLInputElement }): void {
  oninput(e.currentTarget.value);
  syncFromInput();
  open = true;
  resetSel();
}

function moveCaret(): void {
  const before = caret;
  syncFromInput();
  if (caret !== before) resetSel();
}

async function pick(s: Suggestion): Promise<void> {
  const next = applySuggestion(value, caret, s);
  oninput(next.text);
  caret = next.caret;
  open = true;
  await tick();
  input?.focus();
  input?.setSelectionRange(next.caret, next.caret);
  syncFromInput();
  resetSel();
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!open) {
      open = true;
      return;
    }
    const n = suggestions.length;
    if (n) sel = e.key === 'ArrowDown' ? (sel + 1) % n : (sel <= 0 ? n : sel) - 1;
  } else if ((e.key === 'Enter' || e.key === 'Tab') && open && sel >= 0 && suggestions[sel]) {
    // Without a highlighted option Tab keeps moving the focus and Enter just closes.
    e.preventDefault();
    pick(suggestions[sel]).catch(console.error);
  } else if (e.key === 'Enter' || e.key === 'Escape') {
    if (open) e.preventDefault();
    open = false;
  }
}

function onWindowKey(e: KeyboardEvent): void {
  if (e.defaultPrevented) return;
  const t = e.target as HTMLElement | null;
  const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  const find = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f';
  if (find || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey)) {
    e.preventDefault();
    input?.focus();
  }
}

function clear(): void {
  oninput('');
  caret = 0;
  scroll = 0;
  input?.focus();
  open = true;
  sel = -1;
}

$effect(() => {
  if (focusOnMount) input?.focus();
});

$effect(() => {
  if (sel >= 0) list?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
});
</script>

<svelte:window onkeydown={onWindowKey} />

<div
  data-testid="view-query-field"
  class="flex items-center gap-1.5 h-8 px-2 rounded-md border bg-[var(--pd-input-field-focused-bg)] text-[var(--pd-input-field-icon)] {focused ? 'border-[var(--pd-input-field-hover-stroke)]' : 'border-[var(--pd-input-field-stroke)]'}">
  <LabIcon icon={faMagnifyingGlass} size={14} />
  <div class="relative flex-1 min-w-0 h-full overflow-hidden text-[13px]">
    <div aria-hidden="true" class="mirror" style:transform="translateX({-scroll}px)">
      {#each segs as seg (seg.start)}
        <span>{#if seg.start === anchorAt}<span bind:this={marker} class="marker"></span>{/if}{#each seg.pieces as p, i (i)}<span class={p.cls}>{p.text}</span>{/each}</span>
      {/each}
      {#if !segs.some(s => s.start === anchorAt)}<span bind:this={marker} class="marker"></span>{/if}
    </div>
    <input
      bind:this={input}
      {value}
      {placeholder}
      data-testid="view-query"
      role="combobox"
      aria-label="Query"
      aria-expanded={open && suggestions.length > 0}
      aria-controls={LIST_ID}
      aria-autocomplete="list"
      aria-activedescendant={sel >= 0 && suggestions[sel] ? `${LIST_ID}-${sel}` : undefined}
      autocomplete="off"
      spellcheck="false"
      class="query absolute inset-0 w-full h-full bg-transparent outline-none placeholder:text-[var(--pd-input-field-placeholder-text)]"
      oninput={onInput}
      onkeydown={onKeydown}
      onkeyup={moveCaret}
      onclick={(): void => {
        syncFromInput();
        open = true;
        resetSel();
      }}
      onscroll={syncFromInput}
      onfocus={(): void => {
        focused = true;
        syncFromInput();
        open = true;
        resetSel();
      }}
      onblur={(): void => {
        focused = false;
        open = false;
      }} />
  </div>
  {#if value}
    <button type="button" aria-label="Clear query" data-testid="view-query-clear" class="flex w-4 h-4 items-center justify-center rounded text-[10px] hover:text-[var(--pd-input-field-focused-text)]" onclick={clear}><AppIcon icon={faXmark} /></button>
  {/if}
</div>

<Popover open={open && suggestions.length > 0} anchor={marker} placement="bottom-start" role="presentation" class="w-[380px] !max-h-[340px]" onclose={(): void => void (open = false)}>
  <ul
    bind:this={list}
    id={LIST_ID}
    role="listbox"
    aria-label="Query suggestions"
    data-testid="view-suggestions"
    class="py-1 text-[12px]"
    onmousedown={(e): void => e.preventDefault()}>
    {#each suggestions as s, i (s.id)}
      {#if firstOfGroup.has(s.id)}
        <li role="presentation" class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">{s.group}</li>
      {/if}
      <li
        id="{LIST_ID}-{i}"
        role="option"
        aria-selected={i === sel}
        data-idx={i}
        data-testid="view-suggestion"
        data-id={s.id}
        class="flex items-center gap-2 h-7 px-3 cursor-pointer text-[var(--pd-dropdown-item-text)] {i === sel ? 'bg-[var(--pd-dropdown-item-hover-bg)]' : ''}"
        onmouseenter={(): void => void (sel = i)}
        onclick={(): void => void pick(s).catch(console.error)}
        onkeydown={(e): void => {
          if (e.key === 'Enter') pick(s).catch(console.error);
        }}>
        {#if s.icon}<LabIcon icon={s.icon} size={14} />{/if}
        <span class="truncate">{s.label}</span>
        {#if s.detail}<span class="truncate text-[11px] text-[var(--pd-table-body-text)]">{s.detail}</span>{/if}
        <span class="flex-1"></span>
        {#if s.count !== undefined}<span class="shrink-0 text-[11px] text-[var(--pd-table-body-text)]">{s.count}</span>{/if}
      </li>
    {/each}
  </ul>
</Popover>

<style>
.mirror {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  white-space: pre;
  pointer-events: none;
  color: var(--pd-input-field-focused-text);
}
.marker {
  /* Out of flow: keeps its horizontal position, spans the field, never shifts the text. */
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
}
.query {
  /* The mirror shows the text; the input keeps the caret and the selection. */
  color: transparent;
  caret-color: var(--pd-input-field-focused-text);
}
.q-key {
  color: var(--pd-input-field-focused-text);
}
.q-val {
  color: var(--pd-link);
}
.q-me {
  color: var(--pd-link);
  background: color-mix(in srgb, var(--pd-link) 18%, transparent);
  border-radius: 3px;
}
.q-neg {
  color: var(--pd-table-body-text);
}
.q-bad {
  color: var(--pd-input-field-error-text);
  text-decoration: underline wavy;
}
</style>
