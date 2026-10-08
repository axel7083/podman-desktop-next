<script lang="ts">
/** Connection › Console & users (P14): crc status, console URL and the kubeadmin / developer credentials. */
import { faArrowUpRightFromSquare, faCopy } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import ListItemButtonIcon from '#lib/components/ListItemButtonIcon.svelte';
import type { ResourceContext } from '#lib/ext/types.ts';
import { humanSize, toast } from '#lib/world.svelte.ts';

import { CLUSTER_CONFIG, CRC_STATUS, USERS } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const running = $derived(ctx.conn.status === 'started');

function copy(user: (typeof USERS)[number]): void {
  toast({ type: 'success', title: `Password of ${user.name} copied to clipboard` });
}

function openConsole(): void {
  toast({ type: 'info', title: `Opening ${CLUSTER_CONFIG.WebConsoleURL}` });
}

function pct(used: number, size: number): string {
  return `${Math.round((used / size) * 100)}%`;
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4 text-[var(--pd-content-card-text)]">
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Web console">
    <div class="flex items-center gap-3">
      <div class="grow">
        <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">Web console</h2>
        <div class="text-sm">{CLUSTER_CONFIG.WebConsoleURL}</div>
      </div>
      <Button icon={faArrowUpRightFromSquare} disabled={!running} onclick={openConsole}>Open console</Button>
    </div>
  </section>
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Users">
    <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">Users</h2>
    {#each USERS as u (u.name)}
      <div class="flex items-center gap-3 py-1.5 border-t first:border-t-0 border-[var(--pd-content-divider)]">
        <span class="w-32 font-semibold text-[var(--pd-content-card-header-text)]">{u.name}</span>
        <span class="w-32 text-sm">{u.role}</span>
        <span class="grow font-mono text-sm">{'•'.repeat(12)}</span>
        <ListItemButtonIcon title="Copy password of {u.name}" icon={faCopy} onClick={copy.bind(undefined, u)} />
      </div>
    {/each}
  </section>
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Status">
    <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">crc status</h2>
    <table class="w-full text-sm">
      <tbody>
        {#each [['CRC VM', running ? CRC_STATUS.crcStatus : 'Stopped'], ['OpenShift', running ? `${CRC_STATUS.openshiftStatus} (v${CRC_STATUS.openshiftVersion})` : 'Stopped'], ['RAM usage', `${humanSize(CRC_STATUS.ramUsage)} of ${humanSize(CRC_STATUS.ramSize)} (${pct(CRC_STATUS.ramUsage, CRC_STATUS.ramSize)})`], ['Disk usage', `${humanSize(CRC_STATUS.diskUsage)} of ${humanSize(CRC_STATUS.diskSize)} (${pct(CRC_STATUS.diskUsage, CRC_STATUS.diskSize)})`], ['Cache usage', `${humanSize(CRC_STATUS.cacheUsage)} in ${CRC_STATUS.cacheDir}`], ['Podman', CRC_STATUS.podmanVersion]] as [k, v] (k)}
          <tr><td class="py-1 w-48">{k}</td><td class="py-1">{v}</td></tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>
