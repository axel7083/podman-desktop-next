<script lang="ts">
/** Two-line table cell: main text + optional muted sub line. */
interface Props {
  object: { text: string; sub?: string; mono?: boolean };
}

let { object }: Props = $props();
</script>

<div class="flex flex-col min-w-0 max-w-full">
  <span class="truncate text-sm text-[var(--pd-table-body-text)]" class:font-mono={object.mono} title={object.text}>{object.text}</span>
  {#if object.sub}<span class="truncate text-xs text-[var(--pd-table-body-text-sub-secondary)]" title={object.sub}>{object.sub}</span>{/if}
</div>
