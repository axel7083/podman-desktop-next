<script lang="ts">
/** Execution environments: EE/DE/ADT images + form editor over execution-environment.yml v3 (ansible-builder). */
import { faHammer, faPlay, faPlus, faStar, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import Badge from '#lib/components/Badge.svelte';
import CodeView from '#lib/details/CodeView.svelte';
import { openDialog } from '#lib/dialog.svelte.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { type ContainerImage, humanAge, humanSize, world } from '#lib/world.svelte.ts';

import { buildEe, useAsNavigatorEe } from '../actions.ts';
import { ansibleImages, ansibleKind, BASE_IMAGES, type CollectionRow, EE_MINIMAL, eeYaml, ENGINE, imageRef, store } from '../data.ts';
import RunDialog from './RunDialog.svelte';
import TaskProgress from './TaskProgress.svelte';

interface Props {
  showForm: boolean;
}

let { showForm }: Props = $props();

const { settings } = store();
const images = $derived(ansibleImages());

// form
let base = $state(EE_MINIMAL);
let tag = $state('localhost/acme/ee-network:1.0');
let collections = $state<CollectionRow[]>([
  { name: 'containers.podman', version: '1.21.0' },
  { name: 'ansible.posix', version: '' },
  { name: 'cisco.ios', version: '' },
]);
let python = $state('jmespath\nnetaddr');
let system = $state('git-core [platform:rpm]');
let taskId = $state<string | undefined>();
const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const yaml = $derived(eeYaml({ base, tag, collections, python, system }));
const built = $derived(task?.status === 'success');

function onBase(v: string): void {
  base = v;
}

function onTag(e: Event): void {
  tag = (e.currentTarget as HTMLInputElement).value.trim();
}

function onColName(i: number, e: Event): void {
  collections[i].name = (e.currentTarget as HTMLInputElement).value;
}

function onColVersion(i: number, e: Event): void {
  collections[i].version = (e.currentTarget as HTMLInputElement).value;
}

function removeCol(i: number): void {
  collections.splice(i, 1);
}

function addCol(): void {
  collections.push({ name: '', version: '' });
}

function onPython(e: Event): void {
  python = (e.currentTarget as HTMLTextAreaElement).value;
}

function onSystem(e: Event): void {
  system = (e.currentTarget as HTMLTextAreaElement).value;
}

function build(): void {
  taskId = buildEe($state.snapshot({ base, tag, collections, python, system }));
}

function closeForm(): void {
  taskId = undefined;
  navigate('/tools/ansible?tab=environments');
}

function useBuilt(): void {
  useAsNavigatorEe(tag);
}

function openImages(): void {
  navigate(`/c/${ENGINE}/images`);
}

function runWith(i: ContainerImage): void {
  settings.navigatorEe = imageRef(i);
  openDialog(RunDialog, { playbook: 'site.yml' });
}

const columns = [
  new TableColumn<ContainerImage, NameCellData>('Name', {
    width: '3fr',
    renderer: NameCell,
    renderMapping: (i): NameCellData => ({
      title: `${i.name}:${i.tag}`,
      sub: [imageRef(i) === settings.navigatorEe ? 'Navigator default' : '', i.labels?.['ansible.core.version'] ? `ansible-core ${i.labels['ansible.core.version']}` : ''].filter(Boolean),
      href: `/c/${i.engineId}/images/${i.id}/summary`,
    }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<ContainerImage, string>('Kind', {
    width: '80px',
    renderer: TableSimpleColumn,
    renderMapping: (i): string => ansibleKind(i) ?? '',
  }),
  new TableColumn<ContainerImage, string>('Age', { renderer: TableSimpleColumn, renderMapping: (i): string => humanAge(i.created) }),
  new TableColumn<ContainerImage, string>('Size', { renderer: TableSimpleColumn, renderMapping: (i): string => humanSize(i.size) }),
  new TableColumn<ContainerImage, ActionsCellData>('Actions', {
    align: 'right',
    width: '110px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (i): ActionsCellData => ({
      buttons: [
        { title: 'Use as navigator default', icon: faStar, onClick: (): void => useAsNavigatorEe(imageRef(i)), hidden: ansibleKind(i) !== 'EE', enabled: imageRef(i) !== settings.navigatorEe },
        { title: 'Run playbook in this EE', icon: faPlay, onClick: (): void => runWith(i), hidden: ansibleKind(i) !== 'EE' },
      ],
      menu: [],
    }),
  }),
];

const row = new TableRow<ContainerImage>({});

function key(i: ContainerImage): string {
  return i.id;
}

function label(i: ContainerImage): string {
  return `${i.name}:${i.tag}`;
}
</script>

<div class="flex flex-col gap-4 pb-5">
  {#if showForm}
    <section class="mx-5 bg-[var(--pd-content-card-bg)] rounded-lg p-4 grid grid-cols-1 xl:grid-cols-2 gap-5" aria-label="New execution environment">
      <div class="flex flex-col gap-3 text-[var(--pd-content-card-text)]">
        <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">New execution environment</h2>
        <label for="ee-base" class="font-semibold text-[var(--pd-content-card-header-text)]">Base image</label>
        <Dropdown id="ee-base" ariaLabel="Base image" value={base} onChange={onBase} options={BASE_IMAGES} disabled={!!task} />
        <label for="ee-tag" class="font-semibold text-[var(--pd-content-card-header-text)]">Image tag</label>
        <Input id="ee-tag" aria-label="Image tag" value={tag} oninput={onTag} disabled={!!task} />
        <div class="flex items-center justify-between">
          <span class="font-semibold text-[var(--pd-content-card-header-text)]">Collections</span>
          <Button type="link" icon={faPlus} onclick={addCol} disabled={!!task}>Add collection</Button>
        </div>
        <div class="flex flex-col gap-2" role="list" aria-label="Collections">
          {#each collections as c, i (i)}
            <div class="flex gap-2 items-center" role="listitem">
              <Input aria-label="Collection name {i + 1}" placeholder="namespace.collection" value={c.name} oninput={onColName.bind(undefined, i)} class="grow" disabled={!!task} />
              <Input aria-label="Collection version {i + 1}" placeholder="latest" value={c.version} oninput={onColVersion.bind(undefined, i)} class="w-28" disabled={!!task} />
              <Button type="link" icon={faTrash} aria-label="Remove collection {c.name || i + 1}" onclick={removeCol.bind(undefined, i)} disabled={!!task}></Button>
            </div>
          {/each}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="font-semibold text-[var(--pd-content-card-header-text)]">Python dependencies</span>
            <textarea
              aria-label="Python dependencies"
              rows="3"
              value={python}
              oninput={onPython}
              disabled={!!task}
              class="font-mono text-sm rounded-md p-2 bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-focused-text)] border border-[var(--pd-input-field-stroke)] focus:outline-none focus:border-[var(--pd-input-field-hover-stroke)]"></textarea>
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-semibold text-[var(--pd-content-card-header-text)]">System dependencies (bindep)</span>
            <textarea
              aria-label="System dependencies"
              rows="3"
              value={system}
              oninput={onSystem}
              disabled={!!task}
              class="font-mono text-sm rounded-md p-2 bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-focused-text)] border border-[var(--pd-input-field-stroke)] focus:outline-none focus:border-[var(--pd-input-field-hover-stroke)]"></textarea>
          </label>
        </div>
        {#if taskId}<TaskProgress {taskId} label="Build progress" />{/if}
        <div class="flex justify-end gap-2">
          <Button type="link" onclick={closeForm}>{built ? 'Close' : 'Cancel'}</Button>
          {#if built}
            <Button type="secondary" icon={faStar} onclick={useBuilt}>Use as navigator default</Button>
            <Button onclick={openImages}>Open images</Button>
          {:else}
            <Button icon={faHammer} onclick={build} inProgress={task?.status === 'in-progress'} disabled={!!task || !tag}>Build</Button>
          {/if}
        </div>
      </div>
      <div class="flex flex-col gap-2 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-[var(--pd-content-card-header-text)]">execution-environment.yml</span>
          <Badge label="v3" color="bg-[var(--pd-label-bg)]" class="text-[var(--pd-label-text)]" />
        </div>
        <div class="rounded-lg overflow-hidden border border-[var(--pd-content-table-border)] grow" aria-label="execution-environment.yml preview">
          <CodeView code={yaml} language="yaml" />
        </div>
      </div>
    </section>
  {/if}

  <div class="flex min-w-full">
    {#if images.length}
      <Table kind="ansible environments" data={images} {columns} {row} defaultSortColumn="Name" {key} {label} />
    {:else}
      <EmptyScreen title="No execution environments" message="Pull ee-minimal-rhel9 or build one with ansible-builder." />
    {/if}
  </div>
</div>
