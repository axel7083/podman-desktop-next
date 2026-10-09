<script lang="ts">
/**
 * "Available extensions" panel, like today's PD Settings › Authentication:
 * small catalog cards (logo, name, short description, publisher, version,
 * download button, "More details") with "Refresh the catalog".
 */
import { faCheckCircle, faCircleInfo, faDownload } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

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

<div data-testid="ext-cards" class="rounded-lg bg-[var(--pd-content-card-inset-bg)] p-4">
  <div class="flex items-center pb-3">
    <span class="text-base font-semibold text-[var(--pd-content-card-header-text)]">{title}</span>
    <span class="flex-1"></span>
    <Button type="link" inProgress={refreshing} onclick={refresh}>Refresh the catalog</Button>
  </div>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
    {#each list as e (e.id)}
      {@const inst = isInstalled(e.id)}
      <div role="group" aria-label={e.name} class="flex flex-col h-32 p-3 rounded-lg border border-[var(--pd-content-bg)] bg-[var(--pd-content-card-bg)] hover:border-[var(--pd-content-card-border-selected)]">
        <div class="flex items-start gap-2">
          <AppIcon icon={e.icon} size="32px" />
          <div class="flex-1 min-w-0">
            <div class="truncate leading-4 text-[var(--pd-content-header)]">{e.name}</div>
            <div class="pt-1 truncate text-[13px] text-[var(--pd-content-text)]">{e.description}</div>
            <div class="pt-0.5 text-xs text-[var(--pd-content-text)] opacity-80">{publisher(e)}</div>
          </div>
          {#if inst}
            <span class="flex items-center gap-1 text-[10px] uppercase text-[var(--pd-invert-content-info-icon)]" title="Already installed"><AppIcon icon={faCheckCircle} size="xs" />Installed</span>
          {:else}
            <button type="button" aria-label="Install {e.name}" title="Install" class="w-7 h-7 rounded-md bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-primary-text)] hover:bg-[var(--pd-button-primary-hover-bg)]" onclick={(): void => installExt(e.id)}><AppIcon icon={faDownload} size="xs" /></button>
          {/if}
        </div>
        <div class="flex items-end flex-1 text-xs text-[var(--pd-content-text)]">
          <span>v{1 + (hash(e.id) % 3)}.{hash(e.id) % 20}.{hash(e.name) % 9}</span>
          <span class="flex-1"></span>
          {#if inst && onopenext}
            <Button type="link" onclick={(): void => onopenext(e)}>Open</Button>
          {:else}
            <Button type="link" icon={faCircleInfo}>More details</Button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
