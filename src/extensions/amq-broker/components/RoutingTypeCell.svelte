<script lang="ts">
/** Table cell: ANYCAST / MULTICAST routing type pill(s). */
import Pill from '../../_appdev/Pill.svelte';
import type { RoutingType } from '../data.ts';

interface Props {
  object: RoutingType[];
}

let { object }: Props = $props();
</script>

<div class="flex gap-1">
  {#each object as rt (rt)}
    <Pill label={rt} tone={rt === 'ANYCAST' ? 'info' : 'neutral'} title={rt === 'ANYCAST' ? 'Point-to-point (JMS queue)' : 'Publish-subscribe (JMS topic)'} />
  {/each}
</div>
