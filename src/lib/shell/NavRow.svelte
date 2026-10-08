<script lang="ts">
/**
 * Primary-nav row. Markup and classes follow PD's NavItem.svelte
 * (36px rows, 4px selection bar, global-nav tokens), extended with an
 * optional status dot, hint chip and a hover menu (pin / hide).
 */
import { Tooltip } from '@podman-desktop/ui-svelte';
import type { Snippet } from 'svelte';

import { href as toHref } from '#lib/nav.ts';

interface Props {
  href: string;
  label: string;
  tooltip?: string;
  selected: boolean;
  expanded: boolean;
  /** Status dot class (bg-[var(--pd-status-…)]) drawn over the icon. */
  dotClass?: string;
  hint?: string;
  hintTooltip?: string;
  counter?: number;
  dimmed?: boolean;
  icon: Snippet;
  menu?: Snippet;
}

let {
  href,
  label,
  tooltip,
  selected,
  expanded,
  dotClass,
  hint,
  hintTooltip,
  counter,
  dimmed = false,
  icon,
  menu,
}: Props = $props();

const tip = $derived(tooltip ?? label);
</script>

<div class="group/navrow relative">
  <a
    href={toHref(href)}
    class="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--pd-global-nav-icon-selected-highlight)]"
    aria-label={label}
    aria-current={selected ? 'page' : undefined}>
    <div
      class="flex py-2 px-2.5 items-center cursor-pointer min-h-9 border-l-[4px] text-[color:var(--pd-global-nav-icon)]"
      class:border-l-[var(--pd-global-nav-icon-selected-highlight)]={selected}
      class:bg-[var(--pd-global-nav-icon-selected-bg)]={selected}
      class:border-l-[var(--pd-global-nav-bg)]={!selected}
      class:hover:bg-[var(--pd-global-nav-icon-hover-bg)]={!selected}
      class:opacity-50={dimmed}>
      <Tooltip right tip={expanded ? undefined : tip} class="flex items-center w-full min-w-0" containerClass="relative w-full min-w-0">
        <div class="flex items-center w-full min-w-0">
          <div class="relative flex items-center justify-center flex-shrink-0 w-6 h-6">
            {@render icon()}
            {#if dotClass}
              <span
                class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--pd-global-nav-bg)] {dotClass}"
                aria-hidden="true"></span>
            {/if}
          </div>
          {#if expanded}
            <span class="text-sm truncate ml-3 flex-1 min-w-0" class:font-medium={selected}>{label}</span>
            {#if hint}
              <span
                class="ml-1 shrink-0 rounded-sm px-1 text-[9px] leading-[14px] font-semibold uppercase bg-[var(--pd-nav-hint-bg)] text-[var(--pd-nav-hint-text)] group-hover/navrow:hidden"
                title={hintTooltip ?? hint}>{hint}</span>
            {/if}
            {#if counter !== undefined}
              <span class="ml-1 shrink-0 text-xs text-[var(--pd-global-nav-icon)] group-hover/navrow:hidden">{counter}</span>
            {/if}
          {/if}
        </div>
      </Tooltip>
    </div>
  </a>
  {#if expanded && menu}
    <div class="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/navrow:flex group-has-[:focus-visible]/navrow:flex">
      {@render menu()}
    </div>
  {/if}
</div>
