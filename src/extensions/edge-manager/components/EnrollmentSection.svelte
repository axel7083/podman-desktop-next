<script lang="ts">
/** Edge Manager › Enrollment requests: pending agents (incl. local RHEL VMs booted from a bootc image with the agent). */
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, NavPage } from '@podman-desktop/ui-svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { toast } from '#lib/world.svelte.ts';

import { type EnrollmentRequest, emMutable, emStore, fingerprint, vmRequests } from '../data.ts';
import StatusText from './StatusText.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

/** Stored requests + one per local VM running flightctl-agent that is not handled yet. */
const requests = $derived.by((): EnrollmentRequest[] => {
  const fromVms = vmRequests(registry.activeConnections.filter(c => c.capabilities?.includes('flightctl-agent')));
  return [...fromVms, ...emStore().ers];
});
let fleet = $state('kiosks');

function setFleet(v: string): void {
  fleet = v;
}

function decide(er: EnrollmentRequest, approve: boolean): void {
  const s = emMutable();
  const updated = { ...er, status: approve ? ('Approved' as const) : ('Denied' as const) };
  s.ers = [updated, ...s.ers.filter(e => e.name !== er.name)];
  if (approve) {
    s.devices = [
      ...s.devices,
      { name: er.vm ? er.name : er.name || fingerprint(), labels: { fleet, site: 'lab', alias: er.alias }, osImage: fleet === 'kiosks' ? (s.fleets.find(f => f.name === 'kiosks')?.osImage ?? 'quay.io/acme/edge-kiosk:1.1') : 'quay.io/acme/edge-sensor:0.9', summary: 'Online', updated: 'UpToDate', applications: 'Healthy', lastSeen: new Date().toISOString(), agentVersion: 'v1.3.1' },
    ];
    toast({ type: 'success', title: `${er.alias} enrolled into fleet ${fleet}`, action: { label: 'Open devices', href: `/c/${conn.id}/devices` } });
  }
}
</script>

<NavPage title="Enrollment requests" searchEnabled={false}>
  {#snippet additionalActions()}
    <span class="text-sm self-center">Approve into fleet</span>
    <div class="w-40"><Dropdown value={fleet} onChange={setFleet} options={emStore().fleets.map(f => ({ value: f.name, label: f.name }))} /></div>
  {/snippet}
  {#snippet content()}
    <div class="px-5 pb-5 space-y-2 text-[var(--pd-table-body-text)]" aria-label="Enrollment requests">
      {#if requests.length === 0}<EmptyScreen title="No enrollment requests" message="Boot a bootc image that contains flightctl-agent to see it here." />{/if}
      {#each requests as er (er.name)}
        <div class="flex items-center gap-4 rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-2 min-h-12">
          <div class="grow min-w-0">
            <div class="text-[var(--pd-table-body-text-highlight)]">{er.alias}</div>
            <div class="text-xs truncate">{er.name} · CSR {er.vm ? `from local VM ${er.vm}` : 'submitted by agent'} · {new Date(er.created).toLocaleString()}</div>
          </div>
          <StatusText value={er.status} />
          {#if er.status === 'Pending'}
            <Button icon={faCheck} onclick={decide.bind(undefined, er, true)}>Approve</Button>
            <Button type="secondary" icon={faXmark} onclick={decide.bind(undefined, er, false)}>Deny</Button>
          {/if}
        </div>
      {/each}
    </div>
  {/snippet}
</NavPage>
