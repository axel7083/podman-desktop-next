<script lang="ts">
/** Topic details: Messages / Partitions / Configuration / Schema (Apicurio, TopicIdStrategy). */
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, Tab } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { href, navigate, appUrl } from '#lib/nav.ts';
import { runTask } from '#lib/world.svelte.ts';

import { findTopicSchema, latest } from '../../apicurio-registry/data.ts';
import Card from '../../_appdev/Card.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { cluster, KAFKA_EXT, type Topic } from '../data.ts';

interface Props {
  conn: ConnectionView;
  topic: Topic;
}

let { conn, topic }: Props = $props();

const tab = $derived(appUrl().searchParams.get('tab') ?? 'messages');
const schema = $derived(registry.isEnabled('redhat.apicurio-registry') ? findTopicSchema(topic.name) : undefined);
const partitions = $derived(
  Array.from({ length: Math.min(topic.partitionCount, 6) }, (_, p) => {
    const end = topic.partitionEnds?.[p] ?? Math.round(topic.messages / topic.partitionCount) + p * 7;
    return { partition: p, leader: 1, replicas: [1], isr: [1], start: 0, end };
  }),
);
const consumers = $derived(cluster(conn.id).groups.filter(g => g.offsets.some(o => o.topic === topic.name)));
let expanded = $state<number | undefined>(0);

function url(t: string): string {
  return href(`/c/${conn.id}/topics?topic=${encodeURIComponent(topic.name)}&tab=${t}`);
}

function close(): void {
  navigate(`/c/${conn.id}/topics`);
}

function produce(): void {
  runTask({
    name: `Produce test message to ${topic.name}`,
    ext: KAFKA_EXT,
    steps: [
      { label: `Serializing with Apicurio AvroSerde (globalId ${schema ? latest(schema.artifact).globalId : 21})`, ms: 500 },
      { label: 'Sending record', ms: 400, log: [`Record sent to ${topic.name}-1@${topic.partitionEnds?.[1] ?? topic.messages}`] },
    ],
    onDone: () => {
      const offset = topic.partitionEnds?.[1] ?? topic.messages;
      if (topic.partitionEnds) topic.partitionEnds[1] += 1;
      topic.messages += 1;
      topic.records?.unshift({
        partition: 1,
        offset,
        timestamp: new Date().toISOString(),
        key: 'ord-20261008-0194',
        value: JSON.stringify({ orderId: 'ord-20261008-0194', customerId: 'c-3391', status: 'CREATED', totalCents: 12999, currency: 'EUR', couponCode: null }),
      });
    },
  });
}

function toggle(i: number): void {
  expanded = expanded === i ? undefined : i;
}

function openSchema(): void {
  if (schema) navigate(`/c/${schema.connId}/artifacts?artifact=${encodeURIComponent(schema.artifact.artifactId)}`);
}

function openGroup(id: string): void {
  navigate(`/c/${conn.id}/consumer-groups?group=${encodeURIComponent(id)}`);
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB');
}
</script>

<DetailsPage title={topic.name} subtitle="{topic.partitionCount} partition{topic.partitionCount === 1 ? '' : 's'} · {topic.messages.toLocaleString('en-US')} messages · {conn.name}" breadcrumbLeftPart="Topics" breadcrumbRightPart={topic.name} onclose={close} onbreadcrumbClick={close}>
  {#snippet iconSnippet()}<AppIcon icon="icons/redhat.streams-kafka.svg" size="28px" />{/snippet}
  {#snippet actionsSnippet()}
    <Button icon={faPaperPlane} onclick={produce}>Produce message</Button>
  {/snippet}
  {#snippet tabsSnippet()}
    <Tab title="Messages" selected={tab === 'messages'} url={url('messages')} />
    <Tab title="Partitions" selected={tab === 'partitions'} url={url('partitions')} />
    <Tab title="Consumer groups" selected={tab === 'groups'} url={url('groups')} />
    <Tab title="Configuration" selected={tab === 'config'} url={url('config')} />
    {#if schema}
      <div class="mx-2 my-1.5 border-l border-[var(--pd-content-divider)]" role="separator"></div>
      <Tab title="Schema" selected={tab === 'schema'} url={url('schema')} />
    {/if}
  {/snippet}
  {#snippet contentSnippet()}
    <div class="h-full overflow-auto px-5 py-4 space-y-3">
      {#if tab === 'messages'}
        {#if schema}
          <div class="text-sm text-[var(--pd-content-text)] flex items-center gap-2">
            <AppIcon icon="icons/redhat.apicurio-registry.svg" size="14px" />
            Values decoded with <button class="text-[var(--pd-link)] hover:underline" onclick={openSchema}>{schema.artifact.groupId}/{schema.artifact.artifactId}</button> v{latest(schema.artifact).version} (Apicurio Registry)
          </div>
        {/if}
        {#if !(topic.records ?? []).length}
          <Card><p>No messages yet. Use "Produce message" or start a producer.</p></Card>
        {:else}
          <div class="rounded-lg bg-[var(--pd-content-card-bg)] overflow-hidden" role="table" aria-label="Messages">
            <div class="grid grid-cols-[80px_90px_110px_220px_1fr] gap-2 px-4 py-2 text-xs uppercase text-[var(--pd-table-header-text)] font-semibold" role="row">
              <span>Partition</span><span>Offset</span><span>Timestamp</span><span>Key</span><span>Value</span>
            </div>
            {#each topic.records ?? [] as r, i (r.offset + '-' + r.partition)}
              <button class="w-full grid grid-cols-[80px_90px_110px_220px_1fr] gap-2 px-4 py-2 text-left text-sm border-t border-[var(--pd-content-divider)] text-[var(--pd-table-body-text)] hover:bg-[var(--pd-content-card-hover-bg)]" role="row" onclick={toggle.bind(undefined, i)} aria-expanded={expanded === i}>
                <span class="tabular-nums">{r.partition}</span>
                <span class="tabular-nums">{r.offset}</span>
                <span class="tabular-nums">{time(r.timestamp)}</span>
                <span class="truncate font-mono text-[var(--pd-table-body-text-highlight)]">{r.key}</span>
                <span class="truncate font-mono">{r.value}</span>
              </button>
              {#if expanded === i}
                <pre class="px-4 py-3 text-xs font-mono bg-[var(--pd-content-card-inset-surface)] text-[var(--pd-content-card-text)] overflow-auto">{JSON.stringify(JSON.parse(r.value), null, 2)}{r.headers ? `\n\nheaders: ${JSON.stringify(r.headers)}` : ''}</pre>
              {/if}
            {/each}
          </div>
        {/if}
      {:else if tab === 'partitions'}
        <div class="rounded-lg bg-[var(--pd-content-card-bg)] overflow-hidden" role="table" aria-label="Partitions">
          <div class="grid grid-cols-6 gap-2 px-4 py-2 text-xs uppercase text-[var(--pd-table-header-text)] font-semibold" role="row">
            <span>Partition</span><span>Leader</span><span>Replicas</span><span>ISR</span><span>Start offset</span><span>End offset</span>
          </div>
          {#each partitions as p (p.partition)}
            <div class="grid grid-cols-6 gap-2 px-4 py-2 text-sm border-t border-[var(--pd-content-divider)] text-[var(--pd-table-body-text)] tabular-nums" role="row">
              <span>{p.partition}</span><span>{p.leader}</span><span>{p.replicas.join(', ')}</span><span>{p.isr.join(', ')}</span><span>{p.start}</span><span>{p.end.toLocaleString('en-US')}</span>
            </div>
          {/each}
        </div>
      {:else if tab === 'groups'}
        <Card title="Consumer groups reading {topic.name}">
          {#each consumers as g (g.groupId)}
            {@const lag = g.offsets.filter(o => o.topic === topic.name).reduce((s, o) => s + o.logEndOffset - o.currentOffset, 0)}
            <div class="flex items-center gap-3 py-1.5">
              <button class="text-[var(--pd-link)] hover:underline" onclick={openGroup.bind(undefined, g.groupId)}>{g.groupId}</button>
              <Pill label={g.state} tone={g.state === 'Stable' ? 'success' : 'neutral'} />
              <span class="ml-auto tabular-nums">Lag {lag}</span>
            </div>
          {:else}
            <p>No consumer group reads this topic.</p>
          {/each}
        </Card>
      {:else if tab === 'config'}
        <Card title="Configuration">
          <KeyValue rows={[['topicId', topic.topicId], ['partitionCount', topic.partitionCount], ['replicationFactor', topic.replicationFactor], ...Object.entries(topic.configs)]} />
        </Card>
      {:else if tab === 'schema' && schema}
        <Card title="{schema.artifact.name} · {schema.artifact.artifactType}" subtitle="{schema.artifact.groupId}/{schema.artifact.artifactId} · version {latest(schema.artifact).version} (globalId {latest(schema.artifact).globalId}) · compatibility {schema.compatibility}">
          {#snippet actions()}<Button type="secondary" onclick={openSchema}>Open in registry</Button>{/snippet}
          <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-surface)] overflow-auto">{schema.artifact.content}</pre>
        </Card>
      {/if}
    </div>
  {/snippet}
</DetailsPage>
