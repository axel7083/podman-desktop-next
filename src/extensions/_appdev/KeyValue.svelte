<script lang="ts">
/** Two-column details table (like the connection summary "Details" card). */
interface Props {
  rows: [string, string | number | undefined][];
  labelWidth?: string;
}

let { rows, labelWidth = 'w-48' }: Props = $props();
</script>

<table class="w-full text-[var(--pd-content-card-text)]">
  <tbody>
    {#each rows as [k, v] (k)}
      {#if v !== undefined && v !== ''}
        <tr>
          <td class="py-1 pr-3 align-top text-[var(--pd-table-body-text)] {labelWidth}">{k}</td>
          <td class="py-1 wrap-anywhere">{v}</td>
        </tr>
      {/if}
    {/each}
  </tbody>
</table>
