<script lang="ts">
/** PipelineRun › Tasks (P14): task timeline and the log of the failed step. */
import { faCircleCheck, faCircleMinus, faCircleXmark, faClock } from '@fortawesome/free-solid-svg-icons';
import { Spinner } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ResourceContext } from '#lib/ext/types.ts';
import type { KubeObject } from '#lib/world.svelte.ts';

import { ACS_STEP_LOG, type TaskRunInfo } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const run = $derived(ctx.resource as KubeObject);
const tasks = $derived((run.status?.tasks as TaskRunInfo[] | undefined) ?? []);
const failed = $derived(tasks.find(t => t.reason === 'Failed'));

const ICON = { Succeeded: faCircleCheck, Failed: faCircleXmark, Skipped: faCircleMinus, Pending: faClock } as const;
const COLOR: Record<string, string> = {
  Succeeded: 'text-[var(--pd-status-running)]',
  Failed: 'text-[var(--pd-status-terminated)]',
  Skipped: 'text-[var(--pd-status-not-running)]',
  Pending: 'text-[var(--pd-status-not-running)]',
};
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4 text-[var(--pd-content-card-text)]">
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Task timeline">
    <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-3">{run.status?.reason} · pipeline {run.metadata.labels?.['tekton.dev/pipeline']}</h2>
    <ol class="flex items-center gap-2 flex-wrap">
      {#each tasks as t, i (t.name)}
        <li class="flex items-center gap-2">
          <span class="flex items-center gap-2 rounded-md px-3 py-2 bg-[var(--pd-content-card-inset-bg)] {COLOR[t.reason] ?? ''}" title="{t.name}: {t.reason}">
            {#if t.reason === 'Running'}<Spinner size="12px" />{:else}<Icon icon={ICON[t.reason]} />{/if}
            <span class="text-[var(--pd-content-card-text)]">{t.name}</span>
            {#if t.durationS}<span class="text-xs text-[var(--pd-content-card-title)]">{t.durationS >= 60 ? `${Math.floor(t.durationS / 60)}m ${t.durationS % 60}s` : `${t.durationS}s`}</span>{/if}
          </span>
          {#if i < tasks.length - 1}<span class="w-4 border-t border-[var(--pd-content-divider)]"></span>{/if}
        </li>
      {/each}
    </ol>
  </section>
  {#if failed}
    <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Failed task log">
      <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">Log of {failed.name}</h2>
      <pre class="text-sm font-mono whitespace-pre-wrap bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)] rounded-md p-3">{failed.name === 'acs-image-check' ? ACS_STEP_LOG.join('\n') : 'Error: context deadline exceeded (PipelineRunTimeout after 1h0m0s)'}</pre>
      {#if failed.name === 'acs-image-check'}<p class="text-sm mt-2">Run the same ACS policy check locally from the image's Security tab before pushing.</p>{/if}
    </section>
  {/if}
</div>
