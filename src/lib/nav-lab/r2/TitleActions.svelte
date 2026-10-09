<script lang="ts">
/**
 * Title-bar global destinations (P13/P14): no rail, the places every desktop
 * app already has. Left: Dashboard (home). Right: notifications, Extensions,
 * Accounts, Settings.
 */
import { faBell } from '@fortawesome/free-solid-svg-icons';

import LabIcon from '../ui/LabIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import type { LabTarget } from '../data.ts';
import { flows } from '../r3/flows.svelte.ts';
import { ACCOUNTS_ICON, DASHBOARD_ICON, EXTENSIONS_ICON, SETTINGS_ICON } from './ctx.ts';

interface Props {
  side: 'left' | 'right';
  /** Kind of the active global page (highlighted). */
  active?: string;
  onopen: (t: LabTarget) => void;
  /** Show the Dashboard icon on the left (P13 has a Dashboard tab instead). */
  dashboard?: boolean;
}

let { side, active, onopen, dashboard = true }: Props = $props();

const RIGHT: [LabTarget['kind'], string, IconRef][] = [
  ['extensions', 'Extensions', EXTENSIONS_ICON],
  ['accounts', 'Accounts', ACCOUNTS_ICON],
  ['settings', 'Settings', SETTINGS_ICON],
];
</script>

{#snippet icon(kind: LabTarget['kind'] | 'notifications', label: string, ic: IconRef)}
  <button
    type="button"
    aria-label={label}
    title={label}
    class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--pd-titlebar-hover-bg)] hover:text-[var(--pd-titlebar-icon-hover)]"
    class:bg-[var(--pd-titlebar-hover-bg)]={active === kind}
    class:!text-[var(--pd-global-nav-icon-selected)]={active === kind}
    onclick={(): void => { if (kind !== 'notifications') onopen({ kind }); }}>
    <LabIcon icon={ic} size={16} />
  </button>
{/snippet}

{#if side === 'left'}
  <span class="text-base font-semibold">Podman Desktop</span>
  {#if dashboard}
    <span class="w-px h-4 mx-1 bg-[var(--pd-global-nav-bg-border)]"></span>
    {@render icon('dashboard', 'Dashboard', DASHBOARD_ICON)}
  {/if}
{:else}
  <div class="flex items-center justify-end gap-1 text-[var(--pd-titlebar-icon)]">
    {@render icon('notifications', 'Notifications', faBell)}
    {#each RIGHT as [k, l, ic] (k)}
      {#if k === 'accounts' && flows.account}
        <button type="button" aria-label="Accounts · {flows.account.email}" title="Red Hat · {flows.account.email}" data-testid="title-avatar" class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--pd-titlebar-hover-bg)]" onclick={(): void => onopen({ kind: 'accounts' })}>
          <span class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white bg-[#ee0000]">AD</span>
        </button>
      {:else}{@render icon(k, l, ic)}{/if}
    {/each}
  </div>
{/if}
