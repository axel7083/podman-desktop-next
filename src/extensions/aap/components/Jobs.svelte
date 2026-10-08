<script lang="ts">
/** acme-prod › Jobs (GET /api/controller/v2/jobs/); `?job=<id>` opens the job output. */
import { faArrowsRotate, faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen, FilteredEmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { humanAge, timeAgo, toast } from '#lib/world.svelte.ts';

import { AAP_URL, driveJob, elapsedLabel, type Job, launchTemplate, store } from '../data.ts';
import JobOutput from './JobOutput.svelte';
import StatusDot from './StatusDot.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const { jobs, templates } = store();
let searchTerm = $state('');
const jobParam = $derived(page.url.searchParams.get('job'));
const selected = $derived(jobParam ? jobs.find(j => String(j.id) === jobParam) : undefined);
const filtered = $derived(jobs.filter(j => `${j.id} ${j.name}`.toLowerCase().includes(searchTerm.toLowerCase())));

$effect(() => {
  for (const j of jobs) {
    if (j.status === 'running' || j.status === 'pending') driveJob(j.id);
  }
});

function relaunch(j: Job): void {
  const tpl = templates.find(t => t.id === j.template_id);
  if (tpl) launchTemplate(tpl, j.limit ?? '', j.extra_vars ?? '', 'relaunch');
}

function openInAap(j: Job): void {
  toast({ type: 'info', title: 'Opening AAP', body: `${AAP_URL}/execution/jobs/playbook/${j.id}/output` });
}

function resetFilter(): void {
  searchTerm = '';
}

const columns = [
  new TableColumn<Job, { status: string }>('Status', {
    width: '120px',
    renderer: StatusDot,
    renderMapping: (j): { status: string } => ({ status: j.status }),
    comparator: (a, b): number => a.status.localeCompare(b.status),
  }),
  new TableColumn<Job, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (j): NameCellData => ({ title: `${j.id} — ${j.name}`, sub: [`launched by ${j.launched_by}`], href: `/c/${conn.id}/aap-jobs?job=${j.id}` }),
    comparator: (a, b): number => b.id - a.id,
  }),
  new TableColumn<Job, string>('Launch type', { renderer: TableSimpleColumn, renderMapping: (j): string => j.launch_type }),
  new TableColumn<Job, string>('Started', { renderer: TableSimpleColumn, renderMapping: (j): string => (j.started ? timeAgo(j.started) : 'pending') }),
  new TableColumn<Job, string>('Elapsed', { renderer: TableSimpleColumn, renderMapping: elapsedLabel }),
  new TableColumn<Job, string>('Node', { renderer: TableSimpleColumn, renderMapping: (j): string => j.execution_node }),
  new TableColumn<Job, ActionsCellData>('Actions', {
    align: 'right',
    width: '110px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (j): ActionsCellData => ({
      buttons: [{ title: `Relaunch job ${j.id}`, icon: faArrowsRotate, onClick: (): void => relaunch(j), enabled: j.status !== 'running' && j.status !== 'pending' }],
      menu: [{ title: 'Open in AAP', icon: faExternalLinkSquareAlt, onClick: (): void => openInAap(j) }],
    }),
  }),
];

const row = new TableRow<Job>({});

function key(j: Job): string {
  return String(j.id);
}

function label(j: Job): string {
  return String(j.id);
}
</script>

{#if jobParam}
  {#if selected}
    {#key selected.id}
      <JobOutput {conn} job={selected} />
    {/key}
  {:else}
    <EmptyScreen title="Job not found" message="Job {jobParam} does not exist on {conn.name}." />
  {/if}
{:else}
  <NavPage bind:searchTerm={searchTerm} title="Jobs">
    {#snippet content()}
      <div class="flex min-w-full grow">
        {#if conn.status !== 'started'}
          <ConnectionStoppedScreen {conn} kind="jobs" />
        {:else if filtered.length === 0}
          <FilteredEmptyScreen kind="jobs" {searchTerm} onResetFilter={resetFilter} />
        {:else}
          <Table kind="aap jobs" data={filtered} {columns} {row} defaultSortColumn="Name" {key} {label} />
        {/if}
      </div>
    {/snippet}
  </NavPage>
{/if}
