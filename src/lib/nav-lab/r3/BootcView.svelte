<script lang="ts">
/**
 * Bootable containers extension sections (Overview, Images, Disk Images, Examples).
 * Header: secondary "Pull image" + primary "Build" (rule D12); lists are tables.
 */
import { faArrowCircleDown, faCompactDisc, faPlusCircle, faTrash } from '@fortawesome/free-solid-svg-icons';

import type { LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import LabIcon from '../ui/LabIcon.svelte';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import KV from './KV.svelte';
import StatGrid from './StatGrid.svelte';
import Head from './Head.svelte';
import RowsTable from './RowsTable.svelte';
import { type FoundNode, OVERVIEW_ICON } from './trees.ts';

interface Props {
  f: FoundNode;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { f, onopen }: Props = $props();

const section = $derived(f.node === f.root ? 'Overview' : f.node.label);
let search = $state('');
let arch = $state<Record<string, string>>({});

const EXAMPLES: [string, string, string][] = [
  ['Fedora bootc', 'Fedora bootable container image with a basic web server.', 'quay.io/fedora/fedora-bootc:42'],
  ['CentOS Stream 10', 'CentOS Stream bootc image to build RHEL-compatible disks.', 'quay.io/centos-bootc/centos-bootc:stream10'],
  ['RHEL 10 bootc', 'Red Hat Enterprise Linux 10 image mode base.', 'registry.redhat.io/rhel10/rhel-bootc:10.0'],
  ['AI inference appliance', 'bootc image with vLLM and a model baked in.', 'quay.io/acme/ai-appliance:1.0'],
  ['Edge kiosk', 'Minimal kiosk OS for edge devices with GNOME Kiosk.', 'quay.io/acme/edge-kiosk:2.1'],
  ['Kubernetes node', 'MicroShift node image for small clusters.', 'quay.io/acme/microshift-node:4.19'],
];

const images = $derived<LabRow[]>(
  [
    ['quay.io/acme/orders-os', 'v3', '1.9 GB'],
    ['quay.io/fedora/fedora-bootc', '42', '1.6 GB'],
    ['registry.redhat.io/rhel10/rhel-bootc', '10.0', '1.8 GB'],
  ]
    .filter(([n]) => !search || n.includes(search))
    .map(([n, tag, size], i) => ({
      name: n,
      status: i === 0 ? 'USED' : 'UNUSED',
      icon: 'icons/redhat.bootc.png',
      title: n,
      sub: [tag],
      shortId: ['a3f2c19d0b44', '9e01b2c4ff10', '77c2de03a9b1'][i],
      cols: { size, age: ['2 hours', '3 days', '2 weeks'][i] },
      buttons: [{ title: 'Build disk image', icon: faCompactDisc, run: (): void => lab.openCreate(`Build disk image from ${n}:${tag}`) }],
    })),
);

const disks = $derived<LabRow[]>(
  [
    ['orders-os-v3.qcow2', 'qcow2', 'amd64', 'success'],
    ['orders-os-v3.iso', 'anaconda-iso', 'arm64', 'running'],
  ].map(([n, type, a, st]) => ({
    name: n,
    status: st === 'running' ? 'STARTING' : 'RUNNING',
    icon: faCompactDisc,
    title: n,
    sub: [st === 'running' ? 'BUILDING' : 'SUCCESS'],
    cols: { type, arch: a, folder: '~/bootc/output' },
    buttons: [{ title: 'Delete', icon: faTrash, danger: true, run: (): void => undefined }],
  })),
);
</script>

{#snippet actions()}
  {#if section === 'Images' || section === 'Overview'}<Btn icon={faArrowCircleDown} testid="bootc-pull" onclick={(): void => lab.openCreate('Pull a bootc image')}>Pull image</Btn>{/if}
  <Btn kind="primary" icon={faPlusCircle} testid="bootc-build" onclick={(): void => lab.openCreate('Build a disk image')}>Build</Btn>
{/snippet}

<div data-testid="bootc-view" class="flex flex-col h-full min-h-0">
  <Head icon={f.node === f.root ? f.provider.icon : section === 'Overview' ? OVERVIEW_ICON : f.node.icon} title={f.node === f.root ? f.provider.label : section} connId={f.connId} onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})} provenance="Bootable containers" placeholder="Filter bootc images" search={section === 'Images' ? search : undefined} {actions} />
  <div class="flex flex-col flex-1 min-h-0 overflow-auto">
    {#if section === 'Images'}
      <div class="flex flex-1 px-2"><RowsTable kind="p13-bootc-images" rows={images} cols={[['Age', 'age', '100px'], ['Size', 'size', '90px']]} /></div>
    {:else if section === 'Disk Images'}
      <div class="flex flex-1 px-2"><RowsTable kind="p13-bootc-disks" rows={disks} cols={[['Type', 'type', '120px'], ['Arch', 'arch', '80px'], ['Folder', 'folder', '1fr']]} /></div>
    {:else if section === 'Examples'}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-5">
        {#each EXAMPLES as [t, d, img] (t)}
          <div class="flex flex-col gap-2 p-4 rounded-lg bg-[var(--pd-content-card-bg)]">
            <div class="flex items-center gap-2"><LabIcon icon="icons/redhat.bootc.png" size={20} /><span class="text-[14px] font-semibold text-[var(--pd-content-header)]">{t}</span></div>
            <p class="text-[13px] text-[var(--pd-table-body-text)] flex-1">{d}</p>
            <div class="font-mono text-[12px] truncate text-[var(--pd-table-body-text)]">{img}</div>
            <div class="flex items-center gap-2 pt-1">
              <select aria-label="Architecture" class="h-7 px-2 rounded-md text-[12px] bg-[var(--pd-select-bg)] text-[var(--pd-content-header)] border border-[var(--pd-input-field-stroke)]" bind:value={arch[t]}>
                <option value="amd64">x86_64</option><option value="arm64">aarch64</option>
              </select>
              <span class="flex-1"></span>
              <Btn icon={faArrowCircleDown} onclick={(): void => lab.openCreate(`Pull ${img} (${arch[t] ?? 'amd64'})`)}>Pull image</Btn>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div data-testid="bootc-overview" class="px-5 py-4 flex flex-col gap-4">
        <StatGrid
          items={(f.root.children ?? [])
            .filter(x => x.label !== 'Overview')
            .map(x => ({ label: x.label, count: x.detail ?? '', icon: x.icon, onclick: (): void => onopen({ kind: 'node', connId: f.connId, nodeId: x.id }, {}) }))} />
        <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
          <Card title="About">
            <KV
              rows={[
                { k: 'Extension', v: 'Bootable containers' },
                { k: 'Description', v: 'Build a bootable OS image from a container image, then turn it into a disk image (qcow2, raw, ISO, AMI…).' },
                { k: 'Connection', v: f.connId, onclick: (): void => onopen({ kind: 'connection', connId: f.connId }, {}) },
                { k: 'Output folder', v: '~/bootc/output', mono: true },
              ]} />
          </Card>
        </div>
      </div>
    {/if}
  </div>
</div>
