<script lang="ts">
/**
 * "Build disk image" (Bootable containers): bootc image, disk types, arch,
 * root filesystem, output folder, user + SSH key (config.toml). Build runs
 * bootc-image-builder as a task in the bottom panel and lists the result in
 * Disk images. RHEL bases need registry.redhat.io (Red Hat account).
 */
import { faCompactDisc } from '@fortawesome/free-solid-svg-icons';

import { lab } from '../../lab.svelte.ts';
import Btn from '../Btn.svelte';
import { buildDisk, builderFor, ref } from '../bootc.ts';
import { closeModal, flows, openModal } from '../flows.svelte.ts';
import Choice from './Choice.svelte';
import Field from './Field.svelte';
import { INPUT } from './form.ts';
import Modal from './Modal.svelte';

// svelte-ignore state_referenced_locally
let image = $state(flows.modal?.data?.image ?? ref(flows.bootc[0]));
let types = $state<string[]>(['qcow2']);
let arch = $state('amd64');
let filesystem = $state('xfs');
let folder = $state('~/bootc/output');
let user = $state('alice');
let key = $state('~/.ssh/id_ed25519.pub');

const b = $derived(flows.bootc.find(x => ref(x) === image));
const rhel = $derived(b?.base === 'RHEL');
const needsSignIn = $derived(rhel && !flows.account);

function build(): void {
  closeModal();
  lab.panel = true;
  buildDisk({ image, types, arch, filesystem, folder, user, key });
}
</script>

<Modal title="Build disk image" icon={faCompactDisc} sub="Bootable containers · bootc-image-builder" primary="Build" primaryIcon={faCompactDisc} disabled={!types.length || needsSignIn || b?.lint === 'fail'} onprimary={build} testid="build-disk" width="40rem">
  <Field label="Bootable container image" hint={b ? `${b.base} ${b.version} · ${b.size} · bootc container lint: ${b.lint === 'pass' ? 'passed' : b.lint === 'warn' ? '1 warning (var-log)' : 'failed (kargs: invalid TOML) — fix the image first'}` : undefined}>
    <select class={INPUT} aria-label="Image" data-testid="build-image" bind:value={image}>
      {#each flows.bootc as x (ref(x))}<option value={ref(x)}>{ref(x)}</option>{/each}
    </select>
  </Field>
  <Field label="Disk image types">
    <Choice
      multi
      cols={3}
      testid="build-types"
      value={types}
      onchange={(v): void => void (types = v)}
      options={[
        { id: 'qcow2', label: 'QCOW2', sub: 'Virtualization (QEMU, RHEL VMs)' },
        { id: 'raw', label: 'RAW', sub: 'Bare metal, dd to a disk' },
        { id: 'anaconda-iso', label: 'Anaconda ISO', sub: 'Unattended installer' },
        { id: 'ami', label: 'AMI', sub: 'Amazon EC2' },
        { id: 'vmdk', label: 'VMDK', sub: 'VMware vSphere' },
        { id: 'vhd', label: 'VHD', sub: 'Azure / Hyper-V' },
      ]} />
  </Field>
  <div class="grid grid-cols-3 gap-3">
    <Field label="Architecture">
      <select class={INPUT} aria-label="Architecture" bind:value={arch}><option value="amd64">x86_64</option><option value="arm64">aarch64</option></select>
    </Field>
    <Field label="Root filesystem">
      <select class={INPUT} aria-label="Root filesystem" bind:value={filesystem}><option value="xfs">xfs</option><option value="ext4">ext4</option><option value="btrfs" disabled={rhel}>btrfs{rhel ? ' (Fedora only)' : ''}</option></select>
    </Field>
    <Field label="Output folder"><input class="{INPUT} font-mono" aria-label="Output folder" bind:value={folder} /></Field>
  </div>
  <div class="grid grid-cols-2 gap-3">
    <Field label="User" hint="Added to the wheel group"><input class={INPUT} aria-label="User" bind:value={user} /></Field>
    <Field label="SSH public key"><input class="{INPUT} font-mono" aria-label="SSH public key" bind:value={key} /></Field>
  </div>
  <div class="text-[12px] text-[var(--pd-table-body-text)]">Builder: <span class="font-mono">{builderFor(b?.base ?? 'Fedora')}</span></div>
  {#if needsSignIn}
    <div data-testid="build-signin" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
      <span class="flex-1 text-[var(--pd-table-body-text)]">RHEL images are built with the RHEL bootc-image-builder from registry.redhat.io: sign in with your Red Hat account.</span>
      <Btn icon="icons/redhat.redhat-authentication.png" onclick={(): void => openModal('rh-signin', { then: 'build-disk', image })}>Sign in with Red Hat</Btn>
    </div>
  {/if}
</Modal>
