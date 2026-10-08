<script lang="ts">
/** Edge Manager › Devices. */
import { EmptyScreen, NavPage } from '@podman-desktop/ui-svelte';
import { faMicrochip } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionView } from '#lib/ext/types.ts';
import { humanAge } from '#lib/world.svelte.ts';

import { emStore } from '../data.ts';
import StatusText from './StatusText.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
let searchTerm = $state('');
const devices = $derived(emStore().devices.filter(d => (d.labels.alias ?? d.name).includes(searchTerm)));
const COLS = 'grid grid-cols-[2fr_1fr_1fr_1fr_1.6fr_0.8fr] gap-3 items-center';
</script>

<NavPage title="Devices" bind:searchTerm={searchTerm}>
  {#snippet bottomAdditionalActions()}<span class="text-sm">{conn.endpoint}</span>{/snippet}
  {#snippet content()}
    <div class="px-5 pb-5 space-y-2 text-[var(--pd-table-body-text)]" aria-label="Devices">
      {#if devices.length === 0}<EmptyScreen icon={faMicrochip} title="No devices" message="Approve an enrollment request to add a device." />{/if}
      <div class="{COLS} px-4 text-xs uppercase font-semibold text-[var(--pd-table-header-text)]"><span>Device</span><span>Status</span><span>Update</span><span>Applications</span><span>OS image</span><span>Last seen</span></div>
      {#each devices as d (d.name)}
        <div class="{COLS} rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-2 min-h-12">
          <div class="min-w-0">
            <div class="text-[var(--pd-table-body-text-highlight)] truncate">{d.labels.alias ?? d.name}</div>
            <div class="text-xs truncate">{Object.entries(d.labels).filter(([k]) => k !== 'alias').map(([k, v]) => `${k}=${v}`).join(' ')} · {d.name.slice(0, 16)}…</div>
          </div>
          <div><StatusText value={d.summary} />{#if d.summaryInfo}<div class="text-xs text-[var(--pd-state-error)]">{d.summaryInfo}</div>{/if}</div>
          <StatusText value={d.updated} />
          <StatusText value={d.applications} />
          <span class="text-sm truncate">{d.osImage.replace('quay.io/', '')}</span>
          <span class="text-sm">{humanAge(new Date(d.lastSeen).getTime())} ago</span>
        </div>
      {/each}
    </div>
  {/snippet}
</NavPage>
