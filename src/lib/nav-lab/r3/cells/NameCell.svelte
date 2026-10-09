<script lang="ts">
/** Name cell (PD ContainerColumnName / ImageColumnName): bold title, small second line. */
import type { LabRow } from './types.ts';

interface Props {
  object: LabRow;
}

let { object }: Props = $props();
</script>

<button type="button" data-testid="row-name" class="flex flex-col whitespace-nowrap max-w-full text-left" onclick={object.open} disabled={!object.open}>
  <span class="max-w-full truncate text-[var(--pd-table-body-text-highlight)] hover:text-[var(--pd-link)]" title={object.title}>{object.title}</span>
  {#if object.sub.length || object.shortId || object.chip}
    <span class="flex items-center gap-2 max-w-full text-xs font-extra-light text-[var(--pd-table-body-text)]">
      {#if object.chip}<span class="shrink-0 rounded-sm px-1.5 leading-4 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{object.chip}</span>{/if}
      {#if object.shortId}<span class="shrink-0 text-[var(--pd-table-body-text-sub-highlight)]">{object.shortId}</span>{/if}
      {#each object.sub as s, i (i)}<span class="truncate" class:shrink-0={i === 0}>{s}</span>{/each}
    </span>
  {/if}
</button>
