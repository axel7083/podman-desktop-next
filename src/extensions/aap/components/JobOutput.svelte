<script lang="ts">
/** Job output: details, failed host events, host summary and streamed stdout (/jobs/{id}/stdout/). */
import { faArrowLeft, faArrowsRotate, faExternalLinkSquareAlt, faLaptopCode } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { tick } from 'svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { toast } from '#lib/world.svelte.ts';

import { AAP_URL, elapsedLabel, failedEvents, hostSummary, type Job, launchTemplate, stdoutOf, store } from '../data.ts';
import StatusDot from './StatusDot.svelte';

interface Props {
  conn: ConnectionView;
  job: Job;
}

let { conn, job }: Props = $props();

const { templates } = store();
const tpl = $derived(templates.find(t => t.id === job.template_id));
const lines = $derived(stdoutOf(job).slice(0, job.shown));
const done = $derived(job.status !== 'running' && job.status !== 'pending' && job.status !== 'waiting');
const summary = $derived(hostSummary(job));
const failures = $derived(done ? failedEvents(job) : []);
let scroller = $state<HTMLPreElement>();

$effect(() => {
  void lines.length;
  tick()
    .then(() => scroller?.scrollTo({ top: scroller.scrollHeight }))
    .catch(() => undefined);
});

function back(): void {
  navigate(`/c/${conn.id}/aap-jobs`);
}

function relaunch(): void {
  if (!tpl) return;
  const id = launchTemplate(tpl, job.limit ?? '', job.extra_vars ?? '', 'relaunch');
  navigate(`/c/${conn.id}/aap-jobs?job=${id}`);
}

function openInAap(): void {
  toast({ type: 'info', title: 'Opening AAP', body: `${AAP_URL}/execution/jobs/playbook/${job.id}/output` });
}

async function runLocally(): Promise<void> {
  // lazy: the registry eagerly imports every extension (avoid an import cycle)
  const { registry } = await import('#lib/ext/registry.svelte.ts');
  const cmd = registry.commands.find(c => c.id === 'ansible.runPlaybook');
  if (!cmd) {
    toast({ type: 'warning', title: 'Ansible extension is not enabled', body: 'Enable redhat.ansible to run playbooks locally with ansible-navigator.' });
    return;
  }
  navigate('/tools/ansible?tab=runs');
  cmd.run();
  toast({ type: 'info', title: `Same EE as job ${job.id}`, body: `${tpl?.playbook ?? 'playbook'} · ${tpl?.execution_environment ?? ''}` });
}

function runLocallyClick(): void {
  runLocally().catch((err: unknown) => console.error(err));
}
</script>

<div class="flex flex-col w-full h-full overflow-auto pt-4" role="region" aria-label="Job {job.id}">
  <div class="flex items-center px-5 pb-3 gap-3">
    <Button type="link" icon={faArrowLeft} onclick={back} aria-label="All jobs">Jobs</Button>
    <h1 class="text-xl font-bold text-[var(--pd-content-header)] grow">{job.id} — {job.name}</h1>
    <Button type="secondary" icon={faExternalLinkSquareAlt} onclick={openInAap}>Open in AAP</Button>
    <Button type="secondary" icon={faArrowsRotate} onclick={relaunch} disabled={!done}>Relaunch</Button>
    {#if job.status === 'failed'}
      <Button icon={faLaptopCode} onclick={runLocallyClick}>Run locally in same EE</Button>
    {/if}
  </div>

  <div class="px-5 pb-5 flex flex-col gap-4">
    <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm text-[var(--pd-content-card-text)]" aria-label="Job details">
      <div><div class="text-xs uppercase opacity-70">Status</div><StatusDot object={{ status: job.status }} /></div>
      <div><div class="text-xs uppercase opacity-70">Launch type</div>{job.launch_type}{job.launch_type === 'webhook' ? ' (EDA rulebook podman-health)' : ''}</div>
      <div><div class="text-xs uppercase opacity-70">Launched by</div>{job.launched_by}</div>
      <div><div class="text-xs uppercase opacity-70">Elapsed</div>{elapsedLabel(job)}</div>
      <div><div class="text-xs uppercase opacity-70">Template</div>{tpl?.name ?? '–'}</div>
      <div><div class="text-xs uppercase opacity-70">Playbook</div>{tpl?.playbook ?? '–'}</div>
      <div><div class="text-xs uppercase opacity-70">Inventory</div>{tpl?.inventory ?? '–'}{job.limit ? ` · limit ${job.limit}` : ''}</div>
      <div><div class="text-xs uppercase opacity-70">Execution environment</div>{tpl?.execution_environment ?? '–'} · {job.execution_node}</div>
    </section>

    {#if failures.length}
      <section class="rounded-lg p-4 flex flex-col gap-2 border border-[var(--pd-state-error)] bg-[var(--pd-content-card-bg)]" aria-label="Failed host events">
        {#each failures as f (f.host + f.task)}
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs px-1.5 py-0.5 rounded-sm bg-[var(--pd-status-terminated-bg)] text-[var(--pd-state-error)]">runner_on_failed</span>
              <span class="text-[var(--pd-content-card-header-text)] font-semibold">{f.host}</span>
              <span class="text-[var(--pd-content-card-text)]">TASK [{f.task}]</span>
            </div>
            <code class="text-sm text-[var(--pd-content-card-text)]">"msg": "{f.msg}"</code>
          </div>
        {/each}
      </section>
    {/if}

    {#if done && Object.keys(summary).length && job.status !== 'canceled'}
      <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4" aria-label="Host summary">
        <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)] mb-2">Host summary</h2>
        <table class="w-full text-sm text-[var(--pd-table-body-text)]">
          <thead>
            <tr class="text-left uppercase text-xs text-[var(--pd-table-header-text)]">
              <th class="py-1 font-semibold">Host</th><th class="py-1 font-semibold">Ok</th><th class="py-1 font-semibold">Changed</th><th class="py-1 font-semibold">Failed</th><th class="py-1 font-semibold">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(summary) as [host, s] (host)}
              <tr class="border-t border-[var(--pd-content-table-border)]">
                <td class="py-1.5 text-[var(--pd-table-body-text-highlight)]">{host}</td>
                <td class="py-1.5 text-[var(--pd-state-success)]">{s.ok}</td>
                <td class="py-1.5 {s.changed ? 'text-[var(--pd-state-warning)]' : ''}">{s.changed}</td>
                <td class="py-1.5 {s.failed ? 'text-[var(--pd-state-error)]' : ''}">{s.failed}</td>
                <td class="py-1.5 {s.skipped ? 'text-[var(--pd-state-info)]' : ''}">{s.skipped}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}

    <section class="flex flex-col gap-1.5">
      <h2 class="text-base font-semibold text-[var(--pd-content-header)]">Output</h2>
      <pre
        bind:this={scroller}
        class="h-96 overflow-auto rounded-lg p-3 text-xs font-mono leading-5 whitespace-pre-wrap bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)]"
        role="log"
        aria-label="Job output">{lines.join('\n')}{#if !done}{'\n'}▍{/if}</pre>
    </section>
  </div>
</div>
