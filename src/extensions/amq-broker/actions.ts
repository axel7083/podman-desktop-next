/** AMQ Broker queue actions (artemis CLI / Jolokia), run as tasks (P15). */
import { confirm } from '#lib/confirm.svelte.ts';
import { runTask } from '#lib/world.svelte.ts';

import { AMQ_EXT, type Broker, type Queue } from './data.ts';

const CLI = '--user admin --password ******** --url tcp://localhost:61616';

export function sendTestMessage(connId: string, q: Queue): void {
  runTask({
    name: `Send test message to ${q.name}`,
    ext: AMQ_EXT,
    steps: [
      {
        label: `artemis producer --destination ${q.routingType === 'ANYCAST' ? 'queue' : 'topic'}://${q.address} --message-count 1 ${CLI}`,
        ms: 900,
        log: ['Connection brokerURL = tcp://localhost:61616', 'Producer ActiveMQQueue[' + q.address + '], thread=0 Produced: 1 messages'],
      },
    ],
    action: { label: 'Browse messages', href: `/c/${connId}/queues?queue=${encodeURIComponent(q.name)}` },
    onDone: () => {
      const id = 31100 + q.messagesAdded % 900;
      q.messagesAdded += 1;
      if (q.consumerCount > 0) {
        q.messagesAcknowledged += 1;
        return;
      }
      q.messageCount += 1;
      q.messages.unshift({
        messageID: id,
        address: q.address,
        durable: q.durable,
        timestamp: new Date().toISOString(),
        priority: 4,
        properties: { JMSXDeliveryCount: 0, __AMQ_CID: 'artemis-cli-producer' },
        body: 'Test message sent from Podman Desktop',
      });
    },
  });
}

export function purgeQueue(q: Queue): void {
  confirm({
    title: 'Purge queue?',
    message: `Are you sure you want to purge queue ${q.name}? ${q.messageCount} message(s) will be deleted.`,
    buttonLabel: 'Purge',
    variant: 'danger',
  })
    .then(ok => {
      if (!ok) return;
      runTask({
        name: `Purge queue ${q.name}`,
        ext: AMQ_EXT,
        steps: [{ label: `artemis queue purge --name ${q.name} ${CLI}`, ms: 800, log: [`Removed ${q.messageCount} messages from ${q.name}`] }],
        onDone: () => {
          q.messageCount = 0;
          q.messages = [];
        },
      });
    })
    .catch(console.error);
}

/** `retryMessages()` on the DLQ: send every message back to its `_AMQ_ORIG_ADDRESS`. */
export function retryAll(data: Broker, dlq: Queue): void {
  const count = dlq.messageCount;
  runTask({
    name: `Retry ${count} message(s) from ${dlq.name}`,
    ext: AMQ_EXT,
    steps: [
      { label: `exec ${dlq.name}/retryMessages()`, ms: 900, log: dlq.messages.map(m => `message ${m.messageID} → ${String(m.properties._AMQ_ORIG_ADDRESS)}`) },
      { label: 'Waiting for consumers', ms: 900, log: [`${count} message(s) acknowledged by inventory-service`] },
    ],
    onDone: () => {
      for (const m of dlq.messages) {
        const target = data.queues.find(q => q.name === m.properties._AMQ_ORIG_QUEUE);
        if (target) {
          target.messagesAdded += 1;
          target.messagesAcknowledged += 1;
        }
      }
      dlq.messageCount = 0;
      dlq.messages = [];
    },
  });
}
