<script lang="ts">
/**
 * Secondary-nav row: classes from ui-svelte SettingsNavItem (4px selection
 * bar, secondary-nav tokens) plus a counter and an extension badge.
 */
import type { Snippet } from 'svelte';

import { href as toHref } from '#lib/nav.ts';

interface Props {
  href: string;
  title: string;
  selected: boolean;
  counter?: number;
  dimmed?: boolean;
  icon?: Snippet;
  badge?: Snippet;
}

let { href, title, selected, counter, dimmed = false, icon, badge }: Props = $props();
</script>

<a class="no-underline block w-full" href={toHref(href)} aria-label={title} title={title} aria-current={selected ? 'page' : undefined}>
  <div
    class="flex box-border w-full py-2 pl-3 pr-3 items-center cursor-pointer border-l-[4px] font-medium"
    class:bg-[var(--pd-secondary-nav-selected-bg)]={selected}
    class:border-[var(--pd-secondary-nav-bg)]={!selected}
    class:border-[var(--pd-secondary-nav-selected-highlight)]={selected}
    class:text-[color:var(--pd-secondary-nav-text-selected)]={selected}
    class:text-[color:var(--pd-secondary-nav-text)]={!selected}
    class:hover:text-[color:var(--pd-secondary-nav-text-hover)]={!selected}
    class:hover:bg-[var(--pd-secondary-nav-text-hover-bg)]={!selected}
    class:opacity-60={dimmed}>
    <span class="flex flex-row gap-x-2 items-center min-w-0 grow">
      {#if icon}
        <span class="w-4 shrink-0 flex justify-center">{@render icon()}</span>
      {/if}
      <!-- labels never ellipsize at 170px: they wrap to two lines ("ConfigMaps & Secrets") -->
      <span class="block min-w-0 leading-tight line-clamp-2 [overflow-wrap:anywhere]">{title}</span>
    </span>
    {#if badge}
      <span class="ml-1 shrink-0 flex items-center">{@render badge()}</span>
    {/if}
    {#if counter !== undefined}
      <span class="ml-1.5 shrink-0 text-xs font-normal text-[var(--pd-table-body-text)] tabular-nums">{counter}</span>
    {/if}
  </div>
</a>
