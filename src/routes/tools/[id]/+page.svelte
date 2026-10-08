<script lang="ts">
import { EmptyScreen } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import Contribution from '#lib/components/Contribution.svelte';
import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';

const tool = $derived(registry.tools.find(t => t.id === page.params.id));
</script>

{#if tool}
  <Contribution ext={tool.ext} kind="tool page" api="P3" class="h-full">
    {#key tool.id}
      <LazyComponent component={tool.component} />
    {/key}
  </Contribution>
{:else}
  <EmptyScreen title="Tool not available" message="The extension providing '{page.params.id}' is disabled or not installed." />
{/if}
