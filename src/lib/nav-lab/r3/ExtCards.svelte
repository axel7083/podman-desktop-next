<script lang="ts">
/**
 * Extension cards (catalog / installed / "Extend X"): 32px logo, name,
 * publisher · version, description, status and one labelled secondary
 * action (Install / Open), rule D13: per-card actions are never primary.
 */
import { faDownload } from '@fortawesome/free-solid-svg-icons';

import LabIcon from '../ui/LabIcon.svelte';
import Btn from './Btn.svelte';

import { hash } from './details.ts';
import { ext, installExt, isInstalled, type LabExtension } from './exts.ts';

interface Props {
  ids: string[];
  title?: string;
  /** Called with an installed extension ("Open"). */
  onopenext?: (e: LabExtension) => void;
}

let { ids, title = 'Available extensions', onopenext }: Props = $props();

let refreshing = $state(false);
const list = $derived(ids.map(ext).filter((e): e is LabExtension => !!e));

function publisher(e: LabExtension): string {
  return e.icon.includes('/redhat.') ? 'Red Hat' : e.icon.includes('/podman-desktop.') ? 'Podman Desktop' : 'Community';
}

function refresh(): void {
  refreshing = true;
  setTimeout(() => (refreshing = false), 800);
}
</script>

<div data-testid="ext-cards" class="flex flex-col gap-2">
  <div class="flex items-center">
    <h2 class="text-[14px] font-semibold text-[var(--pd-content-header)]">{title}</h2>
    <span class="flex-1"></span>
    <button type="button" class="text-[12px] text-[var(--pd-table-body-text)] hover:text-[var(--pd-link)] hover:underline disabled:opacity-40" disabled={refreshing} onclick={refresh}>{refreshing ? 'Refreshing…' : 'Refresh the catalog'}</button>
  </div>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
    {#each list as e (e.id)}
      {@const inst = isInstalled(e.id)}
      <div role="group" aria-label={e.name} class="flex flex-col gap-2 p-4 rounded-lg bg-[var(--pd-content-card-bg)]">
        <div class="flex items-start gap-3">
          <LabIcon icon={e.icon} size={32} />
          <div class="flex-1 min-w-0">
            <div class="truncate text-[13px] font-semibold text-[var(--pd-content-header)]">{e.name}</div>
            <div class="truncate text-[12px] text-[var(--pd-table-body-text)]">{publisher(e)} · v{1 + (hash(e.id) % 3)}.{hash(e.id) % 20}.{hash(e.name) % 9}</div>
          </div>
        </div>
        <div class="text-[13px] text-[var(--pd-table-body-text)] line-clamp-2 min-h-10">{e.description}</div>
        <div class="flex items-center gap-2">
          {#if inst}
            <span class="flex items-center gap-1.5 text-[12px] text-[var(--pd-table-body-text)]" title="Already installed"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-running)]"></span>Installed</span>
          {:else}
            <span class="text-[12px] text-[var(--pd-table-body-text)]">Not installed</span>
          {/if}
          <span class="flex-1"></span>
          {#if inst && onopenext}
            <Btn onclick={(): void => onopenext(e)}>Open</Btn>
          {:else if !inst}
            <Btn icon={faDownload} testid="ext-install" onclick={(): void => installExt(e.id)}>Install</Btn>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
