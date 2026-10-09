<script lang="ts">
/**
 * Tools › Cryostat (P3): the local Cryostat 4.2 instance — targets,
 * recordings, archives, event templates and automated rules.
 */
import { faArrowUpRightFromSquare, faBoxArchive, faChartLine, faFileLines, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage, Tab } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import { href, navigate } from '#lib/nav.ts';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { humanAge, timeAgo, humanSize, toast, world } from '#lib/world.svelte.ts';

import DataTable from '../../_appdev/DataTable.svelte';
import Pill from '../../_appdev/Pill.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import {
  type ActiveRecording,
  archiveAndAnalyse,
  archives,
  type ArchivedRecording,
  type AutomatedRule,
  CRYOSTAT_URL,
  deleteArchive,
  deleteRecording,
  EVENT_TEMPLATES,
  type EventTemplate,
  grafanaUrl,
  recordings,
  remainingSeconds,
  resumeRecordings,
  RULES,
  showReport,
  stopRecording,
  type Target,
  targets,
  templateOf,
} from '../data.ts';

const TABS = [
  { id: 'targets', label: 'Targets' },
  { id: 'recordings', label: 'Recordings' },
  { id: 'archives', label: 'Archives' },
  { id: 'templates', label: 'Event templates' },
  { id: 'rules', label: 'Automated rules' },
];

let searchTerm = $state('');
const tab = $derived(page.url.searchParams.get('tab') ?? 'targets');
const server = $derived(world.containers.find(c => c.name === 'cryostat' && c.labels['com.docker.compose.project'] === 'cryostat'));
const term = $derived(searchTerm.toLowerCase());

const allTargets = $derived(targets());
const allRecordings = $derived(recordings());
const allArchives = $derived(archives());

const targetRows = $derived(allTargets.filter(t => t.alias.toLowerCase().includes(term) || t.connectUrl.toLowerCase().includes(term)));
const recordingRows = $derived(allRecordings.filter(r => r.name.toLowerCase().includes(term) || r.target.toLowerCase().includes(term)));
const archiveRows = $derived(allArchives.filter(a => a.name.toLowerCase().includes(term)));
const templateRows = $derived(EVENT_TEMPLATES.filter(t => t.name.toLowerCase().includes(term)));
const ruleRows = $derived(RULES.filter(r => r.name.toLowerCase().includes(term)));

$effect(() => {
  void allRecordings.length;
  resumeRecordings();
});

function reset(): void {
  searchTerm = '';
}

function openConsole(): void {
  toast({ type: 'info', title: 'Opening Cryostat web console', body: `${CRYOSTAT_URL}/topology` });
}

function containerOf(alias: string): { engineId: string; id: string } | undefined {
  return world.containers.find(c => c.name === alias);
}

/* Targets */
function targetKey(t: Target): string {
  return `${t.id}-${t.alias}`;
}
function targetName(t: Target): NameCellData {
  return { title: t.alias, sub: [t.connectUrl], href: t.containerId && t.engineId ? `/c/${t.engineId}/containers/${t.containerId}/jfr` : undefined };
}
const targetColumns: DataColumn<Target>[] = [
  { title: 'Realm', width: '130px', value: (t): string => t.annotations.cryostat.REALM ?? '' },
  { title: 'Connection', width: '110px', value: (t): string => (t.agent ? 'Cryostat Agent' : 'JMX') },
  { title: 'JAVA_MAIN', width: '1.4fr', value: (t): string => t.annotations.cryostat.JAVA_MAIN ?? '' },
  { title: 'Recordings', width: '100px', value: (t): string => String(allRecordings.filter(r => r.target === t.alias).length) },
];

/* Recordings */
function recordingKey(r: ActiveRecording): string {
  return String(r.id);
}
function recordingName(r: ActiveRecording): NameCellData {
  const c = containerOf(r.target);
  return { title: r.name, sub: [r.target, ...(r.metadata.labels.some(l => l.key === 'rule') ? ['automated rule'] : [])], href: c ? `/c/${c.engineId}/containers/${c.id}/jfr` : undefined };
}
const recordingColumns: DataColumn<ActiveRecording>[] = [
  { title: 'State', width: '150px', value: (r): string => (r.state === 'RUNNING' && !r.continuous ? `RUNNING · ${remainingSeconds(r)} s left` : r.state) },
  { title: 'Template', width: '110px', value: (r): string => templateOf(r) },
  { title: 'Duration', width: '100px', value: (r): string => (r.continuous ? 'Continuous' : `${Math.round(r.duration / 1000)} s`) },
  { title: 'Started', width: '120px', value: (r): string => timeAgo(r.startTime) },
];
function recordingActions(r: ActiveRecording): ActionsCellData {
  return {
    buttons: [
      { title: 'Stop', icon: faStop, hidden: r.state !== 'RUNNING', onClick: stopRecording.bind(undefined, r.id) },
      { title: 'Archive and analyse', icon: faBoxArchive, hidden: r.state !== 'STOPPED' || !!r.archive, onClick: archiveAndAnalyse.bind(undefined, r.id) },
    ],
    menu: [{ title: 'Delete recording', icon: faTrash, onClick: deleteRecording.bind(undefined, r.id) }],
  };
}

/* Archives */
function archiveKey(a: ArchivedRecording): string {
  return a.name;
}
function archiveName(a: ArchivedRecording): NameCellData {
  return { title: a.name, sub: [a.target, a.jvmId] };
}
const archiveColumns: DataColumn<ArchivedRecording>[] = [
  { title: 'Size', width: '90px', value: (a): string => humanSize(a.size) },
  { title: 'Archived', width: '130px', value: (a): string => timeAgo(a.archivedTime) },
  { title: 'Top rule', width: '1fr', value: (a): string => `${a.report.rules[0]?.rule ?? ''} ${a.report.rules[0]?.score ?? ''}` },
];
function viewReport(a: ArchivedRecording): void {
  showReport(a.target, a.name);
  const c = containerOf(a.target);
  if (c) navigate(`/c/${c.engineId}/containers/${c.id}/jfr`);
  else toast({ type: 'info', title: `Opening report ${a.reportUrl}` });
}
function openGrafana(a: ArchivedRecording): void {
  toast({ type: 'info', title: 'Opening Grafana', body: grafanaUrl(a) }, 8000);
}
function archiveActions(a: ArchivedRecording): ActionsCellData {
  return {
    buttons: [
      { title: 'View report', icon: faFileLines, onClick: viewReport.bind(undefined, a) },
      { title: 'Open in Grafana', icon: faChartLine, onClick: openGrafana.bind(undefined, a) },
    ],
    menu: [{ title: 'Delete archive', icon: faTrash, onClick: deleteArchive.bind(undefined, a.name) }],
  };
}

/* Event templates */
function templateKey(t: EventTemplate): string {
  return t.name;
}
function templateName(t: EventTemplate): NameCellData {
  return { title: t.name, sub: [t.description] };
}
const templateColumns: DataColumn<EventTemplate>[] = [
  { title: 'Type', width: '100px', value: (t): string => t.type },
  { title: 'Provider', width: '120px', value: (t): string => t.provider },
];

/* Automated rules */
function ruleKey(r: AutomatedRule): string {
  return r.name;
}
function ruleName(r: AutomatedRule): NameCellData {
  return { title: r.name, sub: [r.description, r.enabled ? 'enabled' : 'disabled'] };
}
const ruleColumns: DataColumn<AutomatedRule>[] = [
  { title: 'Match expression', width: '2fr', value: (r): string => r.matchExpression },
  { title: 'Event specifier', width: '1.3fr', value: (r): string => r.eventSpecifier },
  { title: 'Archival period', width: '120px', value: (r): string => (r.archivalPeriodSeconds ? `${r.archivalPeriodSeconds / 60} min` : 'none') },
  { title: 'Preserved', width: '90px', value: (r): string => String(r.preservedArchives) },
];
</script>

<NavPage bind:searchTerm={searchTerm} title="Cryostat">
  {#snippet additionalActions()}
    <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={openConsole}>Open web console</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}
    {#if server}
      <span class="flex items-center gap-2 text-sm">
        <Pill label={server.state === 'RUNNING' ? 'Running' : 'Stopped'} tone={server.state === 'RUNNING' ? 'running' : 'neutral'} />
        Cryostat 4.2.0 · {CRYOSTAT_URL} · Podman discovery on podman-machine-default
      </span>
    {/if}
  {/snippet}
  {#snippet tabs()}
    {#each TABS as t (t.id)}
      <Tab title={t.label} selected={tab === t.id} url={href(`/tools/cryostat?tab=${t.id}`)} />
    {/each}
  {/snippet}
  {#snippet content()}
    {#if tab === 'recordings'}
      <DataTable kind="recordings" rows={recordingRows} total={allRecordings.length} {searchTerm} onResetFilter={reset} key={recordingKey} name={recordingName} columns={recordingColumns} actions={recordingActions} actionsWidth="150px" emptyMessage="Start a recording from a container JFR tab." />
    {:else if tab === 'archives'}
      <DataTable kind="archives" rows={archiveRows} total={allArchives.length} {searchTerm} onResetFilter={reset} key={archiveKey} name={archiveName} columns={archiveColumns} actions={archiveActions} actionsWidth="150px" emptyMessage="Archive a stopped recording to analyse it." />
    {:else if tab === 'templates'}
      <DataTable kind="event templates" rows={templateRows} total={EVENT_TEMPLATES.length} {searchTerm} onResetFilter={reset} key={templateKey} name={templateName} nameWidth="3fr" columns={templateColumns} />
    {:else if tab === 'rules'}
      <DataTable kind="automated rules" rows={ruleRows} total={RULES.length} {searchTerm} onResetFilter={reset} key={ruleKey} name={ruleName} columns={ruleColumns} />
    {:else}
      <DataTable
        kind="targets"
        rows={targetRows}
        total={allTargets.length}
        {searchTerm}
        onResetFilter={reset}
        key={targetKey}
        name={targetName}
        columns={targetColumns}
        emptyMessage="Label a JVM container with io.cryostat.discovery=true, or use 'Make discoverable by Cryostat' on a container." />
    {/if}
  {/snippet}
</NavPage>
