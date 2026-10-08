<script lang="ts">
/** `ansible-navigator replay <artifact>`: plays → tasks per host, PLAY RECAP, failures, stdout. */
import { faArrowLeft, faArrowsRotate, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { Button, Spinner } from '@podman-desktop/ui-svelte';

import { navigate } from '#lib/nav.ts';

import { openAdtShell, runPlaybook } from '../actions.ts';
import { type AnsibleRun, recapOf, type TaskResult, type TaskResultKind } from '../data.ts';
import DotCell from './DotCell.svelte';

interface Props {
  run: AnsibleRun;
}

let { run }: Props = $props();

const recap = $derived(recapOf(run));
const hosts = $derived(Object.keys(recap));
const failures = $derived(run.plays.flatMap(p => p.tasks.filter(t => t.__result === 'failed' || t.__result === 'unreachable')));
let showStdout = $state(false);

const RESULT_CLASS: Record<TaskResultKind, string> = {
  ok: 'text-[var(--pd-state-success)]',
  changed: 'text-[var(--pd-state-warning)]',
  failed: 'text-[var(--pd-state-error)]',
  unreachable: 'text-[var(--pd-state-error)]',
  skipped: 'text-[var(--pd-state-info)]',
};

function taskRows(tasks: TaskResult[]): { task: string; action: string; byHost: Record<string, TaskResult> }[] {
  const out: { task: string; action: string; byHost: Record<string, TaskResult> }[] = [];
  for (const t of tasks) {
    let r = out.find(x => x.task === t.task);
    if (!r) {
      r = { task: t.task, action: t.task_action, byHost: {} };
      out.push(r);
    }
    r.byHost[t.host] = t;
  }
  return out;
}

function back(): void {
  navigate('/tools/ansible?tab=runs');
}

function rerun(): void {
  runPlaybook(run.playbook, run.inventory, run.ee);
}

function toggleStdout(): void {
  showStdout = !showStdout;
}

function duration(): string {
  const s = run.durationSec ?? Math.round((Date.now() - run.started) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}
</script>

<div class="flex flex-col gap-4 px-5 pb-5" aria-label="Run replay">
  <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex items-start gap-4">
    <div class="flex flex-col gap-1 grow min-w-0">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] truncate">{run.artifact}</h2>
        <DotCell object={{ status: run.status }} />
      </div>
      <div class="text-sm text-[var(--pd-content-card-text)] flex flex-wrap gap-x-4">
        <span>Playbook <b>{run.playbook}</b></span>
        <span>Inventory <b>{run.inventory}</b></span>
        <span>EE <b>{run.ee.split('/').pop()}</b></span>
        <span>Duration <b>{duration()}</b></span>
      </div>
      <code class="text-xs text-[var(--pd-content-card-light-title)]">ansible-navigator replay {run.artifact}</code>
    </div>
    <div class="flex gap-2 shrink-0">
      <Button type="link" icon={faArrowLeft} onclick={back}>All runs</Button>
      <Button type="secondary" icon={faArrowsRotate} onclick={rerun} disabled={run.status === 'running'}>Run again</Button>
      <Button icon={faTerminal} onclick={openAdtShell}>Open in ADT shell</Button>
    </div>
  </section>

  {#each run.plays as play, i (i)}
    <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex flex-col gap-2" aria-label="Play {play.name}">
      <h3 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">PLAY [{play.name}]</h3>
      <table class="w-full text-sm text-[var(--pd-table-body-text)]" aria-label="Tasks of {play.name}">
        <thead>
          <tr class="text-left uppercase text-xs text-[var(--pd-table-header-text)]">
            <th class="py-1 font-semibold">Task</th>
            <th class="py-1 font-semibold">Module</th>
            {#each hosts as h (h)}<th class="py-1 font-semibold">{h}</th>{/each}
          </tr>
        </thead>
        <tbody>
          {#each taskRows(play.tasks) as t (t.task)}
            <tr class="border-t border-[var(--pd-content-table-border)]">
              <td class="py-1.5 text-[var(--pd-table-body-text-highlight)]">{t.task}</td>
              <td class="py-1.5 font-mono text-xs">{t.action}</td>
              {#each hosts as h (h)}
                {@const r = t.byHost[h]}
                <td class="py-1.5 font-mono {r ? RESULT_CLASS[r.__result] : 'opacity-40'}" title={r?.msg}>
                  {r ? r.__result : '–'}{#if r?.__duration}<span class="ml-1 text-xs text-[var(--pd-table-body-text)] opacity-70">{r.__duration}</span>{/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/each}

  {#if run.status === 'running'}
    <div class="flex items-center gap-2 text-[var(--pd-content-text)]"><Spinner size="14px" /> Running… tasks stream in as the EE reports them.</div>
  {/if}

  {#if failures.length}
    <section class="rounded-lg p-4 flex flex-col gap-2 border border-[var(--pd-state-error)] bg-[var(--pd-content-card-bg)]" aria-label="Failed tasks">
      {#each failures as f (f.task + f.host)}
        <div class="flex items-start gap-3">
          <span class="text-[var(--pd-state-error)] font-semibold">fatal: [{f.host}]</span>
          <div class="flex flex-col grow">
            <span class="text-[var(--pd-content-card-header-text)]">TASK [{f.task}] <span class="font-mono text-xs">{f.task_action}</span></span>
            <code class="text-sm text-[var(--pd-content-card-text)]">"msg": "{f.msg}"</code>
          </div>
          <Button type="secondary" icon={faTerminal} onclick={openAdtShell}>Debug in ADT shell</Button>
        </div>
      {/each}
    </section>
  {/if}

  {#if hosts.length && run.status !== 'running'}
    <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4" aria-label="Play recap">
      <h3 class="text-base font-semibold text-[var(--pd-content-card-header-text)] mb-2">PLAY RECAP</h3>
      <table class="w-full text-sm font-mono">
        <tbody>
          {#each hosts as h (h)}
            {@const r = recap[h]}
            <tr>
              <td class="py-0.5 pr-6 {r.failed || r.unreachable ? 'text-[var(--pd-state-error)]' : r.changed ? 'text-[var(--pd-state-warning)]' : 'text-[var(--pd-state-success)]'}">{h}</td>
              <td class="py-0.5 pr-4 text-[var(--pd-state-success)]">ok={r.ok}</td>
              <td class="py-0.5 pr-4 {r.changed ? 'text-[var(--pd-state-warning)]' : 'text-[var(--pd-table-body-text)]'}">changed={r.changed}</td>
              <td class="py-0.5 pr-4 text-[var(--pd-table-body-text)]">unreachable={r.unreachable}</td>
              <td class="py-0.5 pr-4 {r.failed ? 'text-[var(--pd-state-error)]' : 'text-[var(--pd-table-body-text)]'}">failed={r.failed}</td>
              <td class="py-0.5 pr-4 {r.skipped ? 'text-[var(--pd-state-info)]' : 'text-[var(--pd-table-body-text)]'}">skipped={r.skipped}</td>
              <td class="py-0.5 text-[var(--pd-table-body-text)]">rescued=0 ignored=0</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  <section class="flex flex-col gap-2">
    <div>
      <Button type="link" onclick={toggleStdout} aria-label={showStdout ? 'Hide stdout' : 'Show stdout'}>{showStdout || run.status === 'running' ? 'Hide stdout' : 'Show stdout'}</Button>
    </div>
    {#if showStdout || run.status === 'running'}
      <pre
        class="max-h-80 overflow-auto rounded-lg p-3 text-xs font-mono leading-5 bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)]"
        aria-label="Playbook stdout">{run.stdout.join('\n')}</pre>
    {/if}
  </section>
</div>
