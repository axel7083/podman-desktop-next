<script lang="ts">
/** Konflux › PipelineRuns: Tekton runs of the tenant, task timeline, logs and re-run. */
import { faArrowsRotate, faCircleCheck, faCircleXmark, faCodeBranch, faForward } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage, Spinner } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ConnectionView } from '#lib/ext/types.ts';
import { type KubeObject, toast, world } from '#lib/world.svelte.ts';

import { rerun, SNYK_LOG, type TaskRun } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
let selected = $state<string | undefined>('payments-api-on-push-7k2xq');
let logsOpen = $state(false);

const runs = $derived(
  (world.kube[conn.id] ?? [])
    .filter(o => o.kind === 'PipelineRun' && o.metadata.name.includes(searchTerm))
    .toSorted((a, b) => b.metadata.creationTimestamp.localeCompare(a.metadata.creationTimestamp)),
);
const current = $derived(runs.find(r => r.metadata.name === selected));

function reason(o: KubeObject): string {
  return String(o.status?.reason ?? 'Unknown');
}

function label(o: KubeObject, key: string): string {
  return o.metadata.labels?.[key] ?? '';
}

function age(o: KubeObject): string {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(o.metadata.creationTimestamp)) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 48 * 60 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}

function select(name: string): void {
  selected = name;
  logsOpen = false;
}

function showLogs(): void {
  logsOpen = !logsOpen;
}

function openRepo(): void {
  toast({ type: 'info', title: 'Opening https://github.com/acme/payments/blob/e41c9a0/src/main/java/com/acme/payments/ReceiptResource.java#L48' });
}

function doRerun(o: KubeObject): void {
  selected = rerun(label(o, 'appstudio.openshift.io/component'));
  logsOpen = false;
}

const REASON_CLASS: Record<string, string> = {
  Succeeded: 'text-[var(--pd-state-success)]',
  Failed: 'text-[var(--pd-state-error)]',
  Running: 'text-[var(--pd-state-info)]',
};

const TASK_CLASS: Record<TaskRun['status'], string> = {
  Succeeded: 'border-[var(--pd-state-success)]',
  Failed: 'border-[var(--pd-state-error)] bg-[var(--pd-content-card-inset-surface)]',
  Running: 'border-[var(--pd-state-info)]',
  Pending: 'border-[var(--pd-content-divider)] opacity-60',
  Skipped: 'border-[var(--pd-content-divider)] opacity-40',
};
</script>

<NavPage bind:searchTerm={searchTerm} title="PipelineRuns">
  {#snippet bottomAdditionalActions()}<span class="text-sm text-[var(--pd-content-text)]">Namespace acme-tenant · Pipelines-as-Code</span>{/snippet}
  {#snippet content()}
    <div role="region" class="w-full px-5 py-3 space-y-2 text-[var(--pd-content-text)] overflow-auto" aria-label="PipelineRuns">
      {#each runs as r (r.metadata.uid)}
        {@const rs = reason(r)}
        <button
          class="w-full flex items-center gap-4 rounded-lg px-4 h-12 text-left bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] {selected === r.metadata.name ? 'outline outline-1 outline-[var(--pd-content-card-border-selected)]' : ''}"
          aria-label="PipelineRun {r.metadata.name}"
          onclick={select.bind(undefined, r.metadata.name)}>
          <span class="w-5 {REASON_CLASS[rs] ?? ''}">
            {#if rs === 'Running'}<Spinner size="1em" />{:else}<Icon icon={rs === 'Succeeded' ? faCircleCheck : faCircleXmark} />{/if}
          </span>
          <span class="grow min-w-0">
            <span class="block text-[var(--pd-table-body-text-highlight)] truncate">{r.metadata.name}</span>
            <span class="block text-xs">{label(r, 'appstudio.openshift.io/component')} · {label(r, 'pipelines.appstudio.openshift.io/type')} · {label(r, 'pipelinesascode.tekton.dev/event-type')}</span>
          </span>
          <span class="w-24 text-sm flex items-center gap-1"><Icon icon={faCodeBranch} size="xs" />{label(r, 'pipelinesascode.tekton.dev/sha')}</span>
          <span class="w-32 text-sm {REASON_CLASS[rs] ?? ''}">{rs}</span>
          <span class="w-40 text-sm truncate">{r.status?.failedTask ? `failed at ${String(r.status.failedTask)}` : ''}</span>
          <span class="w-20 text-sm text-right">{age(r)}</span>
        </button>
        {#if current && current.metadata.uid === r.metadata.uid}
          {@const tasks = (current.status?.taskRuns as TaskRun[] | undefined) ?? []}
          <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 space-y-3 ml-6" aria-label="PipelineRun details">
            <div role="region" class="flex flex-wrap gap-2" aria-label="Task runs">
              {#each tasks as t (t.name)}
                <span class="flex items-center gap-1 rounded-md border px-2 py-1 text-sm {TASK_CLASS[t.status]}" title="{t.name}: {t.status}">
                  {#if t.status === 'Running'}<Spinner size="0.8em" />{:else if t.status === 'Succeeded'}<span class="text-[var(--pd-state-success)]"><Icon icon={faCircleCheck} size="xs" /></span>{:else if t.status === 'Failed'}<span class="text-[var(--pd-state-error)]"><Icon icon={faCircleXmark} size="xs" /></span>{:else if t.status === 'Skipped'}<Icon icon={faForward} size="xs" />{/if}
                  {t.name}{#if t.duration}<span class="text-xs opacity-70">{t.duration}</span>{/if}
                </span>
              {/each}
            </div>
            {#if current.status?.results && (current.status.results as Record<string, string>).IMAGE_DIGEST}
              <div class="text-sm font-mono">IMAGE_URL={(current.status.results as Record<string, string>).IMAGE_URL} · IMAGE_DIGEST={(current.status.results as Record<string, string>).IMAGE_DIGEST}</div>
            {/if}
            <div class="flex gap-2">
              {#if reason(current) === 'Failed'}
                <Button type="secondary" onclick={showLogs}>{logsOpen ? 'Hide logs' : 'View logs of sast-snyk-check'}</Button>
                <Button type="secondary" icon={faCodeBranch} onclick={openRepo}>Open in repository</Button>
                <Button icon={faArrowsRotate} onclick={doRerun.bind(undefined, current)}>Push fix and re-run</Button>
              {:else if reason(current) === 'Succeeded'}
                <span class="text-sm text-[var(--pd-state-success)]">Image signed by Tekton Chains · SLSA provenance attached</span>
              {/if}
            </div>
            {#if logsOpen}
              <pre class="rounded-md bg-[var(--pd-code-block-bg)] ring-1 ring-inset ring-[var(--pd-code-block-border)] text-[var(--pd-code-block-text)] p-3 text-xs font-mono overflow-auto" role="log" aria-label="Task logs">{SNYK_LOG.join('\n')}</pre>
            {/if}
          </section>
        {/if}
      {/each}
    </div>
  {/snippet}
</NavPage>
