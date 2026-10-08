<script lang="ts">
/** Menu row styled like ui-svelte DropDownMenuItem, usable inside Popover. */
import type { Snippet } from 'svelte';

import type { IconRef } from '#lib/ext/types.ts';

import AppIcon from './AppIcon.svelte';

interface Props {
  title: string;
  icon?: IconRef;
  enabled?: boolean;
  detail?: string;
  onclick: () => void;
  trailing?: Snippet;
}

let { title, icon, enabled = true, detail, onclick, trailing }: Props = $props();
</script>

<button
  role="menuitem"
  disabled={!enabled}
  class="w-full text-left p-2.5 flex items-center gap-2 whitespace-nowrap rounded-md {enabled
    ? 'hover:bg-[var(--pd-dropdown-item-hover-bg)] hover:text-[var(--pd-dropdown-item-hover-text)] text-[var(--pd-dropdown-item-text)]'
    : 'text-[var(--pd-dropdown-disabled-item-text)]'}"
  onclick={onclick}>
  {#if icon}
    <span class="w-4 flex justify-center shrink-0"><AppIcon icon={icon} size="16px" /></span>
  {/if}
  <span class="grow truncate">{title}</span>
  {#if detail}
    <span class="text-xs text-[var(--pd-content-sub-header)]">{detail}</span>
  {/if}
  {@render trailing?.()}
</button>
