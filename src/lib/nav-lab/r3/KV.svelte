<script lang="ts" module>
export interface KvRow {
  k: string;
  v: string | number | undefined;
  /** Reference: opens / focuses the referenced tab (rule F25). */
  onclick?: () => void;
  href?: string;
  mono?: boolean;
}
</script>

<script lang="ts">
/** Key / value rows (rule E18): 160px muted label column, primary value, 13px. */
interface Props {
  rows: KvRow[];
}

let { rows }: Props = $props();
</script>

<table data-testid="kv" class="w-full text-[13px] leading-5">
  <tbody>
    {#each rows as r (r.k)}
      <tr>
        <td class="w-40 pr-4 py-1 align-top whitespace-nowrap text-[var(--pd-table-body-text)]">{r.k}</td>
        <td class="py-1 wrap-anywhere text-[var(--pd-content-header)]" class:font-mono={r.mono} class:text-[12px]={r.mono}>
          {#if r.onclick}
            <button type="button" data-testid="kv-ref" class="text-left hover:text-[var(--pd-link)] hover:underline" onclick={r.onclick}>{r.v}</button>
          {:else if r.href}
            <a class="hover:text-[var(--pd-link)] hover:underline" href={r.href} target="_blank" rel="noreferrer">{r.v}</a>
          {:else}
            {r.v ?? '—'}
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>
