<script lang="ts">
/** Tools page: use ui-svelte NavPage / Table / EmptyScreen like core pages. */
import { EmptyScreen, NavPage } from '@podman-desktop/ui-svelte';
</script>

<NavPage title="Example tool" searchEnabled={false}>
  {#snippet content()}
    <EmptyScreen title="Example tool" message="A standalone workspace contributed to the Tools group." />
  {/snippet}
</NavPage>
