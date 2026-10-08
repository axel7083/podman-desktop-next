<script lang="ts">
/**
 * Settings › OpenShift CLI: every tool of the pack (installed / update / not
 * installed) and a version-skew banner for `oc` against connected clusters.
 */
import { faCircleArrowUp, faDownload, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { registry } from '#lib/ext/registry.svelte.ts';

import { BIN_DIR, installedVersion, installTool, isBusy, minorsBehind, TOOLS } from '../data.ts';

const clusters = $derived(registry.activeConnections.filter(c => c.capabilities?.includes('openshift') && c.version && /^4\./.test(c.version)));
const oc = $derived(installedVersion('oc'));
const skew = $derived(
  oc ? clusters.map(c => ({ conn: c, behind: minorsBehind(oc, c.version ?? oc) })).filter(s => s.behind >= 2).toSorted((a, b) => b.behind - a.behind) : [],
);
const pending = $derived(TOOLS.filter(t => t.recommended && installedVersion(t.name) !== t.latest));

function install(name: string): void {
  installTool(name);
}

function installRecommended(): void {
  for (const t of pending) if (!isBusy(t.name)) installTool(t.name);
}
</script>

<div class="flex flex-col gap-4 text-[var(--pd-invert-content-card-text)]">
  {#if skew.length && oc}
    <div class="flex items-center gap-3 rounded-md p-3 bg-[var(--pd-invert-content-card-bg)] border-l-4 border-[var(--pd-state-warning)]" role="alert">
      <Icon icon={faTriangleExclamation} class="text-[var(--pd-state-warning)]" />
      <span class="grow">oc {oc} is {skew[0].behind} minor versions behind {skew[0].conn.name} ({skew[0].conn.version}). Update to avoid version skew issues.</span>
      <Button icon={faCircleArrowUp} inProgress={isBusy('oc')} onclick={install.bind(undefined, 'oc')}>Update oc</Button>
    </div>
  {/if}
  <div class="flex items-center gap-3">
    <span class="grow text-sm">Binaries are installed to <code>{BIN_DIR}</code> and added to your PATH.</span>
    <Button icon={faDownload} disabled={pending.length === 0} onclick={installRecommended}>{pending.length ? `Install recommended (${pending.length})` : 'Recommended tools up to date'}</Button>
  </div>
  <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md" role="table" aria-label="OpenShift CLI tools">
    <div role="row" class="grid grid-cols-[150px_2fr_100px_100px_140px] gap-2 px-4 py-2 text-xs uppercase font-semibold text-[var(--pd-table-header-text)] border-b border-[var(--pd-content-divider)]">
      <span>Tool</span><span>Description</span><span>Installed</span><span>Latest</span><span></span>
    </div>
    {#each TOOLS as t (t.name)}
      {@const v = installedVersion(t.name)}
      <div role="row" aria-label={t.name} class="grid grid-cols-[150px_2fr_100px_100px_140px] gap-2 items-center px-4 py-2 border-b last:border-b-0 border-[var(--pd-content-divider)]">
        <span class="flex flex-col"><span class="font-semibold text-[var(--pd-invert-content-card-header-text)]">{t.name}</span><span class="text-xs">{t.displayName}</span></span>
        <span class="text-sm">{t.description}</span>
        <span class="text-sm tabular-nums {v ? '' : 'text-[var(--pd-content-sub-header)]'}">{v ?? 'Not installed'}</span>
        <span class="text-sm tabular-nums">{t.latest}</span>
        <span class="flex justify-end">
          {#if v === t.latest}
            <span class="text-sm text-[var(--pd-status-running)]">Up to date</span>
          {:else}
            <Button type={v ? 'primary' : 'secondary'} inProgress={isBusy(t.name)} onclick={install.bind(undefined, t.name)}>{v ? 'Update' : 'Install'}</Button>
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>
