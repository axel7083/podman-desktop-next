<script lang="ts" module>
import type { IconRef } from '#lib/ext/types.ts';

export interface NavEntry {
  id: string;
  label: string;
  icon: IconRef;
  count?: number;
  /** Extension icon (contributed section). */
  ext?: string;
  /** Connection badge (favourite connection+kind pair). */
  connId?: string;
  /** Nested under Kubernetes. */
  child?: boolean;
  /** Overlay H colour dot. */
  color?: string;
}
</script>

<script lang="ts">
/**
 * Today's PD left navigation (Dashboard, Containers, Pods, Images, Volumes,
 * Networks, Kubernetes ▸ sections, Extensions, Accounts, Settings) with an
 * optional "Pinned" favourites block. Collapses to a 48px icon column.
 */
import { faStar } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import TabIcon from '../ui/TabIcon.svelte';
import { ACCOUNTS_ICON, DASHBOARD_ICON, EXTENSIONS_ICON, SETTINGS_ICON } from './ctx.ts';

interface Props {
  entries: NavEntry[];
  favourites?: NavEntry[];
  selected?: string;
  collapsed?: boolean;
  onselect: (id: string) => void;
  /** Hide Dashboard (P9 has it as home tab). */
  dashboard?: boolean;
  label?: string;
  favTitle?: string;
}

let { entries, favourites = [], selected, collapsed = false, onselect, dashboard = true, label = 'Navigation', favTitle = 'Pinned' }: Props = $props();

const bottom: NavEntry[] = [
  { id: 'extensions', label: 'Extensions', icon: EXTENSIONS_ICON },
  { id: 'accounts', label: 'Accounts', icon: ACCOUNTS_ICON },
  { id: 'settings', label: 'Settings', icon: SETTINGS_ICON },
];
</script>

{#snippet item(e: NavEntry)}
  {@const sel = selected === e.id}
  <button
    type="button"
    title={e.label}
    aria-current={sel ? 'page' : undefined}
    class="relative w-full flex items-center gap-2.5 text-left text-[var(--pd-global-nav-icon)] hover:bg-[var(--pd-global-nav-icon-hover-bg)] {collapsed ? 'justify-center h-10' : e.child ? 'h-7 pl-9 pr-2 text-sm' : 'h-9 pl-3.5 pr-2'}"
    class:bg-[var(--pd-global-nav-icon-selected-bg)]={sel}
    class:text-[var(--pd-global-nav-icon-selected)]={sel}
    onclick={(): void => onselect(e.id)}>
    {#if sel}<span class="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[var(--pd-global-nav-icon-selected-highlight)]"></span>{/if}
    {#if !(e.child && !collapsed)}
      <span class="w-5 flex justify-center shrink-0" style:font-size="16px">
        {#if e.connId}<TabIcon icon={e.icon} connId={e.connId} size={18} />{:else}<AppIcon icon={e.icon} size="18px" />{/if}
      </span>
    {/if}
    {#if !collapsed}
      <span class="flex-1 truncate">{e.label}</span>
      {#if e.color}<span class="w-2 h-2 rounded-full shrink-0" style:background={e.color}></span>{/if}
      {#if e.ext}<AppIcon icon={e.ext} size="12px" />{/if}
      {#if e.count !== undefined}<span class="text-sm opacity-60 tabular-nums">{e.count}</span>{/if}
    {:else if e.color}
      <span class="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full" style:background={e.color}></span>
    {/if}
  </button>
{/snippet}

<nav aria-label={label} class="flex flex-col shrink-0 h-full bg-[var(--pd-global-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)] {collapsed ? 'w-12' : 'w-[200px]'}">
  <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1.5 flex flex-col">
    {#if dashboard}{@render item({ id: 'dashboard', label: 'Dashboard', icon: DASHBOARD_ICON })}{/if}
    {#each entries as e (e.id)}{@render item(e)}{/each}
    {#if favourites.length}
      {#if collapsed}
        <div class="mx-3 my-1.5 border-t border-[var(--pd-global-nav-bg-border)]"></div>
      {:else}
        <div class="flex items-center gap-1.5 px-3.5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]"><AppIcon icon={faStar} size="10px" />{favTitle}</div>
      {/if}
      {#each favourites as e (e.id)}{@render item(e)}{/each}
    {/if}
  </div>
  <div class="py-1.5 border-t border-[var(--pd-global-nav-bg-border)]">
    {#each bottom as e (e.id)}{@render item(e)}{/each}
  </div>
</nav>
