<script lang="ts">
/**
 * Container › JFR tab (P14): the Cryostat target behind this container,
 * a "Start recording" form, its active recordings with a countdown, its
 * archives and the automated analysis of the last archived recording.
 */
import { faBoxArchive, faCircleDot, faFileLines, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox, Dropdown, Input } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import type { Container } from '#lib/world.svelte.ts';
import { humanAge, humanSize } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import CopyField from '../../_appdev/CopyField.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import {
  type ActiveRecording,
  analysedArchive,
  archiveAndAnalyse,
  archives,
  type ArchivedRecording,
  deleteRecording,
  EVENT_TEMPLATES,
  recordings,
  remainingSeconds,
  resumeRecordings,
  showReport,
  startRecording,
  stopRecording,
  targetOf,
  templateOf,
} from '../data.ts';
import AnalysisReport from './AnalysisReport.svelte';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const container = $derived(ctx.resource as Container);
const target = $derived(targetOf(container, 3));
const recs = $derived(recordings(container.name));
const archs = $derived(archives(container.name));
const analysed = $derived(analysedArchive(container.name));
const analysing = $derived(recs.some(r => r.state === 'STOPPED' && r.archive && !archs.some(a => a.name === r.archive)));

let name = $state('orders-load-test');
let template = $state('Profiling');
let duration = $state('60');
let archiveOnStop = $state(true);

const nameTaken = $derived(recs.some(r => r.name === name.trim()));
const durationS = $derived(Number(duration));
const valid = $derived(name.trim() !== '' && !nameTaken && Number.isFinite(durationS) && durationS > 0);
const templateOptions = EVENT_TEMPLATES.map(t => ({ value: t.name, label: `${t.name} (${t.type === 'CUSTOM' ? 'custom' : t.provider})` }));
const templateDescription = $derived(EVENT_TEMPLATES.find(t => t.name === template)?.description ?? '');

$effect(() => {
  // restart countdown timers after a reload (no state is written)
  void recs.length;
  resumeRecordings();
});

function start(): void {
  if (!valid) return;
  startRecording(container.name, name.trim(), template, durationS, archiveOnStop);
  name = nextName(name.trim());
}

/** Suggest the next free name (orders-load-test → orders-load-test-2). */
function nextName(base: string): string {
  const stem = base.replace(/-\d+$/, '');
  let i = 2;
  while (recs.some(r => r.name === `${stem}-${i}`)) i++;
  return `${stem}-${i}`;
}

function stop(r: ActiveRecording): void {
  stopRecording(r.id);
}

function archive(r: ActiveRecording): void {
  archiveAndAnalyse(r.id);
}

function remove(r: ActiveRecording): void {
  deleteRecording(r.id);
}

function view(a: ArchivedRecording): void {
  showReport(container.name, a.name);
}

function viewOf(r: ActiveRecording): void {
  if (r.archive) showReport(container.name, r.archive);
}

function stateTone(r: ActiveRecording): 'running' | 'neutral' | 'info' {
  if (r.state === 'RUNNING') return 'running';
  return r.state === 'STOPPED' ? 'info' : 'neutral';
}

function durationLabel(r: ActiveRecording): string {
  return r.continuous ? 'Continuous' : `${Math.round(r.duration / 1000)} s`;
}

function progressOf(r: ActiveRecording): number {
  return r.duration ? Math.round((r.elapsed / r.duration) * 100) : 0;
}

function archived(r: ActiveRecording): boolean {
  return !!r.archive && archs.some(a => a.name === r.archive);
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-3" aria-label="JFR">
  <div class="grid grid-cols-[3fr_2fr] gap-3">
    <Card title="Cryostat target" subtitle="Discovered over the Podman socket (io.cryostat.discovery=true)">
      <div class="space-y-3">
        <CopyField label="Connect URL" value={target.connectUrl} />
        <KeyValue
          labelWidth="w-32"
          rows={[
            ['Alias', target.alias],
            ['Realm', target.annotations.cryostat.REALM],
            ['JAVA_MAIN', target.annotations.cryostat.JAVA_MAIN],
            ['JMX port', target.annotations.cryostat.PORT],
            ['JVM ID', target.jvmId],
          ]} />
      </div>
    </Card>

    <Card title="Start recording" subtitle="JDK Flight Recorder, through Cryostat 4.2">
      <div class="space-y-3" role="group" aria-label="Start recording">
        <div class="flex flex-col gap-1">
          <label for="jfr-name" class="text-sm">Name</label>
          <Input id="jfr-name" bind:value={name} aria-label="Recording name" error={nameTaken ? 'A recording with this name already exists on the target' : undefined} />
        </div>
        <div class="flex flex-col gap-1">
          <label for="jfr-template" class="text-sm">Event template</label>
          <Dropdown id="jfr-template" bind:value={template} options={templateOptions} ariaLabel="Event template" />
          <span class="text-xs opacity-80">{templateDescription}</span>
        </div>
        <div class="flex items-end gap-3">
          <div class="flex flex-col gap-1 w-32">
            <label for="jfr-duration" class="text-sm">Duration (s)</label>
            <Input id="jfr-duration" type="number" min="1" bind:value={duration} aria-label="Duration in seconds" />
          </div>
          <Checkbox bind:checked={archiveOnStop} title="Archive and analyse when the recording stops">Archive and analyse when it stops</Checkbox>
        </div>
        <Button icon={faCircleDot} disabled={!valid} onclick={start}>Start recording</Button>
      </div>
    </Card>
  </div>

  <Card title="Recordings" subtitle="Active recordings on {container.name}">
    {#if recs.length === 0}
      <p class="text-sm">No recordings yet. Start one above.</p>
    {:else}
      <table class="w-full text-left" aria-label="Recordings">
        <thead>
          <tr class="text-sm text-[var(--pd-table-body-text)]">
            <th class="py-1 font-normal">Name</th>
            <th class="py-1 font-normal">Template</th>
            <th class="py-1 font-normal">State</th>
            <th class="py-1 font-normal">Duration</th>
            <th class="py-1 font-normal">Started</th>
            <th class="py-1 font-normal text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each recs as r (r.id)}
            <tr class="border-t border-[var(--pd-content-divider)]" aria-label="Recording {r.name}">
              <td class="py-2 font-medium text-[var(--pd-content-card-header-text)]">{r.name}</td>
              <td class="py-2">{templateOf(r)}</td>
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <Pill label={r.state} tone={stateTone(r)} />
                  {#if r.state === 'RUNNING' && !r.continuous}
                    <div class="h-1.5 w-20 rounded-full bg-[var(--pd-content-card-inset-bg)]" role="progressbar" aria-label="Recording progress" aria-valuenow={progressOf(r)} aria-valuemin={0} aria-valuemax={100}>
                      <div class="h-1.5 rounded-full bg-[var(--pd-status-running)] transition-all" style="width: {progressOf(r)}%"></div>
                    </div>
                    <span class="text-sm tabular-nums" aria-live="polite">{remainingSeconds(r)} s left</span>
                  {:else if r.state === 'STOPPED' && r.archive && !archived(r)}
                    <span class="text-sm">Archiving…</span>
                  {/if}
                </div>
              </td>
              <td class="py-2">{durationLabel(r)}</td>
              <td class="py-2">{humanAge(r.startTime)} ago</td>
              <td class="py-2">
                <div class="flex justify-end gap-2">
                  {#if r.state === 'RUNNING'}
                    <Button type="secondary" icon={faStop} onclick={stop.bind(undefined, r)} aria-label="Stop {r.name}">Stop</Button>
                  {:else if !r.archive}
                    <Button type="secondary" icon={faBoxArchive} onclick={archive.bind(undefined, r)} aria-label="Archive and analyse {r.name}">Archive and analyse</Button>
                  {:else if archived(r)}
                    <Button type="secondary" icon={faFileLines} onclick={viewOf.bind(undefined, r)} aria-label="View report of {r.name}">View report</Button>
                  {/if}
                  <Button type="link" icon={faTrash} onclick={remove.bind(undefined, r)} aria-label="Delete recording {r.name}" title="Delete" />
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </Card>

  {#if archs.length}
    <Card title="Archives" subtitle="Stored in the archivedrecordings bucket of the local Cryostat">
      <table class="w-full text-left" aria-label="Archives">
        <tbody>
          {#each archs as a (a.name)}
            <tr class="border-t first:border-t-0 border-[var(--pd-content-divider)]">
              <td class="py-2 font-mono text-sm truncate max-w-0 w-full" title={a.name}>{a.name}</td>
              <td class="py-2 px-3 whitespace-nowrap tabular-nums">{humanSize(a.size)}</td>
              <td class="py-2 px-3 whitespace-nowrap">{humanAge(a.archivedTime)} ago</td>
              <td class="py-2 text-right">
                <Button type="secondary" icon={faFileLines} selected={analysed?.name === a.name} onclick={view.bind(undefined, a)} aria-label="View report of {a.name}">View report</Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Card>
  {/if}

  {#if analysing}
    <Card title="Analysing recording" subtitle="Uploading the .jfr file and generating the automated report…" />
  {/if}

  {#if analysed}
    {#key analysed.name}
      <AnalysisReport archive={analysed} />
    {/key}
  {/if}
</div>
