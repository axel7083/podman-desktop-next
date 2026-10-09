<script lang="ts">
/** Tools › Helm charts (P3): Artifact Hub search + OCI charts (P7), install into a cluster. */
import { faCertificate, faCircleCheck, faCloudArrowDown, faStar } from '@fortawesome/free-solid-svg-icons';
import { Button, FilteredEmptyScreen, NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import { openDialog } from '#lib/dialog.svelte.ts';

import { type ChartPackage, CHARTS } from '../data.ts';
import InstallDialog from './InstallDialog.svelte';

let searchTerm = $state('');

const results = $derived(
  CHARTS.filter(c => {
    const t = searchTerm.trim().toLowerCase();
    return !t || `${c.name} ${c.description} ${c.repository.name} ${c.ref}`.toLowerCase().includes(t);
  }).toSorted((a, b) => b.stars - a.stars),
);

function installChart(chart: ChartPackage): void {
  openDialog(InstallDialog, { chart });
}

function resetFilter(): void {
  searchTerm = '';
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Helm charts">
  {#snippet content()}
    <div class="flex flex-col min-w-full grow px-5 pb-4 gap-3 overflow-auto">
      <div class="text-sm text-[var(--pd-content-text)]">
        {results.length} package{results.length === 1 ? '' : 's'} from Artifact Hub{searchTerm ? ` matching "${searchTerm}"` : ''} · OCI charts from quay.io/acme
      </div>
      {#if results.length === 0}
        <FilteredEmptyScreen icon={faCloudArrowDown} kind="charts" {searchTerm} onResetFilter={resetFilter} />
      {:else}
        <div class="grid grid-cols-2 gap-3" role="list" aria-label="Charts">
          {#each results as c (c.package_id)}
            <div class="flex flex-col gap-2 rounded-lg p-4 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)]" role="listitem" aria-label="{c.repository.name}/{c.name}">
              <div class="flex items-start gap-3">
                <span class="w-10 h-10 shrink-0 rounded-md flex items-center justify-center bg-[var(--pd-content-card-inset-surface)]">
                  <AppIcon icon="icons/podman-desktop.helm.png" size="26px" />
                </span>
                <div class="grow min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-base font-semibold text-[var(--pd-content-card-header-text)]">{c.name}</span>
                    <span class="text-xs text-[var(--pd-content-card-light-title)]">{c.repository.organization_name} · {c.repository.name}</span>
                    {#if c.repository.official}
                      <span class="text-xs px-1.5 py-0.5 rounded-sm bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)] flex items-center gap-1" title="Official">
                        <Icon icon={faCertificate} size="xs" />Official
                      </span>
                    {/if}
                    {#if c.repository.verified_publisher}
                      <span class="text-xs px-1.5 py-0.5 rounded-sm bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] flex items-center gap-1" title="Verified publisher">
                        <Icon icon={faCircleCheck} size="xs" />Verified publisher
                      </span>
                    {/if}
                    {#if c.ref.startsWith('oci://')}
                      <span class="text-xs px-1.5 py-0.5 rounded-sm bg-[var(--pd-label-tertiary-bg)] text-[var(--pd-label-tertiary-text)]" title="OCI artifact">OCI</span>
                    {/if}
                  </div>
                  <div class="text-sm mt-1 line-clamp-2">{c.description}</div>
                </div>
                <span class="flex items-center gap-1 text-sm text-[var(--pd-content-card-light-title)] shrink-0" title="Stars on Artifact Hub" aria-label="{c.stars} stars">
                  <Icon icon={faStar} size="sm" />{c.stars}
                </span>
              </div>
              <div class="flex items-center gap-3 text-xs text-[var(--pd-content-card-light-title)]">
                <span>Chart {c.version}</span>
                <span>App {c.app_version}</span>
                <span class="font-mono truncate grow">{c.ref}</span>
                <Button icon={faCloudArrowDown} onclick={installChart.bind(undefined, c)} aria-label="Install {c.repository.name}/{c.name}">Install</Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/snippet}
</NavPage>
