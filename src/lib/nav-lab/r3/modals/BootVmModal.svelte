<script lang="ts">
/** "Run in a VM" (local VM provider, macadam): name and resources of the VM booting a bootc disk image. */
import { faDesktop, faPlay } from '@fortawesome/free-solid-svg-icons';

import { lab } from '../../lab.svelte.ts';
import { bootInVm } from '../bootc.ts';
import { closeModal, flows } from '../flows.svelte.ts';
import Field from './Field.svelte';
import { INPUT } from './form.ts';
import Modal from './Modal.svelte';

const disk = $derived(flows.disks.find(d => d.name === flows.modal?.data?.disk));
// svelte-ignore state_referenced_locally
let name = $state(`${(flows.modal?.data?.disk ?? 'bootc').split('.')[0]}-vm`);
let cpus = $state('2');
let memory = $state('4');

function boot(): void {
  const d = disk;
  if (!d) return;
  closeModal();
  lab.panel = true;
  bootInVm(d, { name, cpus, memory });
}
</script>

<Modal title="Run in a VM" icon={faDesktop} sub="{disk?.name} · {disk?.type} · {disk?.arch}" primary="Run" primaryIcon={faPlay} disabled={!disk || disk.type !== 'qcow2' && disk.type !== 'raw'} onprimary={boot} testid="boot-vm">
  <Field label="VM name"><input class={INPUT} aria-label="VM name" bind:value={name} /></Field>
  <div class="grid grid-cols-2 gap-3">
    <Field label="CPUs"><select class={INPUT} aria-label="CPUs" bind:value={cpus}>{#each ['2', '4'] as v (v)}<option value={v}>{v}</option>{/each}</select></Field>
    <Field label="Memory"><select class={INPUT} aria-label="Memory" bind:value={memory}>{#each ['2', '4', '8'] as v (v)}<option value={v}>{v} GB</option>{/each}</select></Field>
  </div>
  <div class="text-[12px] text-[var(--pd-table-body-text)]">The VM runs with libkrun (macadam), user <span class="font-mono">alice</span> and key <span class="font-mono">~/.ssh/id_ed25519</span>. A bootc OS ships Podman: the VM appears in the connection switcher under ENGINES as a Podman connection; an ssh session opens in the bottom panel.</div>
</Modal>
