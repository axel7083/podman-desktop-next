<script lang="ts">
import { EmptyScreen } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import { registry } from '#lib/ext/registry.svelte.ts';
import ConnectionSummary from '#lib/pages/ConnectionSummary.svelte';

const conn = $derived(registry.getConnection(page.params.conn ?? ''));
</script>

{#if conn}
  {#key conn.id}
    <ConnectionSummary {conn} />
  {/key}
{:else}
  <EmptyScreen title="Connection not found" message="'{page.params.conn}' does not exist in this scenario." />
{/if}
