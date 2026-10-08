<script lang="ts">
/** Migration toolkit landing page: projects (P15 workspace) and analysis runs. */
import { faFileLines, faMagnifyingGlassChart } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';

import { href, navigate } from '#lib/nav.ts';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import Pill from '../../_appdev/Pill.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { type Analysis, analyses, latestAnalysis, type Project, PROJECTS, resolvedIncidents, summary } from '../data.ts';

let searchTerm = $state('');
const rows = $derived(PROJECTS.filter(p => p.name.includes(searchTerm.toLowerCase()) || p.path.includes(searchTerm)));
const runs = $derived(analyses());
const resolved = $derived(resolvedIncidents());

function key(p: Project): string {
  return p.name;
}

function nameOf(p: Project): NameCellData {
  const last = latestAnalysis(p.name);
  return { title: p.name, sub: [p.path, p.build], href: last ? `/tools/mta?report=${last.id}` : undefined };
}

function lastPoints(p: Project): string {
  const last = latestAnalysis(p.name);
  if (!last) return 'Not analyzed';
  return last.targets.map(t => `${t} ${summary(last, t, resolved).points} pts`).join(' · ');
}

const columns: DataColumn<Project>[] = [
  { title: 'Detected stack', width: '2fr', value: (p): string => p.stack },
  { title: 'Story points', width: '1fr', value: lastPoints },
];

function analyze(p?: Project): void {
  navigate(`/tools/mta?view=analyze${p ? `&project=${encodeURIComponent(p.name)}` : ''}`);
}

function openReport(a: Analysis): void {
  navigate(`/tools/mta?report=${a.id}`);
}

function actions(p: Project): ActionsCellData {
  const last = latestAnalysis(p.name);
  return {
    buttons: [
      { title: `Analyze ${p.name}`, icon: faMagnifyingGlassChart, onClick: analyze.bind(undefined, p) },
      { title: `Open report of ${p.name}`, icon: faFileLines, onClick: (): void => (last ? openReport(last) : undefined), hidden: !last },
    ],
    menu: [],
  };
}

function reset(): void {
  searchTerm = '';
}

function analyzeDefault(): void {
  analyze();
}

function when(a: Analysis): string {
  return new Date(a.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Migration toolkit">
  {#snippet additionalActions()}
    <Button icon={faMagnifyingGlassChart} onclick={analyzeDefault} aria-label="Analyze">Analyze</Button>
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col w-full gap-3">
      <DataTable kind="projects" {rows} total={PROJECTS.length} {searchTerm} onResetFilter={reset} {key} name={nameOf} {columns} {actions} actionsWidth="90px" />
      <div class="px-5 pb-4">
        <Card title="Analysis runs" subtitle="kantra / MTA CLI 8.1.1 · output in <project>/.konveyor">
          {#each runs as a (a.id)}
            <div class="flex items-center gap-3 py-1.5 border-t first:border-t-0 border-[var(--pd-content-divider)]">
              {#if a.status === 'completed'}
                <a class="text-[var(--pd-link)] hover:underline" href={href(`/tools/mta?report=${a.id}`)}>{a.id}</a>
              {:else}
                <span>{a.id}</span>
              {/if}
              <span class="text-sm">{a.project} · {a.source} → {a.targets.join(', ')} · {a.mode} · {a.runLocal ? 'containerless' : 'hybrid (Podman)'}</span>
              <span class="grow"></span>
              <span class="text-sm tabular-nums">{when(a)}</span>
              <Pill label={a.status} tone={a.status === 'completed' ? 'success' : a.status === 'running' ? 'running' : 'error'} />
            </div>
          {:else}
            <p>No analysis yet. Click Analyze to run kantra on a project.</p>
          {/each}
        </Card>
      </div>
    </div>
  {/snippet}
</NavPage>
