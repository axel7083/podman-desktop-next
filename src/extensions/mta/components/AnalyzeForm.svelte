<script lang="ts">
/** Analyze wizard (`kantra analyze`): input, source, targets, mode, hybrid providers; live task log. */
import { faCheck, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, FormPage, Input } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import { navigate, appUrl } from '#lib/nav.ts';
import { cancelTask, world } from '#lib/world.svelte.ts';

import TaskLog from '../../_appdev/TaskLog.svelte';
import { type Analysis, PROJECTS, SOURCES, startAnalysis, TARGETS } from '../data.ts';

const initialProject = PROJECTS.find(p => p.name === appUrl().searchParams.get('project')) ?? PROJECTS[0];

let input = $state(initialProject.path);
let source = $state('eap7');
let targets = $state<string[]>(['eap8', 'quarkus']);
let mode = $state<'source-only' | 'full'>('source-only');
let hybrid = $state(true);
let analysisId = $state<string>();
let taskId = $state<string>();

const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const running = $derived(task?.status === 'in-progress');
const done = $derived(task?.status === 'success');
const locked = $derived(running || done);
const selectedTargets = $derived(TARGETS.filter(t => targets.includes(t.id)));
const valid = $derived(input.trim().length > 0 && targets.length > 0);

const MODES = [
  { value: 'source-only', label: 'Source only (application code)' },
  { value: 'full', label: 'Full (source + dependencies)' },
];

function onInput(e: Event): void {
  input = (e.currentTarget as HTMLInputElement).value;
}

function browse(): void {
  input = input === PROJECTS[0].path ? PROJECTS[1].path : PROJECTS[0].path;
}

function onSource(v: string): void {
  source = v;
}

function onMode(v: string): void {
  mode = v === 'full' ? 'full' : 'source-only';
}

function toggleTarget(id: string, checked: boolean): void {
  targets = checked ? [...targets.filter(t => t !== id), id] : targets.filter(t => t !== id);
}

function onHybrid(checked: boolean): void {
  hybrid = checked;
}

function openReport(): void {
  if (analysisId) navigate(`/tools/mta?report=${analysisId}`);
}

function finished(a: Analysis): void {
  // only take the user to the report if they are still watching the wizard
  if (appUrl().pathname.endsWith('/tools/mta') && appUrl().searchParams.get('view') === 'analyze') navigate(`/tools/mta?report=${a.id}`);
}

function run(): void {
  const ordered = TARGETS.map(t => t.id).filter(id => targets.includes(id));
  const a = startAnalysis({ input: input.trim(), source, targets: ordered, mode, hybrid, onDone: finished });
  analysisId = a.id;
  taskId = a.taskId;
}

function close(): void {
  navigate('/tools/mta');
}

function cancel(): void {
  if (taskId && running) cancelTask(taskId);
  else close();
}
</script>

<FormPage title="Analyze application" inProgress={running} breadcrumbLeftPart="MTA" breadcrumbRightPart="Analyze application" onclose={close} onbreadcrumbClick={close}>
  {#snippet icon()}<AppIcon icon="icons/redhat.mta.svg" size="40px" />{/snippet}
  {#snippet content()}
    <div class="px-5 pb-5 min-w-full max-w-[960px]">
      <div class="bg-[var(--pd-content-card-bg)] py-6 px-8 rounded-lg space-y-5 text-[var(--pd-content-card-text)]" role="form" aria-label="Analyze application">
        <p>Run <code>kantra analyze</code> (MTA CLI 8.1.1) against your source code and get the issues to fix, with story points, for each migration target.</p>

        <div class="flex flex-col gap-1.5">
          <label for="mta-input" class="block text-base font-semibold text-[var(--pd-content-card-header-text)]">Application input folder</label>
          <div class="flex gap-2">
            <Input id="mta-input" value={input} oninput={onInput} disabled={locked} class="grow" />
            <Button type="secondary" icon={faFolderOpen} onclick={browse} disabled={locked}>Browse…</Button>
          </div>
          <span class="text-sm opacity-80">A Maven project folder or a WAR/EAR archive (binary input requires full mode).</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="mta-source" class="block text-base font-semibold text-[var(--pd-content-card-header-text)]">Source technology</label>
          <Dropdown id="mta-source" value={source} options={SOURCES} onChange={onSource} disabled={locked} ariaLabel="Source technology" />
        </div>

        <fieldset class="flex flex-col gap-1.5">
          <legend class="block text-base font-semibold text-[var(--pd-content-card-header-text)] mb-1.5">Targets</legend>
          {#if locked}
            <!-- read-only while the run is going: show what is analyzed, not greyed-out checkboxes -->
            <ul class="grid grid-cols-2 gap-2" aria-label="Selected targets">
              {#each selectedTargets as target (target.id)}
                <li class="flex items-center gap-2"><span class="text-[var(--pd-state-success)]"><Icon icon={faCheck} /></span><span><code>{target.id}</code> · {target.label}</span></li>
              {/each}
            </ul>
          {:else}
            <div class="grid grid-cols-2 gap-2">
              {#each TARGETS as target (target.id)}
                <Checkbox checked={targets.includes(target.id)} onclick={toggleTarget.bind(undefined, target.id)} title={target.label}>
                  <span><code>{target.id}</code> · {target.label}</span>
                </Checkbox>
              {/each}
            </div>
          {/if}
        </fieldset>

        <div class="flex flex-col gap-1.5">
          <label for="mta-mode" class="block text-base font-semibold text-[var(--pd-content-card-header-text)]">Analysis mode</label>
          <Dropdown id="mta-mode" value={mode} options={MODES} onChange={onMode} disabled={locked} ariaLabel="Analysis mode" />
        </div>

        <div class="flex flex-col gap-1">
          {#if locked}
            <div class="flex items-center gap-2 font-semibold text-[var(--pd-content-card-header-text)]">
              {#if hybrid}<span class="text-[var(--pd-state-success)]"><Icon icon={faCheck} /></span>Providers run in containers (hybrid mode, Podman){:else}Providers run in-process (containerless){/if}
            </div>
          {:else}
            <Checkbox checked={hybrid} onclick={onHybrid}>Run providers in containers (hybrid mode, Podman)</Checkbox>
          {/if}
          <span class="text-sm opacity-80" class:pl-7={!locked}>
            {hybrid
              ? 'Starts quay.io/konveyor/java-external-provider on podman-machine-default for the duration of the run (--run-local=false).'
              : 'Runs the Java provider in-process: needs JDK 17+ and Maven on this machine (default, containerless).'}
          </span>
        </div>

        <TaskLog {taskId} label="Analysis progress" />

        <div class="flex justify-end gap-2 pt-2">
          <Button type="link" onclick={cancel}>{running ? 'Cancel' : done ? 'Close' : 'Cancel'}</Button>
          {#if done}
            <Button onclick={openReport}>Open report</Button>
          {:else}
            <Button onclick={run} inProgress={running} disabled={running || !valid}>Run</Button>
          {/if}
        </div>
      </div>
    </div>
  {/snippet}
</FormPage>
