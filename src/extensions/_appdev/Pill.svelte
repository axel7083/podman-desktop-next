<script lang="ts">
/** State chip (RUNNING / FAILED / mandatory…) using PD status + label tokens. */
interface Props {
  label: string;
  tone?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'running';
  title?: string;
}

let { label, tone = 'neutral', title }: Props = $props();

const TONES: Record<string, string> = {
  success: 'text-[var(--pd-state-success)] border-[var(--pd-state-success)]',
  running: 'text-[var(--pd-status-running)] border-[var(--pd-status-running)]',
  warning: 'text-[var(--pd-state-warning)] border-[var(--pd-state-warning)]',
  error: 'text-[var(--pd-state-error)] border-[var(--pd-state-error)]',
  info: 'text-[var(--pd-state-info)] border-[var(--pd-state-info)]',
  neutral: 'text-[var(--pd-label-text)] border-[var(--pd-content-divider)]',
};
</script>

<span class="inline-flex items-center gap-1 rounded-full border px-2 py-px text-xs font-medium whitespace-nowrap {TONES[tone]}" {title}>
  {#if tone === 'running'}<span class="w-1.5 h-1.5 rounded-full bg-[var(--pd-status-running)]"></span>{/if}
  {label}
</span>
