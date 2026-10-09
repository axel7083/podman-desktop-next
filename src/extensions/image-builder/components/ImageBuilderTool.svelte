<script lang="ts">
/**
 * Tools › Image Builder: blueprints and composes (images) from
 * console.redhat.com, with hand-off to the RHEL Podman machine and RHEL VM
 * wizards (`/settings/create/<factory>?…` prefill).
 */
import { faDesktop, faDownload, faHammer, faPlusCircle, faServer, faWrench } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, NavPage, Tab, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';
import { onMount } from 'svelte';

import Dialog from '#lib/components/Dialog.svelte';
import { href, navigate, appUrl } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { toast } from '#lib/world.svelte.ts';

import { addEpel, advance, build, download } from '../actions.ts';
import { type Blueprint, type Compose, type ComposeState, IMAGE_TYPES, type ImageType, ibMutable, ibStore, OPENSCAP_PROFILES } from '../data.ts';
import ComposeStatusCell from './ComposeStatusCell.svelte';

const tab = $derived(appUrl().searchParams.get('tab') ?? 'blueprints');
const selectedBp = $derived(appUrl().searchParams.get('bp'));
const blueprints = $derived(ibStore().blueprints);
const composes = $derived(ibStore().composes);
let searchTerm = $state('');
const filteredBps = $derived(blueprints.filter(b => b.name.includes(searchTerm.toLowerCase())));
const filteredComposes = $derived(composes.filter(c => c.blueprint.includes(searchTerm.toLowerCase())));
const detail = $derived(blueprints.find(b => b.name === selectedBp));

onMount(() => {
  for (const c of ibStore().composes) if (['pending', 'building', 'uploading'].includes(c.image_status.status)) advance(c);
});

function ago(iso: string): string {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 48) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  return `${Math.round(h / 24)} days ago`;
}

const bpColumns = [
  new TableColumn<Blueprint, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (b): NameCellData => ({ title: b.name, sub: [b.description], href: `/tools/image-builder?tab=blueprints&bp=${b.name}` }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<Blueprint, string>('Distribution', { width: '1fr', renderer: TableSimpleColumn, renderMapping: (b): string => b.distribution.replace('rhel-', 'RHEL ') }),
  new TableColumn<Blueprint, string>('Image type', { width: '1.6fr', renderer: TableSimpleColumn, renderMapping: (b): string => `${IMAGE_TYPES[b.image_requests[0].image_type]} · ${b.image_requests[0].architecture}` }),
  new TableColumn<Blueprint, string>('Version', { width: '70px', renderer: TableSimpleColumn, renderMapping: (b): string => `v${b.version}` }),
  new TableColumn<Blueprint, string>('Modified', { width: '1fr', renderer: TableSimpleColumn, renderMapping: (b): string => ago(b.last_modified_at) }),
  new TableColumn<Blueprint, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (b): ActionsCellData => ({ buttons: [{ title: `Build ${b.name}`, icon: faHammer, onClick: (): void => build(b) }], menu: [] }),
  }),
];

function composeActions(c: Compose): ActionsCellData {
  const ok = c.image_status.status === 'success';
  const bp = blueprints.find(b => b.name === c.blueprint);
  const needsEpel = c.image_status.error?.details.includes('systemd-networkd') && !bp?.customizations.custom_repositories?.length;
  return {
    buttons: [
      { title: 'Download image', icon: faDownload, hidden: !ok, enabled: !c.downloaded, onClick: (): void => download(c) },
      { title: 'Create RHEL Podman machine from this image', icon: faServer, hidden: !ok || !['wsl', 'vhd'].includes(c.image_type), onClick: (): void => machine(c) },
      { title: 'Create RHEL VM from this image', icon: faDesktop, hidden: !ok || c.image_type !== 'guest-image', onClick: (): void => vm(c) },
      { title: 'Add EPEL repository', icon: faWrench, hidden: !needsEpel, onClick: (): void => addEpel(c.blueprint) },
    ],
    menu: [],
  };
}

const composeColumns = [
  new TableColumn<Compose, ComposeState>('Status', { width: '120px', renderer: ComposeStatusCell, renderMapping: (c): ComposeState => c.image_status.status }),
  new TableColumn<Compose, NameCellData>('Image', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (c): NameCellData => ({
      title: `${c.blueprint} v${c.blueprint_version}`,
      sub: [c.id.slice(0, 8), c.image_status.error ? `${c.image_status.error.reason}: ${c.image_status.error.details}` : (c.downloaded ?? '')].filter(Boolean),
      href: `/tools/image-builder?tab=blueprints&bp=${c.blueprint}`,
    }),
  }),
  new TableColumn<Compose, string>('Target', { width: '1.6fr', renderer: TableSimpleColumn, renderMapping: (c): string => IMAGE_TYPES[c.image_type] }),
  new TableColumn<Compose, string>('Created', { width: '1fr', renderer: TableSimpleColumn, renderMapping: (c): string => ago(c.created_at) }),
  new TableColumn<Compose, ActionsCellData>('Actions', { align: 'right', width: '150px', renderer: ActionsCell, overflow: true, renderMapping: composeActions }),
];

const bpRow = new TableRow<Blueprint>({});
const composeRow = new TableRow<Compose>({});

function machine(c: Compose): void {
  const provider = c.image_type === 'vhd' ? 'hyperv' : 'wsl';
  navigate(`/settings/create/rhel-podman-machine?source=compose&compose=${c.id}&provider=${provider}&release=${c.blueprint.includes('10') ? 'rhel-10.2' : 'rhel-9.8'}&name=${c.blueprint.includes('10') ? 'rhel-10' : 'rhel-9-custom'}`);
}

function vm(c: Compose): void {
  navigate(`/settings/create/rhel-vm?image=local&path=${encodeURIComponent(c.downloaded ?? `C:\\Users\\alice\\Downloads\\composer-api-${c.id.slice(0, 8)}-disk.qcow2`)}&name=rhel10-cis`);
}

function closeDetail(): void {
  navigate('/tools/image-builder?tab=blueprints');
}

function buildDetail(): void {
  if (detail) build(detail);
}

/* New blueprint ---------------------------------------------------- */

let dialog = $state(false);
let bpName = $state('rhel10-wsl-dev');
let bpDistro = $state('rhel-10');
let bpType = $state<ImageType>('wsl');
let bpScap = $state('');
let bpKey = $state('podman-desktop');
const bpError = $derived(
  bpType === 'wsl' && bpScap ? 'OpenSCAP is not available for WSL images' : blueprints.some(b => b.name === bpName) ? 'A blueprint with this name already exists' : undefined,
);

function openDialog(): void {
  dialog = true;
}

function closeDialog(): void {
  dialog = false;
}

function onName(e: Event): void {
  bpName = (e.currentTarget as HTMLInputElement).value;
}

function setDistro(v: string): void {
  bpDistro = v;
}

function setType(v: string): void {
  bpType = v as ImageType;
}

function setScap(v: string): void {
  bpScap = v;
}

function setKey(v: string): void {
  bpKey = v;
}

function createBlueprint(andBuild: boolean): void {
  const profile = OPENSCAP_PROFILES.find(p => p.value === bpScap);
  const bp: Blueprint = {
    id: crypto.randomUUID(),
    name: bpName,
    description: `${bpDistro.replace('rhel-', 'RHEL ')} ${IMAGE_TYPES[bpType]}`,
    version: 1,
    distribution: bpDistro === 'rhel-9' ? 'rhel-9' : 'rhel-10',
    last_modified_at: new Date().toISOString(),
    image_requests: [{ architecture: 'x86_64', image_type: bpType }],
    customizations: {
      packages: bpType === 'wsl' ? ['podman', 'podman-docker', 'openssh-server', 'sudo'] : ['tmux'],
      subscription: { organization: 19830412, 'activation-key': bpKey, insights: true, rhc: true },
      ...(profile?.value ? { openscap: { profile_id: profile.value, profile_name: profile.label } } : {}),
    },
  };
  const s = ibMutable();
  s.blueprints = [bp, ...s.blueprints];
  dialog = false;
  toast({ type: 'success', title: `Blueprint ${bp.name} saved` });
  if (andBuild) build(bp);
}

function save(): void {
  createBlueprint(false);
}

function saveAndBuild(): void {
  createBlueprint(true);
}
</script>

<NavPage title="Image Builder" bind:searchTerm={searchTerm}>
  {#snippet additionalActions()}
    <Button icon={faPlusCircle} onclick={openDialog}>Create blueprint</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}
    <span class="text-sm">Builds run on console.redhat.com (org 19830412) · images are kept for 6 hours</span>
  {/snippet}
  {#snippet tabs()}
    <Tab title="Blueprints" selected={tab === 'blueprints'} url={href('/tools/image-builder?tab=blueprints')} />
    <Tab title="Images" selected={tab === 'images'} url={href('/tools/image-builder?tab=images')} />
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col w-full grow gap-3">
      {#if tab === 'images'}
        {#if filteredComposes.length === 0}
          <EmptyScreen icon={faHammer} title="No images" message="Build a blueprint to create an image." />
        {:else}
          <div class="flex min-w-full"><Table kind="compose" data={filteredComposes} columns={composeColumns} row={composeRow} defaultSortColumn="Created" key={(c: Compose): string => c.id} label={(c: Compose): string => c.blueprint} /></div>
        {/if}
      {:else}
        {#if filteredBps.length === 0}
          <EmptyScreen icon={faHammer} title="No blueprints" message="Create a blueprint to describe a RHEL image." />
        {:else}
          <div class="flex min-w-full"><Table kind="blueprint" data={filteredBps} columns={bpColumns} row={bpRow} defaultSortColumn="Name" key={(b: Blueprint): string => b.id} label={(b: Blueprint): string => b.name} /></div>
        {/if}
        {#if detail}
          <section class="mx-5 mb-4 rounded-lg bg-[var(--pd-content-card-bg)] p-4 text-[var(--pd-content-card-text)]" aria-label="Blueprint {detail.name}">
            <div class="flex items-center gap-3 mb-3">
              <h2 class="grow text-lg font-semibold text-[var(--pd-content-card-header-text)]">{detail.name} <span class="text-sm font-normal">v{detail.version} · {detail.distribution}</span></h2>
              <Button icon={faHammer} onclick={buildDetail}>Build image</Button>
              <Button type="link" onclick={closeDetail}>Close</Button>
            </div>
            <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span class="font-semibold">Target:</span> {IMAGE_TYPES[detail.image_requests[0].image_type]} ({detail.image_requests[0].architecture})</div>
              <div><span class="font-semibold">Registration:</span> {detail.customizations.subscription ? `activation key ${detail.customizations.subscription['activation-key']} · Insights ${detail.customizations.subscription.insights ? 'on' : 'off'}` : 'none'}</div>
              <div class="col-span-2"><span class="font-semibold">Packages:</span> {detail.customizations.packages?.join(', ') || '—'}</div>
              <div class="col-span-2"><span class="font-semibold">Repositories:</span> {detail.customizations.custom_repositories?.map(r => `${r.name} (${r.baseurl[0]})`).join(', ') || '—'}</div>
              <div class="col-span-2"><span class="font-semibold">OpenSCAP:</span> {detail.customizations.openscap?.profile_name ?? '—'}</div>
              <div class="col-span-2"><span class="font-semibold">Users:</span> {detail.customizations.users?.map(u => `${u.name} (${u.groups.join(',')})`).join(', ') || '—'}</div>
            </div>
            <h3 class="mt-4 mb-1 font-semibold text-[var(--pd-content-card-header-text)]">Builds</h3>
            {#each composes.filter(c => c.blueprint === detail.name) as c (c.id)}
              <div class="flex items-center gap-3 py-1 border-t border-[var(--pd-content-divider)] text-sm">
                <span class="w-28"><ComposeStatusCell object={c.image_status.status} /></span>
                <span class="w-12">v{c.blueprint_version}</span>
                <span class="font-mono w-24">{c.id.slice(0, 8)}</span>
                <span class="grow">{c.image_status.error ? `${c.image_status.error.reason}: ${c.image_status.error.details}` : ago(c.created_at)}</span>
              </div>
            {:else}
              <div class="text-sm">No builds yet.</div>
            {/each}
          </section>
        {/if}
      {/if}
    </div>
  {/snippet}
</NavPage>

{#if dialog}
  <Dialog title="Create blueprint" onclose={closeDialog}>
    {#snippet content()}
      <div class="flex flex-col gap-3 w-[26rem]">
        <label for="bp-name" class="font-semibold">Name</label>
        <Input id="bp-name" value={bpName} oninput={onName} />
        <label for="bp-distro" class="font-semibold">Release</label>
        <Dropdown id="bp-distro" value={bpDistro} onChange={setDistro} options={[{ value: 'rhel-10', label: 'RHEL 10' }, { value: 'rhel-9', label: 'RHEL 9' }]} />
        <label for="bp-type" class="font-semibold">Target environment</label>
        <Dropdown id="bp-type" value={bpType} onChange={setType} options={Object.entries(IMAGE_TYPES).map(([value, label]) => ({ value, label }))} />
        <label for="bp-scap" class="font-semibold">OpenSCAP profile</label>
        <Dropdown id="bp-scap" value={bpScap} onChange={setScap} options={OPENSCAP_PROFILES} />
        <label for="bp-key" class="font-semibold">Register with activation key</label>
        <Dropdown id="bp-key" value={bpKey} onChange={setKey} options={['podman-desktop', 'ci-runners', 'edge-lab'].map(v => ({ value: v, label: v }))} />
        {#if bpError}<p class="text-[var(--pd-state-error)]" role="alert">{bpError}</p>{/if}
      </div>
    {/snippet}
    {#snippet buttons()}
      <Button type="link" onclick={closeDialog}>Cancel</Button>
      <Button type="secondary" onclick={save} disabled={!!bpError || !bpName}>Save</Button>
      <Button onclick={saveAndBuild} disabled={!!bpError || !bpName}>Save and build</Button>
    {/snippet}
  </Dialog>
{/if}
