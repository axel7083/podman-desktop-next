<script lang="ts">
/** Projects: ADT workspace card, ansible-creator "New project" form, project list. */
import { faPlay, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { openDialog } from '#lib/dialog.svelte.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { findContainer, humanAge, startContainer, world } from '#lib/world.svelte.ts';

import { createProject, openAdtShell } from '../actions.ts';
import { ADT_IMAGE, type AnsibleProject, store } from '../data.ts';
import RunDialog from './RunDialog.svelte';
import TaskProgress from './TaskProgress.svelte';

interface Props {
  newType?: 'collection' | 'playbook';
}

let { newType }: Props = $props();

const { projects } = store();

const adt = $derived(world.containers.find(c => c.name === 'adt-workspace'));
const adtRunning = $derived(adt?.state === 'RUNNING');

// "New project" form
let type = $state<'collection' | 'playbook'>('playbook');
let fqcn = $state('acme.ops');
let customPath = $state<string | undefined>();
let taskId = $state<string | undefined>();
const defaultPath = $derived(
  type === 'collection' ? `~/dev/collections/ansible_collections/${fqcn.replace('.', '/')}` : `~/dev/${fqcn.split('.').pop() ?? 'project'}-playbooks`,
);
const path = $derived(customPath ?? defaultPath);
const fqcnValid = $derived(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(fqcn));
const exists = $derived(projects.some(p => p.fqcn === fqcn && p.path === path));
const formTask = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);

$effect.pre(() => {
  if (newType) type = newType;
});

function onType(v: string): void {
  type = v === 'collection' ? 'collection' : 'playbook';
  if (type === 'collection' && fqcn === 'acme.ops') fqcn = 'acme.network';
}

function onFqcn(e: Event): void {
  fqcn = (e.currentTarget as HTMLInputElement).value.trim();
}

function onPath(e: Event): void {
  customPath = (e.currentTarget as HTMLInputElement).value;
}

function create(): void {
  taskId = createProject(type, fqcn, path);
}

function closeForm(): void {
  taskId = undefined;
  navigate('/tools/ansible?tab=projects');
}

function startAdt(): void {
  if (adt) startContainer(adt.id);
}

function openAdtContainer(): void {
  const c = findContainer('adt-workspace');
  if (c) navigate(`/c/${c.engineId}/containers/${c.id}/summary`);
}

function run(p: AnsibleProject): void {
  openDialog(RunDialog, { playbook: p.playbooks[0] ?? 'site.yml' });
}

const columns = [
  new TableColumn<AnsibleProject, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (p): NameCellData => ({ title: p.fqcn, sub: [p.type === 'collection' ? 'Collection' : 'Playbook project', p.path] }),
    comparator: (a, b): number => a.fqcn.localeCompare(b.fqcn),
  }),
  new TableColumn<AnsibleProject, string>('Content', {
    width: '2fr',
    renderer: TableSimpleColumn,
    renderMapping: (p): string => (p.type === 'collection' ? 'galaxy.yml, roles/run, plugins/' : `${p.playbooks.join(', ')}${p.inventory ? ` · ${p.inventory}` : ''}`),
  }),
  new TableColumn<AnsibleProject, string>('Created', {
    renderer: TableSimpleColumn,
    renderMapping: (p): string => humanAge(p.created),
    comparator: (a, b): number => b.created - a.created,
  }),
  new TableColumn<AnsibleProject, ActionsCellData>('Actions', {
    align: 'right',
    width: '120px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (p): ActionsCellData => ({
      buttons: [
        { title: `Run a playbook of ${p.fqcn}`, icon: faPlay, onClick: (): void => run(p), hidden: p.type !== 'playbook' },
        { title: 'Open in ADT shell', icon: faTerminal, onClick: openAdtShell },
      ],
      menu: [],
    }),
  }),
];

const row = new TableRow<AnsibleProject>({});

function key(p: AnsibleProject): string {
  return `${p.fqcn}:${p.path}`;
}

function label(p: AnsibleProject): string {
  return p.fqcn;
}
</script>

<div class="flex flex-col gap-4 pb-5">
  <div class="px-5 grid grid-cols-1 items-start gap-4 {newType ? 'lg:grid-cols-2' : ''}">
    <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex gap-4 items-start" aria-label="ADT workspace">
      <AppIcon icon="icons/redhat.ansible.png" size="40px" />
      <div class="flex flex-col gap-1 grow min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-base font-semibold text-[var(--pd-content-card-header-text)]">ADT workspace</span>
          <span class="flex items-center gap-1.5 text-sm {adtRunning ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-status-stopped)]'}">
            <span class="w-2 h-2 rounded-full {adtRunning ? 'bg-[var(--pd-status-running)]' : 'bg-[var(--pd-status-stopped)]'}"></span>{adtRunning ? 'Running' : adt ? 'Stopped' : 'Not created'}
          </span>
        </div>
        <span class="text-sm text-[var(--pd-content-card-text)] truncate" title={ADT_IMAGE}>{ADT_IMAGE.split('/').pop()} · ansible-core, ansible-lint, molecule, navigator, builder, creator</span>
        <code class="text-xs text-[var(--pd-content-card-light-title)] truncate">podman run -it --rm --privileged --user root -v $PWD:/workdir:Z ansible-dev-tools-rhel9:26.8.0</code>
      </div>
      <div class="flex gap-2 shrink-0">
        {#if adt}
          <Button type="secondary" onclick={openAdtContainer}>Details</Button>
        {/if}
        {#if adtRunning}
          <Button icon={faTerminal} onclick={openAdtShell}>Open ADT shell</Button>
        {:else}
          <Button icon={faPlay} onclick={startAdt} disabled={!adt}>Start workspace</Button>
        {/if}
      </div>
    </section>

    {#if newType}
      <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex flex-col gap-3" aria-label="New project">
        <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">New project</h2>
        <div class="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 items-center text-[var(--pd-content-card-text)]">
          <label for="ansible-new-type">Type</label>
          <Dropdown
            id="ansible-new-type"
            ariaLabel="Project type"
            value={type}
            onChange={onType}
            disabled={!!formTask}
            options={[
              { value: 'playbook', label: 'Playbook project' },
              { value: 'collection', label: 'Collection' },
            ]} />
          <label for="ansible-new-fqcn">Name (FQCN)</label>
          <Input id="ansible-new-fqcn" aria-label="Project name" value={fqcn} oninput={onFqcn} disabled={!!formTask} error={fqcnValid ? undefined : 'Use namespace.name, lowercase'} />
          <label for="ansible-new-path">Path</label>
          <Input id="ansible-new-path" aria-label="Project path" value={path} oninput={onPath} disabled={!!formTask} />
        </div>
        <code class="text-xs text-[var(--pd-content-card-light-title)]">ansible-creator init {type} {fqcn} {path}</code>
        {#if taskId}<TaskProgress {taskId} label="Scaffolding progress" />{/if}
        <div class="flex justify-end gap-2">
          <Button type="link" onclick={closeForm}>{formTask?.status === 'success' ? 'Close' : 'Cancel'}</Button>
          {#if !formTask}
            <Button onclick={create} disabled={!fqcnValid || exists}>Create</Button>
          {/if}
        </div>
      </section>
    {/if}
  </div>

  <div class="flex min-w-full">
    {#if projects.length}
      <Table kind="ansible projects" data={projects} {columns} {row} defaultSortColumn="Name" {key} {label} />
    {:else}
      <EmptyScreen title="No Ansible projects" message="Scaffold a collection or a playbook project with ansible-creator." />
    {/if}
  </div>
</div>
