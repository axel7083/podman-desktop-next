<script lang="ts">
/** Single-line table cell: ellipsis + full value in a tooltip (no wrapping into the next column);
 * right padding keeps a gap before the next column. */
interface Props {
  object: string;
}

let { object }: Props = $props();
</script>

<div class="text-[var(--pd-table-body-text)] max-w-full min-w-0 truncate pr-3" title={object || undefined}>
  {object}
</div>
