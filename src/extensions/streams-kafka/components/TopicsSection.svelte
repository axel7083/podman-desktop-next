<script lang="ts">
/** Kafka › Topics (P2 section): list, or topic details when `?topic=` is set. */
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { NameCellData } from '#lib/table/types.ts';
import { runTask } from '#lib/world.svelte.ts';

import DataTable from '../../_appdev/DataTable.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { cluster, ensureCluster, KAFKA_EXT, type Topic } from '../data.ts';
import TopicDetails from './TopicDetails.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
let showInternal = $state(false);
const topicName = $derived(page.url.searchParams.get('topic'));
const data = $derived(cluster(conn.id));
const selected = $derived(topicName ? data.topics.find(t => t.name === topicName) : undefined);
const all = $derived(data.topics.filter(t => showInternal || !t.internal));
const rows = $derived(all.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())));

function nf(n: number): string {
  return n.toLocaleString('en-US');
}

function key(t: Topic): string {
  return t.name;
}

function nameOf(t: Topic): NameCellData {
  return {
    title: t.name,
    sub: [t.topicId, ...(t.internal ? ['internal'] : []), ...(t.createdBy ? [`created by ${t.createdBy}`] : [])],
    href: `/c/${conn.id}/topics?topic=${encodeURIComponent(t.name)}`,
  };
}

const columns: DataColumn<Topic>[] = [
  { title: 'Partitions', width: '90px', value: (t): string => String(t.partitionCount) },
  { title: 'Replicas', width: '80px', value: (t): string => String(t.replicationFactor) },
  { title: 'Messages', width: '110px', value: (t): string => nf(t.messages) },
  { title: 'Cleanup policy', width: '140px', value: (t): string => t.configs['cleanup.policy'] ?? 'delete' },
];

function toggleInternal(): void {
  showInternal = !showInternal;
}

function reset(): void {
  searchTerm = '';
}

function create(): void {
  const name = `orders.shipped`;
  runTask({
    name: `Create topic ${name}`,
    ext: KAFKA_EXT,
    steps: [{ label: `kafka-topics.sh --create --topic ${name} --partitions 3 --replication-factor 1`, ms: 900, log: [`Created topic ${name}.`] }],
    onDone: () => {
      const c = ensureCluster(conn.id);
      if (!c.topics.some(t => t.name === name)) {
        c.topics.push({ name, topicId: 'Sh1pP3dT0p1cXq9aZk2LmA', partitionCount: 3, replicationFactor: 1, configs: { 'cleanup.policy': 'delete' }, messages: 0, records: [] });
      }
    },
  });
}
</script>

{#if selected}
  {#key selected.name}
    <TopicDetails {conn} topic={selected} />
  {/key}
{:else}
  <NavPage bind:searchTerm={searchTerm} title="topics">
    {#snippet additionalActions()}
      <Button type="secondary" onclick={toggleInternal}>{showInternal ? 'Hide internal topics' : 'Show internal topics'}</Button>
      <Button icon={faPlusCircle} onclick={create}>Create topic</Button>
    {/snippet}
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="topics" />
      {:else}
        <DataTable
          kind="topics"
          rows={rows}
          total={all.length}
          {searchTerm}
          onResetFilter={reset}
          {key}
          name={nameOf}
          {columns}
          emptyMessage="Create a topic or let your application auto-create one." />
      {/if}
    {/snippet}
  </NavPage>
{/if}
