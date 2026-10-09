<script lang="ts">
/**
 * Fixed-position popover anchored to an element (escapes overflow containers).
 * Styled like ui-svelte's DropDownMenuItems (dropdown tokens).
 */
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  anchor: HTMLElement | undefined;
  placement?: 'right-start' | 'bottom-end' | 'bottom-start' | 'top-start' | 'top-end';
  class?: string;
  /** Use dropdown tokens (default) or the modal surface. */
  surface?: 'dropdown' | 'modal';
  onclose: () => void;
  children: Snippet;
}

let { open, anchor, placement = 'bottom-end', class: className = '', surface = 'dropdown', onclose, children }: Props =
  $props();

let panel: HTMLDivElement | undefined = $state();
let style = $state('');

$effect(() => {
  if (!open || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  switch (placement) {
    case 'right-start': {
      // keep the whole panel on screen (above the 24px status bar)
      const h = panel?.offsetHeight ?? 0;
      style = `left:${r.right + 4}px; top:${Math.max(44, Math.min(r.top, vh - h - 32))}px;`;
      break;
    }
    case 'bottom-start':
      style = `left:${r.left}px; top:${r.bottom + 4}px;`;
      break;
    case 'top-start':
      style = `left:${r.left}px; bottom:${vh - r.top + 4}px;`;
      break;
    case 'top-end':
      style = `right:${vw - r.right}px; bottom:${vh - r.top + 4}px;`;
      break;
    default:
      style = `right:${vw - r.right}px; top:${r.bottom + 4}px;`;
  }
});

function onWindowPointerDown(e: PointerEvent): void {
  if (!open) return;
  const target = e.target as Node;
  if (panel?.contains(target) || anchor?.contains(target)) return;
  onclose();
}

function onKeydown(e: KeyboardEvent): void {
  if (open && e.key === 'Escape') onclose();
}
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onKeydown} />

{#if open}
  <div
    bind:this={panel}
    role="menu"
    tabindex="-1"
    class="fixed z-50 rounded-md shadow-lg max-h-[calc(100vh-80px)] overflow-y-auto {surface === 'dropdown'
      ? 'bg-[var(--pd-dropdown-bg)] ring-2 ring-[var(--pd-dropdown-ring)]'
      : 'bg-[var(--pd-modal-bg)] border border-[var(--pd-modal-border)]'} {className}"
    style={style}>
    {@render children()}
  </div>
{/if}
