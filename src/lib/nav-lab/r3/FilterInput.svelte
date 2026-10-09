<script lang="ts">
/**
 * P13 compact filter field, the one search/filter control everywhere (list
 * headers, tree filter, scan tab): 28px, rounded-md, subtle filled background,
 * 1px border on focus only, 14px icon, clear ✕ and an optional `/` hint;
 * `/` and Ctrl+F focus it.
 */
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import LabIcon from '../ui/LabIcon.svelte';

interface Props {
  value: string;
  placeholder: string;
  /** Show the `/` hint and focus on `/` (one per screen). */
  kbd?: boolean;
  class?: string;
  testid?: string;
}

let { value = $bindable(), placeholder, kbd = false, class: cls = '', testid }: Props = $props();
let input = $state<HTMLInputElement>();
let focused = $state(false);

function onkey(e: KeyboardEvent): void {
  if (!kbd || e.defaultPrevented) return;
  // Ctrl+F focuses the list filter (code / log views handle Ctrl+F themselves first), rule F27.
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    input?.focus();
    input?.select();
    return;
  }
  if (e.key !== '/' || e.ctrlKey || e.metaKey) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  e.preventDefault();
  input?.focus();
}
</script>

<svelte:window onkeydown={onkey} />

<label
  data-testid={testid}
  class="flex items-center gap-1.5 h-7 px-2 rounded-md border text-[var(--pd-input-field-icon)] bg-[var(--pd-input-field-focused-bg)] {focused ? 'border-[var(--pd-input-field-hover-stroke)]' : 'border-transparent'} {cls}">
  <LabIcon icon={faMagnifyingGlass} size={14} />
  <input
    bind:this={input}
    bind:value
    aria-label={placeholder}
    {placeholder}
    class="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]"
    onfocus={(): void => void (focused = true)}
    onblur={(): void => void (focused = false)}
    onkeydown={(e): void => {
      if (e.key === 'Escape') {
        value = '';
        input?.blur();
      }
    }} />
  {#if value}
    <button type="button" aria-label="Clear filter" class="flex w-4 h-4 items-center justify-center rounded hover:text-[var(--pd-input-field-focused-text)]" onclick={(): void => { value = ''; input?.focus(); }}><AppIcon icon={faXmark} size="11px" /></button>
  {:else if kbd && !focused}
    <kbd class="px-1 rounded border border-[var(--pd-content-divider)] text-[11px] leading-4 font-sans">/</kbd>
  {/if}
</label>
