<script lang="ts">
/**
 * Read-only code / log view with simple syntax colouring (json, yaml, ini,
 * log) and an in-content find bar: Ctrl/Cmd+F while focus is inside (or the
 * search icon) opens it; n/m matches, prev/next (Enter / Shift+Enter),
 * highlighted matches, Escape closes.
 */
import { faArrowDown, faArrowUp, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { type Snippet, tick } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

type Lang = 'json' | 'yaml' | 'ini' | 'log' | 'plain';

interface Props {
  lines: string[];
  lang?: Lang;
  numbered?: boolean;
  /** Extra classes (background / text colours). */
  class?: string;
  testid?: string;
  /** Keep the view scrolled to the bottom (streaming logs). */
  follow?: boolean;
  /** Soft-wrap long lines. */
  wrap?: boolean;
  /** Show the floating find button (off when a toolbar owns it). */
  findButton?: boolean;
  /** Optional trailing content of a line (e.g. an inline action), right-aligned. */
  lineaction?: Snippet<[line: string, index: number]>;
  /** Optional right-click handler of a line (index in `lines`). */
  onlinecontextmenu?: (e: MouseEvent, line: string, index: number) => void;
}

let { lines, lang = 'plain', numbered = false, class: cls = 'bg-[var(--pd-code-block-bg)] text-[var(--pd-code-block-text)]', testid, follow = false, wrap = false, findButton = true, lineaction, onlinecontextmenu }: Props = $props();

let open = $state(false);
let query = $state('');
let current = $state(0);
let input = $state<HTMLInputElement>();
let scroller = $state<HTMLDivElement>();

interface Tok {
  t: string;
  c?: string;
}

const KEY = 'text-[var(--pd-status-starting)]';
const STR = 'text-[var(--pd-status-running)]';
const NUM = 'text-[var(--pd-status-degraded)]';
const SEC = 'text-[var(--pd-link)] font-semibold';
const DIM = 'opacity-50';

function tokens(line: string): Tok[] {
  if (lang === 'ini') {
    if (/^\s*[#;]/.test(line)) return [{ t: line, c: DIM }];
    if (/^\s*\[.*\]\s*$/.test(line)) return [{ t: line, c: SEC }];
    const m = /^(\s*)([A-Za-z][\w.-]*)(=)(.*)$/.exec(line);
    if (m) return [{ t: m[1] }, { t: m[2], c: KEY }, { t: m[3], c: DIM }, { t: m[4], c: STR }];
    return [{ t: line }];
  }
  if (lang === 'yaml') {
    if (/^\s*#/.test(line)) return [{ t: line, c: DIM }];
    const m = /^(\s*-?\s*)([\w./-]+)(:)(.*)$/.exec(line);
    if (m) return [{ t: m[1] }, { t: m[2], c: KEY }, { t: m[3], c: DIM }, { t: m[4], c: /^\s*\d+$/.test(m[4]) ? NUM : STR }];
    return [{ t: line }];
  }
  if (lang === 'json') {
    const out: Tok[] = [];
    const re = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;
    let last = 0;
    for (let m = re.exec(line); m; m = re.exec(line)) {
      if (m.index > last) out.push({ t: line.slice(last, m.index) });
      if (m[1]) {
        out.push({ t: m[1], c: m[2] ? KEY : STR });
        if (m[2]) out.push({ t: m[2] });
      } else out.push({ t: m[0], c: NUM });
      last = m.index + m[0].length;
    }
    if (last < line.length) out.push({ t: line.slice(last) });
    return out;
  }
  if (lang === 'log') {
    if (/ERROR|error/.test(line)) return [{ t: line, c: 'text-[var(--pd-status-dead)]' }];
    if (/WARN|warn/.test(line)) return [{ t: line, c: 'text-[var(--pd-status-degraded)]' }];
    const m = /^(\S+ \S+)(.*)$/.exec(line);
    if (m && /^\d{4}-|^[A-Z][a-z]{2} /.test(line)) return [{ t: m[1], c: DIM }, { t: m[2] }];
    return [{ t: line }];
  }
  return [{ t: line }];
}

interface Seg {
  t: string;
  c?: string;
  /** Match index (highlighted). */
  m?: number;
}

const view = $derived.by(() => {
  const q = open ? query.toLowerCase() : '';
  let n = 0;
  const rows: Seg[][] = lines.map(line => {
    const toks = tokens(line);
    if (!q) return toks;
    const out: Seg[] = [];
    for (const tk of toks) {
      const low = tk.t.toLowerCase();
      let i = 0;
      for (let j = low.indexOf(q); j >= 0; j = low.indexOf(q, i)) {
        if (j > i) out.push({ t: tk.t.slice(i, j), c: tk.c });
        out.push({ t: tk.t.slice(j, j + q.length), c: tk.c, m: n++ });
        i = j + q.length;
      }
      if (i < tk.t.length) out.push({ t: tk.t.slice(i), c: tk.c });
    }
    return out;
  });
  return { rows, count: n };
});

$effect(() => {
  void query;
  current = 0;
});

$effect(() => {
  if (!open || !view.count) return;
  const i = current;
  tick().then(() => scroller?.querySelector(`[data-m="${i}"]`)?.scrollIntoView({ block: 'nearest' }));
});

$effect(() => {
  if (!follow || open) return;
  void lines.length;
  tick().then(() => scroller && (scroller.scrollTop = scroller.scrollHeight));
});

/** Open the find bar (called by an owning toolbar). */
export function find(): void {
  void show();
}

async function show(): Promise<void> {
  open = true;
  await tick();
  input?.focus();
  input?.select();
}

function step(d: number): void {
  if (!view.count) return;
  current = (current + d + view.count) % view.count;
}

function onkey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    e.stopPropagation();
    void show();
  } else if (e.key === 'Escape' && open) {
    open = false;
  }
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  role="region"
  aria-label="Content"
  tabindex="0"
  data-testid={testid}
  class="relative flex-1 min-h-0 flex flex-col outline-none {cls}"
  onkeydown={onkey}>
  <div class="absolute right-3 top-2 z-10 flex items-center gap-1">
    {#if open}
      <div data-testid="find-bar" class="flex items-center gap-1 h-7 pl-2 pr-1 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] shadow-lg text-[12px] text-[var(--pd-input-field-focused-text)]">
        <AppIcon icon={faMagnifyingGlass} size="xs" />
        <input
          bind:this={input}
          bind:value={query}
          aria-label="Find"
          placeholder="Find"
          class="w-40 bg-transparent outline-none placeholder:text-[var(--pd-input-field-placeholder-text)]"
          onkeydown={(e): void => {
            if (e.key === 'Enter') step(e.shiftKey ? -1 : 1);
          }} />
        <span data-testid="find-count" class="tabular-nums opacity-70 w-14 text-right">{query ? (view.count ? `${current + 1}/${view.count}` : 'No results') : ''}</span>
        <button type="button" aria-label="Previous match" class="w-5 h-5 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => step(-1)}><AppIcon icon={faArrowUp} size="xs" /></button>
        <button type="button" aria-label="Next match" class="w-5 h-5 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => step(1)}><AppIcon icon={faArrowDown} size="xs" /></button>
        <button type="button" aria-label="Close find" class="w-5 h-5 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => { open = false; }}><AppIcon icon={faXmark} size="xs" /></button>
      </div>
    {:else if findButton}
      <button type="button" aria-label="Find (Ctrl+F)" title="Find (Ctrl+F)" class="w-7 h-7 rounded-md opacity-60 hover:opacity-100 hover:bg-[var(--pd-content-card-hover-bg)]" onclick={show}><AppIcon icon={faMagnifyingGlass} size="xs" /></button>
    {/if}
  </div>
  <div bind:this={scroller} class="flex-1 min-h-0 overflow-auto py-3 font-mono text-[12px] leading-5">
    {#each view.rows as segs, i (i)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex pr-4 {wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}"
        class:pl-4={!numbered}
        class:group={!!lineaction}
        class:items-center={!!lineaction}
        oncontextmenu={onlinecontextmenu ? (e): void => onlinecontextmenu(e, lines[i], i) : undefined}>
        {#if numbered}<span class="w-10 shrink-0 pr-3 text-right select-none opacity-40">{i + 1}</span>{/if}
        <span>{#each segs as s, j (j)}{#if s.m !== undefined}<mark data-m={s.m} class="rounded-sm text-inherit {s.c ?? ''} {s.m === current ? 'bg-[var(--pd-status-degraded)] !text-black' : 'bg-[color-mix(in_srgb,var(--pd-status-degraded)_35%,transparent)]'}">{s.t}</mark>{:else if s.c}<span class={s.c}>{s.t}</span>{:else}{s.t}{/if}{/each}</span>
        {#if lineaction}{@render lineaction(lines[i], i)}{/if}
      </div>
    {/each}
  </div>
</div>
