<script lang="ts">
/** Engine › Bootable containers (P2): disk images built with bootc-image-builder + build form with the lint gate. */
import { faCircleExclamation, faDesktop, faHammer, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, NavPage, Spinner } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';

import type { ConnectionView } from '#lib/ext/types.ts';
import { href } from '#lib/nav.ts';
import { shortImage, world } from '#lib/world.svelte.ts';

import { bootInVm, buildDiskImage, fixLint } from '../actions.ts';
import { type BootcBuildInfo, BUILDERS, builds, type BuildType, isBootc, lint } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const images = $derived(world.images.filter(i => i.engineId === conn.id && isBootc(i)));
const list = $derived(builds().filter(b => b.engineId === conn.id));
let showForm = $state(!!page.url.searchParams.get('image'));
let imageId = $state(page.url.searchParams.get('image') ?? '');
let types = $state<BuildType[]>(['qcow2']);
let arch = $state<'amd64' | 'arm64'>('amd64');
let builder = $state(BUILDERS[0].value);
let user = $state('alice');

const image = $derived(images.find(i => i.id === imageId) ?? images[0]);
const lintResults = $derived(image ? lint(image) : []);
const lintErrors = $derived(lintResults.filter(r => r.status === 'fail'));
const agent = (b: BootcBuildInfo): boolean => !!world.images.find(i => i.name === b.image && i.tag === b.tag)?.labels?.['io.flightctl.agent'];

const TYPES: { id: BuildType; label: string }[] = [
  { id: 'qcow2', label: 'QCOW2 (virtualization)' },
  { id: 'anaconda-iso', label: 'Anaconda ISO (bare metal)' },
  { id: 'raw', label: 'RAW (edge devices)' },
  { id: 'vmdk', label: 'VMDK (vSphere)' },
  { id: 'ami', label: 'AMI (AWS)' },
];

function open(): void {
  showForm = true;
}

function cancel(): void {
  showForm = false;
}

function setImage(v: string): void {
  imageId = v;
}

function toggleType(t: BuildType, checked: boolean): void {
  types = checked ? [...types, t] : types.filter(x => x !== t);
}

function setArch(v: string): void {
  arch = v === 'arm64' ? 'arm64' : 'amd64';
}

function setBuilder(v: string): void {
  builder = v;
}

function onUser(e: Event): void {
  user = (e.currentTarget as HTMLInputElement).value;
}

function build(): void {
  if (!image) return;
  buildDiskImage(image, types, arch, builder, user);
  showForm = false;
}

function fix(): void {
  if (image) fixLint(image);
}

function boot(b: BootcBuildInfo): void {
  bootInVm(b, agent(b));
}

const STATUS_CLASS: Record<string, string> = { success: 'text-[var(--pd-status-running)]', error: 'text-[var(--pd-status-terminated)]', lost: 'text-[var(--pd-status-stopped)]', creating: 'text-[var(--pd-status-starting)]', running: 'text-[var(--pd-status-starting)]' };
</script>

<NavPage title="Bootable containers" searchEnabled={false}>
  {#snippet additionalActions()}
    <Button icon={faPlusCircle} onclick={open} disabled={showForm || images.length === 0}>Build disk image</Button>
  {/snippet}
  {#snippet content()}
    <div class="px-5 pb-5 space-y-4 text-[var(--pd-content-card-text)]">
      {#if showForm && image}
        <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-5 space-y-4" aria-label="Build disk image">
          <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">Build disk image</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="bootc-image" class="font-semibold text-[var(--pd-content-card-header-text)]">Bootable container image</label>
              <Dropdown id="bootc-image" value={image.id} onChange={setImage} options={images.map(i => ({ value: i.id, label: `${shortImage(i.name)}:${i.tag}` }))} />
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="bootc-builder" class="font-semibold text-[var(--pd-content-card-header-text)]">Builder</label>
              <Dropdown id="bootc-builder" value={builder} onChange={setBuilder} options={BUILDERS} />
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="font-semibold text-[var(--pd-content-card-header-text)]">Disk image types</span>
              {#each TYPES as t (t.id)}
                <Checkbox checked={types.includes(t.id)} onclick={toggleType.bind(undefined, t.id)}>{t.label}</Checkbox>
              {/each}
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="bootc-arch" class="font-semibold text-[var(--pd-content-card-header-text)]">Architecture</label>
              <Dropdown id="bootc-arch" value={arch} onChange={setArch} options={[{ value: 'amd64', label: 'amd64 (x86_64)' }, { value: 'arm64', label: 'arm64 (aarch64)' }]} />
              <label for="bootc-user" class="font-semibold text-[var(--pd-content-card-header-text)] mt-2">User (wheel, SSH key ~/.ssh/id_ed25519.pub)</label>
              <Input id="bootc-user" value={user} oninput={onUser} />
            </div>
          </div>
          <div class="rounded-md border border-[var(--pd-content-divider)] bg-[var(--pd-content-card-inset-surface)] p-3 text-sm" aria-label="bootc container lint">
            <div class="font-semibold mb-1">bootc container lint · {shortImage(image.name)}:{image.tag}</div>
            {#each lintResults as r (r.name)}
              <div class={r.status === 'fail' ? 'text-[var(--pd-state-error)]' : r.status === 'warning' ? 'text-[var(--pd-state-warning)]' : 'text-[var(--pd-state-success)]'}>
                {r.status === 'fail' ? 'error' : r.status} · {r.name}{r.message ? `: ${r.message}` : ''}
              </div>
            {:else}
              <div class="text-[var(--pd-state-success)]">Checks passed: 9 · Warnings: 0</div>
            {/each}
            {#if lintErrors.length}
              <div class="flex items-center gap-2 mt-2">
                <Icon icon={faCircleExclamation} />
                <span class="grow">The build is blocked until lint errors are fixed.</span>
                <Button type="secondary" onclick={fix}>Fix and rebuild image</Button>
              </div>
            {/if}
          </div>
          <div class="flex justify-end gap-2">
            <Button type="link" onclick={cancel}>Cancel</Button>
            <Button icon={faHammer} onclick={build} disabled={lintErrors.length > 0 || types.length === 0}>Build</Button>
          </div>
        </section>
      {/if}

      {#if list.length === 0 && !showForm}
        <EmptyScreen icon={faHammer} title="No disk images" message="Build a qcow2, ISO, raw, vmdk or AMI disk image from a bootable container image." />
      {/if}
      {#each list as b (b.id)}
        <div class="flex items-center gap-4 rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-3 min-h-12" aria-label="Disk image {b.id}">
          <span class="w-24 shrink-0 flex items-center gap-1.5 text-sm capitalize {STATUS_CLASS[b.status] ?? ''}">
            {#if b.status === 'running' || b.status === 'creating'}<Spinner size="0.9em" />{:else}<span class="w-2.5 h-2.5 rounded-full bg-current"></span>{/if}{b.status}
          </span>
          <div class="grow min-w-0">
            <div class="text-[var(--pd-table-body-text-highlight)]">{shortImage(b.image)}:{b.tag}</div>
            <div class="text-xs truncate">{b.type.join(', ')} · {b.arch} · {b.error ?? b.folder}</div>
          </div>
          <span class="text-xs w-72 shrink-0 truncate" title={b.buildContainerId}>{b.buildContainerId.split('/').slice(-2).join('/')}</span>
          {#if b.vm}
            <a class="text-[var(--pd-link)] text-sm" href={href(`/c/${b.vm}`)}>{b.vm}</a>
          {:else if b.status === 'success' && b.type.includes('qcow2')}
            <Button type="secondary" icon={faDesktop} onclick={boot.bind(undefined, b)}>Boot in RHEL VM</Button>
          {/if}
        </div>
      {/each}
    </div>
  {/snippet}
</NavPage>
