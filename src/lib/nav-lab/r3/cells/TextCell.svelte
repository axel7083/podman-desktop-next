<script lang="ts">
interface Props {
  object: string;
}

let { object }: Props = $props();
</script>

<div class="text-[var(--pd-table-body-text)] max-w-full min-w-0 truncate pr-3" title={object || undefined}>{object}</div>
