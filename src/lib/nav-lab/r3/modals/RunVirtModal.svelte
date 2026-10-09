<script lang="ts">
/**
 * "Run as VM on OpenShift Virtualization": target local cluster (minc or
 * OpenShift Local), namespace, VM name. The disk is uploaded as a DataVolume
 * (virtctl image-upload) and a VirtualMachine is created and started.
 */
import { faPlay } from '@fortawesome/free-solid-svg-icons';

import { lab } from '../../lab.svelte.ts';
import { runOnVirt } from '../bootc.ts';
import { closeModal, flows } from '../flows.svelte.ts';
import { connStatus } from '../live.svelte.ts';
import { conn } from '../../data.ts';
import Choice from './Choice.svelte';
import Field from './Field.svelte';
import { INPUT } from './form.ts';
import Modal from './Modal.svelte';

const disk = $derived(flows.disks.find(d => d.name === flows.modal?.data?.disk));
let target = $state('openshift-local');
// svelte-ignore state_referenced_locally
let name = $state(`${(flows.modal?.data?.disk ?? 'bootc').split('.')[0].replace(/[^a-z0-9-]/g, '-')}`);
const ns = $derived(target === 'minc' ? 'demo' : 'orders');

function run(): void {
  const d = disk;
  const n = ns;
  if (!d) return;
  closeModal();
  lab.panel = true;
  runOnVirt(d, { connId: target, ns: n, name });
}
</script>

<Modal title="Run as VM on OpenShift Virtualization" icon="icons/redhat.openshift-virtualization.png" sub="{disk?.name} · {disk?.type}" primary="Create VirtualMachine" primaryIcon={faPlay} disabled={!disk} onprimary={run} testid="run-virt">
  <Field label="Cluster">
    <Choice
      testid="virt-target"
      value={[target]}
      onchange={(v): void => void (target = v[0])}
      options={['openshift-local', 'minc'].map(id => ({ id, label: conn(id)?.name ?? id, sub: `${conn(id)?.product} · ${connStatus(conn(id))}`, icon: conn(id)?.icon }))} />
  </Field>
  <div class="grid grid-cols-2 gap-3">
    <Field label="Namespace"><input class={INPUT} aria-label="Namespace" value={ns} readonly /></Field>
    <Field label="VirtualMachine name"><input class={INPUT} aria-label="VirtualMachine name" bind:value={name} /></Field>
  </div>
  <div class="text-[12px] text-[var(--pd-table-body-text)]">The OpenShift Virtualization operator (KubeVirt + CDI) is installed on the cluster; the VM appears under the cluster's EXTENSIONS ▸ Virtualization and its console opens in the bottom panel.</div>
</Modal>
