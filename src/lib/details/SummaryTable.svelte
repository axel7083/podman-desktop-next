<script lang="ts">
/** PD details/DetailsTable + DetailsTitle + DetailsCell, as data. */
import type { Snippet } from 'svelte';

interface Props {
  sections: { title: string; rows: [string, string | undefined][] }[];
  before?: Snippet;
}

let { sections, before }: Props = $props();
</script>

<div class="flex px-5 py-4 flex-col items-start h-full overflow-auto text-[var(--pd-table-body-text)]">
  {@render before?.()}
  <table class="w-full">
    <tbody>
      {#each sections as section (section.title)}
        <tr><td class="pt-1 text-lg font-semibold text-[var(--pd-table-body-text-sub-secondary)]" colspan="2">{section.title}</td></tr>
        {#each section.rows.filter(r => r[1] !== undefined && r[1] !== '') as [label, value] (label)}
          <tr>
            <td class="pt-1 pl-3 wrap-anywhere w-56 align-top">{label}</td>
            <td class="pt-1 pl-3 wrap-anywhere">{value}</td>
          </tr>
        {/each}
        <tr><td class="pb-3" colspan="2"></td></tr>
      {/each}
    </tbody>
  </table>
</div>
