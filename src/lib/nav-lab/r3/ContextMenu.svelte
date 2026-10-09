<script lang="ts">
/** Global context menu (right-click / ⋮) driven by `live.menu`. */
import LabIcon from '../ui/LabIcon.svelte';

import { live, type MenuItem } from './live.svelte.ts';

let el = $state<HTMLDivElement>();

function close(): void {
  live.menu = undefined;
}

function pick(it: MenuItem): void {
  if (it.disabled) return;
  close();
  it.run?.();
}

function onpointer(e: PointerEvent): void {
  if (live.menu && el && !el.contains(e.target as Node)) close();
}
</script>

<svelte:window onpointerdown={onpointer} onkeydown={(e): void => { if (e.key === 'Escape') close(); }} onblur={close} />

{#if live.menu}
  <div
    bind:this={el}
    role="menu"
    data-testid="nav-lab-context-menu"
    class="fixed z-[100] min-w-52 py-1 rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] text-[var(--pd-dropdown-item-text)] shadow-xl text-base"
    style:left="{live.menu.x}px"
    style:top="{live.menu.y}px">
    {#each live.menu.items as it, i (i)}
      {#if it.sep}<div class="my-1 border-t border-[var(--pd-content-divider)]"></div>{/if}
      <button
        type="button"
        role="menuitem"
        aria-disabled={it.disabled}
        class="w-full flex items-center gap-2 h-7 px-3 text-left whitespace-nowrap {it.disabled ? 'opacity-40 cursor-default' : 'hover:bg-[var(--pd-dropdown-item-hover-bg)]'}"
        class:text-[var(--pd-status-dead)]={it.danger && !it.disabled}
        onclick={(): void => pick(it)}>
        <span class="w-4 flex justify-center shrink-0">{#if it.icon}<LabIcon icon={it.icon} size={14} />{/if}</span>{it.label}
      </button>
    {/each}
  </div>
{/if}
