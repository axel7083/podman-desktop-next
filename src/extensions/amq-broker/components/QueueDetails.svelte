<script lang="ts">
/** Queue details: counters, attributes and the browsed messages (headers + body). */
import { faBroom, faPaperPlane, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import Card from '../../_appdev/Card.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { purgeQueue, retryAll, sendTestMessage } from '../actions.ts';
import type { Broker, Queue } from '../data.ts';

interface Props {
  conn: ConnectionView;
  broker: Broker;
  queue: Queue;
}

let { conn, broker, queue }: Props = $props();

let expanded = $state<number | undefined>(0);
const isDlq = $derived(queue.name === 'DLQ');

function close(): void {
  navigate(`/c/${conn.id}/queues`);
}

function send(): void {
  sendTestMessage(conn.id, queue);
}

function purge(): void {
  purgeQueue(queue);
}

function retry(): void {
  retryAll(broker, queue);
}

function toggle(id: number): void {
  expanded = expanded === id ? undefined : id;
}

function time(iso: string): string {
  return new Date(iso).toLocaleString('en-GB');
}

function pretty(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
</script>

<DetailsPage
  title={queue.name}
  subtitle="{queue.routingType} · address {queue.address} · {queue.durable ? 'durable' : 'non-durable'} · {conn.name}"
  breadcrumbLeftPart="Queues"
  breadcrumbRightPart={queue.name}
  onclose={close}
  onbreadcrumbClick={close}>
  {#snippet iconSnippet()}<AppIcon icon="icons/redhat.amq-broker.svg" size="28px" />{/snippet}
  {#snippet actionsSnippet()}
    {#if isDlq}
      <Button icon={faRotateRight} onclick={retry} disabled={queue.messageCount === 0}>Retry all</Button>
    {/if}
    <Button type="secondary" icon={faPaperPlane} onclick={send}>Send test message</Button>
    <Button type="secondary" icon={faBroom} onclick={purge} disabled={queue.messageCount === 0}>Purge</Button>
  {/snippet}
  {#snippet contentSnippet()}
    <div class="h-full overflow-auto px-5 py-4 space-y-3">
      <div class="grid grid-cols-4 gap-3">
        <Card><div class="text-2xl font-semibold tabular-nums {isDlq && queue.messageCount > 0 ? 'text-[var(--pd-state-warning)]' : 'text-[var(--pd-content-card-header-text)]'}">{queue.messageCount}</div><div class="text-sm">Messages</div></Card>
        <Card><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{queue.consumerCount}</div><div class="text-sm">Consumers</div></Card>
        <Card><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{queue.deliveringCount}</div><div class="text-sm">Delivering</div></Card>
        <Card><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{queue.messagesAdded.toLocaleString('en-US')}</div><div class="text-sm">Added ({queue.messagesAcknowledged.toLocaleString('en-US')} acked)</div></Card>
      </div>
      <Card title="Messages" subtitle="browse() returns the head of the queue without consuming it">
        {#if queue.messages.length === 0}
          <p>No messages in {queue.name}.</p>
        {:else}
          <div class="rounded-md overflow-hidden bg-[var(--pd-content-card-inset-surface)]" role="table" aria-label="Messages">
            <div class="grid grid-cols-[110px_180px_1.2fr_120px_2fr] gap-2 px-3 py-2 text-xs uppercase text-[var(--pd-table-header-text)] font-semibold" role="row">
              <span>Message ID</span><span>Timestamp</span><span>Original address</span><span>Delivery count</span><span>Body</span>
            </div>
            {#each queue.messages as m (m.messageID)}
              <button
                class="w-full grid grid-cols-[110px_180px_1.2fr_120px_2fr] gap-2 px-3 py-2 text-left text-sm border-t border-[var(--pd-content-divider)] text-[var(--pd-table-body-text)] hover:bg-[var(--pd-content-card-hover-bg)]"
                role="row"
                aria-expanded={expanded === m.messageID}
                onclick={toggle.bind(undefined, m.messageID)}>
                <span class="tabular-nums">{m.messageID}</span>
                <span class="tabular-nums">{time(m.timestamp)}</span>
                <span class="truncate">{m.properties._AMQ_ORIG_ADDRESS ?? m.address}</span>
                <span class="tabular-nums">{m.properties.JMSXDeliveryCount ?? 0}</span>
                <span class="truncate font-mono">{m.body}</span>
              </button>
              {#if expanded === m.messageID}
                <div class="grid grid-cols-2 gap-3 px-3 py-3 border-t border-[var(--pd-content-divider)]">
                  <div>
                    <p class="text-sm mb-1">Properties</p>
                    <KeyValue labelWidth="w-52" rows={[['durable', String(m.durable)], ['priority', m.priority], ...Object.entries(m.properties)]} />
                  </div>
                  <div>
                    <p class="text-sm mb-1">Body</p>
                    <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-bg)] overflow-auto">{pretty(m.body)}</pre>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      </Card>
      <Card title="Attributes">
        <div class="flex items-center gap-2 mb-2"><Pill label={queue.routingType} tone={queue.routingType === 'ANYCAST' ? 'info' : 'neutral'} />{#if queue.paused}<Pill label="Paused" tone="warning" />{/if}</div>
        <KeyValue
          rows={[
            ['Address', queue.address],
            ['Durable', queue.durable ? 'true' : 'false'],
            ['Scheduled count', queue.scheduledCount],
            ['Dead-letter address', isDlq ? undefined : 'DLQ'],
            ['Expiry address', queue.name === 'ExpiryQueue' ? undefined : 'ExpiryQueue'],
            ['Max delivery attempts', 10],
          ]} />
      </Card>
    </div>
  {/snippet}
</DetailsPage>
