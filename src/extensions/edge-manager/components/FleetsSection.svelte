<script lang="ts">
/** Edge Manager › Fleets: template OS image + rollout of a new version. */
import { faRocket } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, NavPage } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import { later, runTask, toast } from '#lib/world.svelte.ts';

import { type Device, EM_EXT, emMutable, emStore, type Fleet } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
const fleets = $derived(emStore().fleets);
const devices = $derived(emStore().devices);
let target = $state<Record<string, string>>({ kiosks: 'quay.io/acme/edge-kiosk:1.2', sensors: 'quay.io/acme/edge-sensor:1.0' });

function membersOf(f: Fleet): Device[] {
  return devices.filter(d => Object.entries(f.selector).every(([k, v]) => d.labels[k] === v));
}

function setTarget(fleet: string, v: string): void {
  target = { ...target, [fleet]: v };
}

function patch(name: string, p: Partial<Device>): void {
  const s = emMutable();
  s.devices = s.devices.map(d => (d.name === name ? { ...d, ...p, lastSeen: new Date().toISOString() } : d));
}

function rollout(f: Fleet): void {
  const image = target[f.name];
  const s = emMutable();
  s.fleets = s.fleets.map(x => (x.name === f.name ? { ...x, osImage: image } : x));
  const members = membersOf(f).filter(d => d.summary !== 'PoweredOff');
  runTask({
    name: `Roll out ${image.split('/').pop()} to fleet ${f.name}`,
    ext: EM_EXT,
    steps: [
      { label: `PATCH fleets/${f.name} spec.template.spec.os.image`, ms: 800, log: [`$ flightctl apply -f fleet-${f.name}.yaml`] },
      ...members.map(d => ({ label: `${d.labels.alias ?? d.name}: download, stage, reboot`, ms: 2200 })),
    ],
    action: { label: 'Open devices', href: `/c/${conn.id}/devices` },
  });
  members.forEach((d, i) => {
    const t = 800 + i * 2200;
    later(t, () => patch(d.name, { updated: 'Updating', summary: 'Online' }));
    later(t + 1000, () => patch(d.name, { summary: 'Rebooting', applications: 'Unknown' }));
    later(t + 2200, () => {
      if (d.labels.site === 'store-207') {
        patch(d.name, { summary: 'Error', summaryInfo: 'greenboot: health check failed, rolled back', updated: 'OutOfDate', applications: 'Degraded' });
        toast({ type: 'error', title: `${d.labels.alias} rolled back to ${d.osImage.split('/').pop()}`, body: 'greenboot health check failed after reboot.' });
      } else {
        patch(d.name, { summary: 'Online', updated: 'UpToDate', applications: 'Healthy', osImage: image });
      }
    });
  });
}
</script>

<NavPage title="Fleets" searchEnabled={false}>
  {#snippet content()}
    <div class="px-5 pb-5 space-y-3 text-[var(--pd-content-card-text)]" aria-label="Fleets">
      {#each fleets as f (f.name)}
        {@const members = membersOf(f)}
        <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Fleet {f.name}">
          <div class="flex items-center gap-3">
            <div class="grow">
              <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">{f.name}</h2>
              <div class="text-sm">selector {Object.entries(f.selector).map(([k, v]) => `${k}=${v}`).join(',')} · template {f.osImage} · maxUnavailable {f.rollout.maxUnavailable} · success {f.rollout.successThreshold}</div>
              {#if f.applications.length}<div class="text-sm">Applications: {f.applications.join(', ')}</div>{/if}
            </div>
            <div class="w-72">
              <Dropdown value={target[f.name]} onChange={setTarget.bind(undefined, f.name)} options={[f.osImage, target[f.name]].filter((v, i, a) => a.indexOf(v) === i).map(v => ({ value: v, label: v.replace('quay.io/', '') }))} />
            </div>
            <Button icon={faRocket} onclick={rollout.bind(undefined, f)} disabled={target[f.name] === f.osImage}>Roll out</Button>
          </div>
          <div class="flex gap-4 mt-2 text-sm">
            <span>{members.length} devices</span>
            <span>{members.filter(d => d.updated === 'UpToDate').length} up to date</span>
            <span>{members.filter(d => d.updated === 'Updating').length} updating</span>
            <span class={members.some(d => d.summary === 'Error') ? 'text-[var(--pd-state-error)]' : ''}>{members.filter(d => d.summary === 'Error').length} error</span>
          </div>
        </section>
      {/each}
    </div>
  {/snippet}
</NavPage>
