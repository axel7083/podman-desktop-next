<script lang="ts">
/** Compact segmented filter (All / Running / Stopped) for the list header. */
interface Props {
  tabs: [string, string][];
  value: string;
  onpick: (v: string) => void;
}

let { tabs, value, onpick }: Props = $props();
</script>

<div role="radiogroup" aria-label="Filter" data-testid="seg-filter" class="flex shrink-0 h-7 p-0.5 rounded-md border border-[var(--pd-content-divider)] text-xs">
  {#each tabs as [id, label] (id)}
    <button
      type="button"
      role="radio"
      aria-checked={value === id}
      class="px-2.5 rounded {value === id ? 'bg-[var(--pd-action-button-details-bg)] text-[var(--pd-content-header)] font-medium' : 'text-[var(--pd-content-sub-header)] hover:text-[var(--pd-content-header)]'}"
      onclick={(): void => onpick(id)}>{label}</button>
  {/each}
</div>
