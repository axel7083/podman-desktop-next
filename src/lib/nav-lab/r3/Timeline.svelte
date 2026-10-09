<script lang="ts" module>
import type { IconRef } from '#lib/ext/types.ts';

export interface TimelineStep {
  id: string;
  label: string;
  state: 'done' | 'active' | 'todo';
  detail?: string;
  at?: string;
  /** Extension providing the step (14px icon). */
  icon?: IconRef;
  /** Deep link (opens the referenced tab, rule F25). */
  onopen?: () => void;
  href?: string;
  /** Next action when the step is not done yet. */
  action?: { label: string; run: () => void };
}
</script>

<script lang="ts">
/**
 * Horizontal provenance timeline (image supply chain, AI chain): one column
 * per step with a status dot, 13px label, muted detail and either a deep link
 * (done) or the labelled secondary action that performs the step (todo).
 */
import LabIcon from '../ui/LabIcon.svelte';
import Btn from './Btn.svelte';

interface Props {
  steps: TimelineStep[];
  testid?: string;
}

let { steps, testid = 'timeline' }: Props = $props();
</script>

<ol data-testid={testid} class="grid gap-0" style:grid-template-columns="repeat({steps.length}, minmax(0, 1fr))">
  {#each steps as s, i (s.id)}
    <li data-step={s.id} data-state={s.state} class="relative flex flex-col gap-1 pr-3 min-w-0">
      <div class="flex items-center gap-2 h-5">
        <span
          class="w-3 h-3 shrink-0 rounded-full border-2 {s.state === 'done' ? 'bg-[var(--pd-status-running)] border-[var(--pd-status-running)]' : s.state === 'active' ? 'bg-[var(--pd-status-starting)] border-[var(--pd-status-starting)] animate-pulse' : 'border-[var(--pd-content-divider)]'}"></span>
        {#if i < steps.length - 1}<span class="flex-1 h-px {s.state === 'done' ? 'bg-[var(--pd-status-running)]' : 'bg-[var(--pd-content-divider)]'}"></span>{/if}
      </div>
      <div class="flex items-center gap-1.5 text-[13px] font-medium {s.state === 'todo' ? 'text-[var(--pd-table-body-text)]' : 'text-[var(--pd-content-header)]'}">
        {#if s.icon}<LabIcon icon={s.icon} size={14} />{/if}<span class="truncate">{s.label}</span>
      </div>
      {#if s.state !== 'todo'}
        {#if s.onopen}
          <button type="button" data-testid="timeline-link" class="text-left text-[12px] truncate text-[var(--pd-table-body-text)] hover:text-[var(--pd-link)] hover:underline" title={s.detail} onclick={s.onopen}>{s.detail}</button>
        {:else if s.href}
          <a class="text-[12px] truncate text-[var(--pd-table-body-text)] hover:text-[var(--pd-link)] hover:underline" href={s.href} target="_blank" rel="noreferrer" title={s.detail}>{s.detail}</a>
        {:else}
          <span class="text-[12px] truncate text-[var(--pd-table-body-text)]" title={s.detail}>{s.detail}</span>
        {/if}
        {#if s.at}<span class="text-[11px] text-[var(--pd-table-body-text)]">{s.at}</span>{/if}
      {:else if s.action}
        <div class="pt-1"><Btn testid="timeline-action" onclick={s.action.run}>{s.action.label}</Btn></div>
      {/if}
    </li>
  {/each}
</ol>
