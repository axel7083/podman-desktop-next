<script lang="ts">
import { EmptyScreen } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import { registry } from '#lib/ext/registry.svelte.ts';
import FactoryForm from '#lib/pages/FactoryForm.svelte';

const factory = $derived(registry.factories.find(f => f.id === page.params.factory));
</script>

{#if factory}
  {#key factory.id}
    <FactoryForm {factory} />
  {/key}
{:else}
  <EmptyScreen title="Unknown factory" message="'{page.params.factory}' is not contributed by any enabled extension." />
{/if}
