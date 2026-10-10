<script lang="ts">
/**
 * Bootable containers extension (redhat.bootc) sections:
 * - Overview: counters, getting-started steps (pull → build → boot), resources;
 * - Images: bootc images table (base, version, size, `bootc container lint`),
 *   quick actions Build disk image / Run as VM;
 * - Disk images: build results (type, arch, size, built, status), quick
 *   actions Run in a VM (local VM provider, macadam) / Download, ⋯ for
 *   Run on OpenShift Virtualization… / Show in folder / Delete;
 * - Examples: cards (size, arch, More details, Pull image).
 * Header: secondary "Pull image" + primary "Build disk image" (rule D12).
 */
import { faArrowCircleDown, faArrowUpRightFromSquare, faCompactDisc, faDesktop, faDownload, faFolderOpen, faPlay, faServer, faTrash } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import type { LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import LabIcon from '../ui/LabIcon.svelte';
import { BOOTC_CONN, bootcTarget, pullExample, ref } from './bootc.ts';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import type { LabRow } from './cells/types.ts';
import { type BootcImage, type DiskImage, flows, openModal, runTask } from './flows.svelte.ts';
import Head from './Head.svelte';
import KV from './KV.svelte';
import type { MenuItem } from './live.svelte.ts';
import ModernTable from './ModernTable.svelte';
import ResourcesCard from './ResourcesCard.svelte';
import SegFilter from './SegFilter.svelte';
import StatGrid from './StatGrid.svelte';
import { type FoundNode, OVERVIEW_ICON } from './trees.ts';

interface Props {
  f: FoundNode;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { f, onopen }: Props = $props();

const section = $derived(f.node === f.root ? 'Overview' : f.node.label);
let search = $state('');
let filter = $state('all');
let arch = $state<Record<string, string>>({});
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');

/** Fedora / CentOS Stream bases first (open source, no account), PD bootc examples (backend/assets/examples.json), RHEL presets (Red Hat account): [title, description, image, base, size, archs, more]. */
const EXAMPLES: [string, string, string, BootcImage['base'], string, string[], string][] = [
  ['Fedora bootc 42', 'Fedora bootc base image: open source, no account needed.', 'quay.io/fedora/fedora-bootc:42', 'Fedora', '1.6 GB', ['amd64', 'arm64'], 'https://docs.fedoraproject.org/en-US/bootc/'],
  ['CentOS Stream 10', 'CentOS Stream bootc base image, upstream of RHEL 10.', 'quay.io/centos-bootc/centos-bootc:stream10', 'CentOS Stream', '1.5 GB', ['amd64', 'arm64'], 'https://docs.fedoraproject.org/en-US/bootc/'],
  ['RHEL 10 base', 'RHEL 10 image mode base image (requires a Red Hat account).', 'registry.redhat.io/rhel10/rhel-bootc:10.2', 'RHEL', '1.8 GB', ['amd64', 'arm64'], 'https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems'],
  ['Fedora httpd', 'Fedora bootc with the Apache web server enabled.', 'quay.io/bootc-extension/httpd:latest', 'Fedora', '1.7 GB', ['amd64', 'arm64'], 'https://gitlab.com/fedora/bootc/examples/-/tree/main/httpd'],
  ['Fedora Tailscale', 'Fedora bootc joining your tailnet at first boot.', 'quay.io/bootc-extension/tailscale:latest', 'Fedora', '1.6 GB', ['amd64', 'arm64'], 'https://gitlab.com/fedora/bootc/examples/-/tree/main/tailscale'],
  ['Podman systemd', 'Fedora bootc running a containerized app as a Quadlet.', 'quay.io/bootc-extension/podman-systemd:latest', 'Fedora', '1.7 GB', ['amd64', 'arm64'], 'https://gitlab.com/fedora/bootc/examples/-/tree/main/podman-systemd'],
  ['QEMU guest agent', 'Fedora bootc with qemu-guest-agent for virtualization.', 'quay.io/bootc-extension/qemu-agent:latest', 'Fedora', '1.6 GB', ['amd64'], 'https://gitlab.com/fedora/bootc/examples/-/tree/main/qemu-guest-agent'],
  ['Wi-Fi', 'Fedora bootc with NetworkManager Wi-Fi support.', 'quay.io/bootc-extension/wifi:latest', 'Fedora', '1.7 GB', ['amd64', 'arm64'], 'https://gitlab.com/fedora/bootc/examples/-/tree/main/wifi'],
  ['MicroShift on RHEL 9', 'Single-node MicroShift edge appliance.', 'quay.io/acme/microshift-bootc:4.20-rhel9.8', 'RHEL', '2.6 GB', ['amd64', 'arm64'], 'https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/'],
];

const LINT: Record<BootcImage['lint'], [string, string]> = { pass: ['RUNNING', 'Passed'], warn: ['DEGRADED', '1 warning'], fail: ['EXITED', 'Failed'] };

/** Run an image as a VM: boot its qcow2 disk image, else build one first. */
function runAsVm(b: BootcImage): void {
  const d = flows.disks.find(x => x.image === ref(b) && x.type === 'qcow2' && x.status === 'success');
  if (d) openModal('boot-vm', { disk: d.name });
  else openModal('build-disk', { image: ref(b) });
}

function imageMenu(b: BootcImage): MenuItem[] {
  return [
    { label: 'Build disk image', icon: faCompactDisc, run: (): void => openModal('build-disk', { image: ref(b) }) },
    { label: 'Run as VM', icon: faPlay, run: (): void => runAsVm(b) },
    { label: 'Delete', icon: faTrash, danger: true, sep: true, run: (): void => void (flows.bootc = flows.bootc.filter(x => x !== b)) },
  ];
}

function download(d: DiskImage): void {
  lab.panel = true;
  runTask({ title: `Download ${d.name}`, connId: BOOTC_CONN, icon: 'icons/redhat.bootc.png', target: bootcTarget('Disk Images'), cmd: `cp ${d.folder}/${d.type}/disk.* ~/Downloads/${d.name}`, lines: [`✔ Saved ~/Downloads/${d.name} (${d.size})`] });
}

function diskMenu(d: DiskImage): MenuItem[] {
  const bootable = d.status === 'success' && ['qcow2', 'raw'].includes(d.type);
  return [
    { label: 'Run in a VM', icon: faDesktop, disabled: !bootable, run: (): void => openModal('boot-vm', { disk: d.name }) },
    { label: 'Run on OpenShift Virtualization…', icon: faServer, disabled: !bootable, run: (): void => openModal('run-virt', { disk: d.name }) },
    { label: 'Download', icon: faDownload, disabled: d.status !== 'success', run: (): void => download(d), sep: true },
    { label: 'Show in folder', icon: faFolderOpen, disabled: d.status !== 'success', run: (): void => lab.openCreate(`Show ${d.folder}/${d.type}`) },
    { label: 'Delete', icon: faTrash, danger: true, sep: true, run: (): void => void (flows.disks = flows.disks.filter(x => x !== d)) },
  ];
}

const t = $derived(search.toLowerCase());

const images = $derived<LabRow[]>(
  flows.bootc
    .filter(b => !t || ref(b).toLowerCase().includes(t))
    .map(b => ({
      name: ref(b),
      status: LINT[b.lint][0],
      icon: 'icons/redhat.bootc.png',
      title: b.name,
      sub: [b.tag],
      cols: { base: b.base, version: b.version, size: b.size, lint: LINT[b.lint][1], created: b.created },
      buttons: [
        { title: 'Build disk image', icon: faCompactDisc, run: (): void => openModal('build-disk', { image: ref(b) }) },
        { title: 'Run as VM', icon: faPlay, run: (): void => runAsVm(b) },
      ],
      menu: (): MenuItem[] => imageMenu(b),
    })),
);

const disks = $derived<LabRow[]>(
  flows.disks
    .filter(d => !t || d.name.toLowerCase().includes(t) || d.image.includes(t))
    .filter(d => filter === 'all' || (filter === 'building' ? d.status === 'building' : d.status === 'success'))
    .map(d => {
      const bootable = d.status === 'success' && ['qcow2', 'raw'].includes(d.type);
      return {
        name: d.name,
        // No dot on success (rule B7): spinner while building, red when failed.
        status: d.status === 'building' ? 'BUILDING' : d.status === 'success' ? '' : 'ERROR',
        dotTitle: d.status === 'building' ? 'Building' : 'Build failed',
        icon: faCompactDisc,
        title: d.name,
        sub: [],
        cols: { image: d.image, type: d.type, arch: d.arch, size: d.size, built: d.built, status: d.status === 'building' ? 'Building' : d.status === 'success' ? 'Success' : 'Error' },
        buttons: [
          ...(bootable ? [{ title: 'Run in a VM', icon: faDesktop, run: (): void => openModal('boot-vm', { disk: d.name }) }] : []),
          ...(d.status === 'success' ? [{ title: 'Download', icon: faDownload, run: (): void => download(d) }] : []),
        ],
        menu: (): MenuItem[] => diskMenu(d),
      };
    }),
);

function open(label: string): void {
  onopen(bootcTarget(label), {});
}
</script>

{#snippet actions()}
  <Btn icon={faArrowCircleDown} testid="bootc-pull" onclick={(): void => open('Examples')}>Pull image</Btn>
  <Btn kind="primary" icon={faCompactDisc} testid="bootc-build" onclick={(): void => openModal('build-disk')}>Build disk image</Btn>
{/snippet}

{#snippet seg()}
  <SegFilter tabs={[['all', 'All'], ['building', 'Building'], ['done', 'Built']]} value={filter} onpick={(v): void => void (filter = v)} />
{/snippet}

<div data-testid="bootc-view" data-section={section} class="flex flex-col h-full min-h-0">
  <Head
    icon={f.node === f.root ? f.provider.icon : section === 'Overview' ? OVERVIEW_ICON : f.node.icon}
    title={section === 'Overview' ? 'Bootable containers · Overview' : section === 'Images' ? 'bootc Images' : section}
    connId={f.connId}
    onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})}
    provenance="Bootable containers"
    placeholder={section === 'Disk Images' ? 'Filter disk images' : section === 'Examples' ? 'Filter examples' : 'Filter bootc images'}
    bind:search
    filters={section === 'Disk Images' ? seg : undefined}
    {actions} />
  <div class="flex flex-col flex-1 min-h-0 overflow-auto">
    {#if section === 'Images'}
      <div data-testid="bootc-images" class="flex flex-1 min-h-0">
        <ModernTable rows={images} {variant} cols={[['Base', 'base', '120px'], ['Version', 'version', '80px'], ['Size', 'size', '90px', true], ['Lint', 'lint', '100px'], ['Created', 'created', '110px']]} />
      </div>
    {:else if section === 'Disk Images'}
      <div data-testid="bootc-disks" class="flex flex-1 min-h-0">
        {#if disks.length}
          <ModernTable rows={disks} {variant} initialSort="" mono={['image']} cols={[['Image', 'image', 'minmax(10rem, 2fr)'], ['Type', 'type', '110px'], ['Arch', 'arch', '70px'], ['Size', 'size', '80px', true], ['Built', 'built', '110px'], ['Status', 'status', '90px']]} />
        {:else}
          <div class="flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">
            No disk images match.
            <button type="button" class="hover:text-[var(--pd-link)] hover:underline" onclick={(): void => { search = ''; filter = 'all'; }}>Clear filters</button>
          </div>
        {/if}
      </div>
    {:else if section === 'Examples'}
      <div data-testid="bootc-examples" class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-5">
        {#each EXAMPLES.filter(e => !t || e[0].toLowerCase().includes(t)) as [title, desc, img, base, size, archs, more] (title)}
          <div data-testid="bootc-example" class="flex flex-col gap-2 p-4 rounded-lg bg-[var(--pd-content-card-bg)]">
            <div class="flex items-center gap-2">
              <LabIcon icon="icons/redhat.bootc.png" size={20} /><span class="flex-1 text-[14px] font-semibold text-[var(--pd-content-header)]">{title}</span><span class="text-[11px] text-[var(--pd-table-body-text)]">{size}</span>
            </div>
            <p class="text-[13px] text-[var(--pd-table-body-text)] flex-1">{desc}</p>
            <div class="font-mono text-[12px] truncate text-[var(--pd-table-body-text)]" title={img}>{img}</div>
            <div class="flex items-center gap-2 pt-1">
              <select aria-label="Architecture" class="h-7 px-2 rounded-md text-[12px] bg-[var(--pd-select-bg)] text-[var(--pd-content-header)] border border-[var(--pd-input-field-stroke)]" bind:value={arch[title]}>
                {#each archs as a (a)}<option value={a}>{a === 'amd64' ? 'x86_64' : 'aarch64'}</option>{/each}
              </select>
              <a class="text-[12px] text-[var(--pd-table-body-text)] hover:text-[var(--pd-link)] hover:underline" href={more} target="_blank" rel="noreferrer">More details <AppIcon icon={faArrowUpRightFromSquare} size="xs" /></a>
              <span class="flex-1"></span>
              {#if flows.bootc.some(b => ref(b) === img)}
                <Btn icon={faCompactDisc} onclick={(): void => openModal('build-disk', { image: img })}>Build</Btn>
              {:else}
                <Btn
                  icon={faArrowCircleDown}
                  testid="bootc-example-pull"
                  onclick={(): void => {
                    lab.panel = true;
                    pullExample(img, arch[title] ?? archs[0], base, size);
                  }}>Pull image</Btn>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div data-testid="bootc-overview" class="px-5 py-4 flex flex-col gap-4">
        <StatGrid
          items={[
            { label: 'bootc images', count: flows.bootc.length, icon: 'icons/redhat.bootc.png', onclick: (): void => open('Images') },
            { label: 'Disk images', count: flows.disks.length, icon: faCompactDisc, onclick: (): void => open('Disk Images') },
            { label: 'Building', count: flows.disks.filter(d => d.status === 'building').length, icon: faCompactDisc, onclick: (): void => open('Disk Images') },
            { label: 'Examples', count: EXAMPLES.length, icon: 'icons/redhat.bootc.png', onclick: (): void => open('Examples') },
          ]} />
        <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
          <Card title="Get started">
            <ol class="flex flex-col gap-3 text-[13px]">
              {#each [['1', 'Pull or build a bootc image', 'Start from an example or a RHEL / Fedora / CentOS bootc base.', 'Examples'], ['2', 'Build a disk image', 'qcow2, raw, ISO, AMI, VMDK or VHD with bootc-image-builder.', 'Images'], ['3', 'Boot it', 'In a VM on this machine or as a VirtualMachine on OpenShift Virtualization.', 'Disk Images']] as [n, title, d, to] (n)}
                <li class="flex items-start gap-3">
                  <span class="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{n}</span>
                  <span class="flex-1"
                    ><button type="button" class="font-semibold text-[var(--pd-content-header)] hover:text-[var(--pd-link)] hover:underline" onclick={(): void => open(to)}>{title}</button><span class="block text-[var(--pd-table-body-text)]">{d}</span></span>
                </li>
              {/each}
            </ol>
          </Card>
          <Card title="About">
            <KV
              rows={[
                { k: 'Extension', v: 'Bootable containers (redhat.bootc)' },
                { k: 'Description', v: 'Build a bootable OS from a container image, then turn it into a disk image.' },
                { k: 'Connection', v: f.connId, onclick: (): void => onopen({ kind: 'connection', connId: f.connId }, {}) },
                { k: 'Output folder', v: '~/bootc/output', mono: true },
                { k: 'Works with', v: 'Local VMs (macadam) · OpenShift Virtualization · Red Hat account' },
              ]} />
          </Card>
          <ResourcesCard id="bootc" />
        </div>
      </div>
    {/if}
  </div>
</div>
