<script lang="ts">
/** acme-prod › Job templates (GET /api/controller/v2/job_templates/). */
import { faExternalLinkSquareAlt, faRocket } from '@fortawesome/free-solid-svg-icons';
import { FilteredEmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import { openDialog } from '#lib/dialog.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { humanAge, timeAgo, toast } from '#lib/world.svelte.ts';

import { AAP_URL, type JobTemplate, store } from '../data.ts';
import LaunchDialog from './LaunchDialog.svelte';
import StatusDot from './StatusDot.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const { templates } = store();
let searchTerm = $state('');
const filtered = $derived(templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())));

function launch(t: JobTemplate): void {
  openDialog(LaunchDialog, { templateId: t.id });
}

function openInAap(t: JobTemplate): void {
  toast({ type: 'info', title: 'Opening AAP', body: `${AAP_URL}/execution/templates/job-template/${t.id}/details` });
}

function resetFilter(): void {
  searchTerm = '';
}

const columns = [
  new TableColumn<JobTemplate, { status: string }>('Status', {
    width: '140px',
    renderer: StatusDot,
    renderMapping: (t): { status: string } => ({ status: t.status }),
  }),
  new TableColumn<JobTemplate, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (t): NameCellData => ({ title: t.name, sub: [t.job_type === 'check' ? 'Check' : 'Run', t.playbook] }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<JobTemplate, string>('Inventory', { width: '1.2fr', renderer: TableSimpleColumn, renderMapping: (t): string => t.inventory }),
  new TableColumn<JobTemplate, string>('Execution environment', { width: '1.5fr', renderer: TableSimpleColumn, renderMapping: (t): string => t.execution_environment }),
  new TableColumn<JobTemplate, string>('Last ran', {
    renderer: TableSimpleColumn,
    renderMapping: (t): string => (t.last_job_run ? timeAgo(t.last_job_run) : '–'),
  }),
  new TableColumn<JobTemplate, ActionsCellData>('Actions', {
    align: 'right',
    width: '110px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (t): ActionsCellData => ({
      buttons: [{ title: `Launch ${t.name}`, icon: faRocket, onClick: (): void => launch(t), enabled: t.status !== 'running' }],
      menu: [{ title: 'Open in AAP', icon: faExternalLinkSquareAlt, onClick: (): void => openInAap(t) }],
    }),
  }),
];

const row = new TableRow<JobTemplate>({});

function key(t: JobTemplate): string {
  return String(t.id);
}

function label(t: JobTemplate): string {
  return t.name;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Job templates">
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="job templates" />
      {:else if filtered.length === 0}
        <FilteredEmptyScreen kind="job templates" {searchTerm} onResetFilter={resetFilter} />
      {:else}
        <Table kind="aap job templates" data={filtered} {columns} {row} defaultSortColumn="Name" {key} {label} />
      {/if}
    </div>
  {/snippet}
</NavPage>
