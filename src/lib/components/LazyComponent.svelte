<script lang="ts">
/** Renders a ComponentRef (eager component or lazy `() => import()`), passing props through. */
import { Spinner } from '@podman-desktop/ui-svelte';
import type { Component } from 'svelte';

import type { ComponentRef } from '#lib/ext/types.ts';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
}

let { component, props = {} }: Props = $props();

// a lazy loader is a zero-arg function that is not a Svelte component; components take (anchor, props)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isLazy = $derived(typeof component === 'function' && component.length === 0);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loader = $derived(isLazy ? (component as () => Promise<{ default: Component<any> }>)() : undefined);
</script>

{#if loader}
  {#await loader}
    <div class="p-5"><Spinner size="1.5em" /></div>
  {:then mod}
    {@const Loaded = mod.default}
    <Loaded {...props} />
  {/await}
{:else}
  {@const Eager = component as Component<Record<string, unknown>>}
  <Eager {...props} />
{/if}
