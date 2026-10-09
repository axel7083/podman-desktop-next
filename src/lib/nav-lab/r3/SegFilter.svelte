<script lang="ts">
/**
 * P13 compact segmented control: list filters (All / Running / Stopped),
 * details views (Summary / Inspect / …) and scan severities, all alike.
 */
interface Props {
  tabs: [string, string][];
  value: string;
  onpick: (v: string) => void;
  label?: string;
  testid?: string;
}

let { tabs, value, onpick, label = 'Filter', testid = 'seg-filter' }: Props = $props();
</script>

<div role="radiogroup" aria-label={label} data-testid={testid} class="flex shrink-0 h-7 p-0.5 rounded-md border border-[var(--pd-content-divider)] text-xs">
  {#each tabs as [id, text] (id)}
    <button
      type="button"
      role="radio"
      aria-checked={value === id}
      class="px-2.5 rounded whitespace-nowrap {value === id ? 'bg-[var(--pd-action-button-details-bg)] text-[var(--pd-content-header)] font-medium' : 'text-[var(--pd-table-body-text)] hover:text-[var(--pd-content-header)]'}"
      onclick={(): void => onpick(id)}>{text}</button>
  {/each}
</div>
