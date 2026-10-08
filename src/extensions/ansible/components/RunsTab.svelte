<script lang="ts">
/** Runs: ansible-navigator playbook artifacts; `run` opens the replay. */
import { faArrowsRotate, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { humanAge } from '#lib/world.svelte.ts';

import { runPlaybook } from '../actions.ts';
import { type AnsibleRun, recapOf, store } from '../data.ts';
import DotCell from './DotCell.svelte';
import RunReplay from './RunReplay.svelte';

interface Props {
  run?: string;
}

let { run }: Props = $props();

const { runs } = store();
const selected = $derived(run ? runs.find(r => r.artifact === run) : undefined);

function replayHref(r: AnsibleRun): string {
  return `/tools/ansible?tab=runs&run=${encodeURIComponent(r.artifact)}`;
}

function rerun(r: AnsibleRun): void {
  runPlaybook(r.playbook, r.inventory, r.ee);
}

function recapSummary(r: AnsibleRun): string {
  const recap = Object.values(recapOf(r));
  if (!recap.length) return '–';
  const failed = recap.filter(h => h.failed || h.unreachable).length;
  return `${recap.length} host${recap.length > 1 ? 's' : ''}${failed ? ` · ${failed} failed` : ''}`;
}

function duration(r: AnsibleRun): string {
  const s = r.durationSec ?? Math.round((Date.now() - r.started) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

const columns = [
  new TableColumn<AnsibleRun, { status: string }>('Status', {
    width: '120px',
    renderer: DotCell,
    renderMapping: (r): { status: string } => ({ status: r.status }),
    comparator: (a, b): number => a.status.localeCompare(b.status),
  }),
  new TableColumn<AnsibleRun, NameCellData>('Artifact', {
    width: '3fr',
    renderer: NameCell,
    renderMapping: (r): NameCellData => ({ title: r.artifact, sub: [r.playbook, `-i ${r.inventory}`], href: replayHref(r) }),
    comparator: (a, b): number => b.started - a.started,
  }),
  new TableColumn<AnsibleRun, string>('Execution environment', {
    width: '2fr',
    renderer: TableSimpleColumn,
    renderMapping: (r): string => r.ee.split('/').pop() ?? r.ee,
  }),
  new TableColumn<AnsibleRun, string>('Hosts', { renderer: TableSimpleColumn, renderMapping: recapSummary }),
  new TableColumn<AnsibleRun, string>('Duration', { renderer: TableSimpleColumn, renderMapping: duration }),
  new TableColumn<AnsibleRun, string>('Started', { renderer: TableSimpleColumn, renderMapping: (r): string => `${humanAge(r.started)} ago` }),
  new TableColumn<AnsibleRun, ActionsCellData>('Actions', {
    align: 'right',
    width: '110px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (r): ActionsCellData => ({
      buttons: [
        { title: 'Replay artifact', icon: faClockRotateLeft, onClick: (): void => navigate(replayHref(r)) },
        { title: 'Run again', icon: faArrowsRotate, onClick: (): void => rerun(r), enabled: r.status !== 'running' },
      ],
      menu: [],
    }),
  }),
];

const row = new TableRow<AnsibleRun>({});

function key(r: AnsibleRun): string {
  return r.artifact;
}

function label(r: AnsibleRun): string {
  return r.artifact;
}
</script>

{#if run && selected}
  <RunReplay run={selected} />
{:else if run}
  <EmptyScreen title="Artifact not found" message="{run} is not in the Runs history." />
{:else if runs.length}
  <div class="flex min-w-full">
    <Table kind="ansible runs" data={runs} {columns} {row} defaultSortColumn="Artifact" {key} {label} />
  </div>
{:else}
  <EmptyScreen title="No runs" message="Run a playbook with ansible-navigator to see its artifact here." />
{/if}
