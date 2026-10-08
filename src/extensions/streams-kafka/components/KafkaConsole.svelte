<script lang="ts">
/**
 * Connection tab "Console": an embedded StreamsHub Console-style overview
 * (cluster, topics, partitions, consumer-group lag) for the service connection.
 */
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { cluster, type ConsumerGroup, lagOf } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const data = $derived(cluster(ctx.conn.id));
const topics = $derived(data.topics.filter(t => !t.internal));
const partitions = $derived(topics.reduce((s, t) => s + t.partitionCount, 0));
const messages = $derived(topics.reduce((s, t) => s + t.messages, 0));
const totalLag = $derived(data.groups.reduce((s, g) => s + lagOf(g), 0));
// fixed throughput profile for the last 15 minutes (msg/s)
const series = [38, 41, 40, 52, 61, 58, 49, 47, 55, 72, 80, 76, 64, 59, 62];
const max = Math.max(...series);

function openConsole(): void {
  toast({ type: 'info', title: 'Opening http://localhost:3000/kafka/q1Sh-9_ISia_zwGINzRvyQ/overview' });
}

function openGroup(g: ConsumerGroup): void {
  navigate(`/c/${ctx.conn.id}/consumer-groups?group=${encodeURIComponent(g.groupId)}`);
}

function openTopics(): void {
  navigate(`/c/${ctx.conn.id}/topics`);
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-3" aria-label="Kafka console">
  <div class="flex items-center gap-2 text-sm text-[var(--pd-content-text)]">
    <span>StreamsHub Console 0.14.1 · cluster <code>{data.clusterId}</code> · Kafka {data.kafkaVersion} (KRaft)</span>
    <span class="grow"></span>
    <Button type="link" icon={faArrowUpRightFromSquare} onclick={openConsole}>Open in browser</Button>
  </div>
  <div class="grid grid-cols-4 gap-3">
    <Card><button class="text-left w-full" onclick={openTopics}><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)]">{topics.length}</div><div class="text-sm">Topics</div></button></Card>
    <Card><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)]">{partitions}</div><div class="text-sm">Partitions</div></Card>
    <Card><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{messages.toLocaleString('en-US')}</div><div class="text-sm">Messages</div></Card>
    <Card><div class="text-2xl font-semibold tabular-nums {totalLag > 0 ? 'text-[var(--pd-state-warning)]' : 'text-[var(--pd-content-card-header-text)]'}">{totalLag}</div><div class="text-sm">Consumer lag</div></Card>
  </div>
  <div class="grid grid-cols-[2fr_1fr] gap-3">
    <Card title="Incoming messages" subtitle="Last 15 minutes, all topics (msg/s)">
      <div class="flex items-end gap-1 h-28" role="img" aria-label="Incoming messages per second, peak {max}">
        {#each series as v, i (i)}
          <div class="grow rounded-t-sm bg-[var(--pd-button-primary-bg)] opacity-80" style="height: {(v / max) * 100}%" title="{v} msg/s"></div>
        {/each}
      </div>
    </Card>
    <Card title="Broker">
      <KeyValue labelWidth="w-28" rows={[['Node', '1 (broker, controller)'], ['Listeners', 'PLAINTEXT://localhost:9092'], ['Controller', 'localhost:9093'], ['Disk used', '212 MB'], ['Under-replicated', '0']]} />
    </Card>
  </div>
  <Card title="Consumer groups">
    {#each data.groups as g (g.groupId)}
      <div class="flex items-center gap-3 py-1.5 border-t first:border-t-0 border-[var(--pd-content-divider)]">
        <button class="text-[var(--pd-link)] hover:underline" onclick={openGroup.bind(undefined, g)}>{g.groupId}</button>
        <Pill label={g.state} tone={g.state === 'Stable' ? 'success' : 'neutral'} />
        <span class="ml-auto tabular-nums {lagOf(g) > 0 ? 'text-[var(--pd-state-warning)]' : ''}">lag {lagOf(g)}</span>
      </div>
    {/each}
  </Card>
</div>
