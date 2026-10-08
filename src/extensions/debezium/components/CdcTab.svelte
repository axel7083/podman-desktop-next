<script lang="ts">
/**
 * Container tab "Change data capture" (PostgreSQL containers): prerequisites
 * (wal_level=logical, task), connector wizard (tables, topic prefix,
 * snapshot.mode, converter, Kafka connection) and the resulting connector.
 */
import { faArrowUpRightFromSquare, faBolt, faCheck, faCircleExclamation, faPlay } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox, Dropdown, Input } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { type Container, restartContainer, runTask, world } from '#lib/world.svelte.ts';

import { registerArtifact } from '../../apicurio-registry/data.ts';
import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { isService, serviceContainer } from '../../_appdev/services.ts';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { databases } from '../../postgresql/data.ts';
import { addTopic } from '../../streams-kafka/data.ts';
import { connectorConfig, DBZ_EXT, ensureStore, store, walLevel } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const container = $derived(ctx.resource as Container);
const wal = $derived(walLevel(container));
const kafkas = $derived(registry.activeConnections.filter(c => isService(c, 'kafka')));
const hasRegistry = $derived(registry.activeConnections.some(c => isService(c, 'apicurio')));
const dbName = $derived(container.env?.find(e => e.startsWith('POSTGRES_DB='))?.split('=')[1] ?? 'postgres');
const tables = $derived(
  databases(container.labels['io.podman-desktop.service'] ?? '')
    .find(d => d.name === dbName)
    ?.tables.filter(t => !t.name.startsWith('flyway')) ?? [{ schema: 'public', name: 'orders', rows: 9731, sizeMB: 4.2 }],
);
const existing = $derived(store().connectors.filter(c => c.database === container.name));

let walTask = $state<string>();
let createTask = $state<string>();
let name = $state('acme-orders-cdc');
let prefix = $state('orders.cdc');
let snapshot = $state('initial');
let converter = $state('avro');
let kafka = $state('acme-kafka');
let selected = $state<string[]>(['public.orders']);
/** Once a connector exists the wizard folds into its summary; "Add another connector" reopens it. */
let addAnother = $state(false);
const showForm = $derived(existing.length === 0 || addAnother);

const config = $derived(connectorConfig({ name, host: container.name, db: dbName, prefix, tables: selected, snapshot, avro: converter === 'avro' && hasRegistry }));
const walRunning = $derived(!!walTask && world.tasks.find(t => t.id === walTask)?.status === 'in-progress');
const creating = $derived(!!createTask && world.tasks.find(t => t.id === createTask)?.status === 'in-progress');

function enableLogical(): void {
  walTask = runTask({
    name: `Enable logical replication on ${container.name}`,
    ext: DBZ_EXT,
    steps: [
      { label: 'ALTER SYSTEM SET wal_level = logical', ms: 700, log: [`psql -U app -d ${dbName} -c "ALTER SYSTEM SET wal_level = logical; ALTER SYSTEM SET max_replication_slots = 10;"`, 'ALTER SYSTEM'] },
      { label: `Restarting ${container.name}`, ms: 1500, log: ['LOG:  received fast shutdown request', 'LOG:  database system is ready to accept connections'] },
      { label: 'Verifying', ms: 500, log: ['SHOW wal_level; → logical', 'CREATE ROLE debezium WITH REPLICATION LOGIN', 'CREATE PUBLICATION dbz_publication FOR ALL TABLES'] },
    ],
    onDone: () => {
      ensureStore().wal[container.id] = 'logical';
    },
  });
  restartContainer(container.id);
}

function toggleTable(t: string, checked: boolean): void {
  selected = checked ? [...selected, t] : selected.filter(x => x !== t);
}

function create(): void {
  const topics = selected.map(t => `${prefix}.${t}`);
  const snapshotRows = tables.filter(t => selected.includes(`${t.schema}.${t.name}`)).reduce((s, t) => s + t.rows, 0);
  const connectorName = name;
  const kafkaConn = kafka;
  const cfg = { ...config };
  const avro = converter === 'avro' && hasRegistry;
  const needConnect = !world.containers.some(c => c.name === 'acme-connect');
  createTask = runTask({
    name: `Create connector ${connectorName}`,
    ext: DBZ_EXT,
    steps: [
      ...(needConnect ? [{ label: 'Starting Kafka Connect (quay.io/debezium/connect:3.7)', ms: 1500 }] : [{ label: 'Kafka Connect acme-connect is running', ms: 300 }]),
      { label: `POST /connectors {"name":"${connectorName}"}`, ms: 700, log: ['HTTP/1.1 201 Created', `Connector ${connectorName} config: plugin.name=pgoutput slot.name=${cfg['slot.name']}`] },
      { label: 'Waiting for connector to be RUNNING', ms: 900, log: [`GET /connectors/${connectorName}/status → {"connector":{"state":"RUNNING","worker_id":"10.89.0.7:8083"},"tasks":[{"id":0,"state":"RUNNING"}]}`] },
      { label: `Initial snapshot (${snapshotRows.toLocaleString('en-US')} rows)`, ms: 1600, log: [`Snapshot step 7 - Snapshotting data`, `Exported ${snapshotRows} records for ${selected.length} tables`, 'Snapshot completed', 'Starting streaming from LSN{0/1A3F2B8}'] },
    ],
    action: { label: 'Open topic', href: `/c/${kafkaConn}/topics?topic=${encodeURIComponent(topics[0] ?? '')}` },
    onDone: () => {
      addAnother = false;
      if (needConnect) world.containers.push(serviceContainer(kafkaConn, 'kafka', { name: 'acme-connect', image: 'quay.io/debezium/connect:3.7', ports: [8083], upM: 0, group: true }));
      const s = ensureStore();
      s.connectors = [
        ...s.connectors.filter(c => c.name !== connectorName),
        { name: connectorName, kafka: kafkaConn, database: container.name, state: 'RUNNING', tasks: [{ id: 0, state: 'RUNNING' }], config: cfg, topics, snapshotRows },
      ];
      for (const [i, t] of topics.entries()) {
        addTopic(kafkaConn, {
          name: t,
          topicId: `Yb4n7QpWTa2cE1kF0sJ${i}dg`,
          partitionCount: 1,
          replicationFactor: 1,
          configs: { 'cleanup.policy': 'delete' },
          messages: tables.find(x => `${prefix}.${x.schema}.${x.name}` === t)?.rows ?? 0,
          createdBy: `Debezium ${connectorName}`,
          records: [
            {
              partition: 0,
              offset: 9730,
              timestamp: new Date().toISOString(),
              key: '{"id":10482}',
              value: JSON.stringify({ before: null, after: { id: 10482, customer_id: 'c-3391', status: 'CREATED', total_cents: 12999, created_at: '2026-10-08T09:15:44.120Z' }, source: { connector: 'postgresql', name: prefix, db: dbName, schema: 'public', table: 'orders', lsn: 27525816, snapshot: 'false' }, op: 'c', ts_ms: 1791450944231 }),
            },
          ],
        });
        if (avro) {
          registerArtifact('acme-registry', {
            groupId: 'default',
            artifactId: `${t}-value`,
            artifactType: 'AVRO',
            name: 'Debezium orders envelope',
            owner: 'debezium-connect',
            createdOn: new Date().toISOString(),
            modifiedOn: new Date().toISOString(),
            labels: { topic: t },
            versions: [{ version: '1', globalId: 31, contentId: 28, state: 'ENABLED', createdOn: new Date().toISOString(), note: 'Auto-registered by AvroConverter' }],
            content: '{\n  "type": "record",\n  "name": "Envelope",\n  "namespace": "orders.cdc.public.orders",\n  "fields": [\n    { "name": "before", "type": ["null", "Value"] },\n    { "name": "after", "type": ["null", "Value"] },\n    { "name": "source", "type": "io.debezium.connector.postgresql.Source" },\n    { "name": "op", "type": "string" },\n    { "name": "ts_ms", "type": ["null", "long"] }\n  ]\n}',
          });
        }
      }
    },
  });
}

function onSnapshot(v: string): void {
  snapshot = v;
}

function onConverter(v: string): void {
  converter = v;
}

function onKafka(v: string): void {
  kafka = v;
}

function onName(e: Event): void {
  name = (e.currentTarget as HTMLInputElement).value;
}

function onPrefix(e: Event): void {
  prefix = (e.currentTarget as HTMLInputElement).value;
}

function showWizard(): void {
  addAnother = true;
}

function openTopic(conn: string, topic: string): void {
  navigate(`/c/${conn}/topics?topic=${encodeURIComponent(topic)}`);
}

function openConnectors(conn: string): void {
  navigate(`/c/${conn}/connectors`);
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-3" aria-label="Change data capture">
  <div class="flex items-center gap-2 text-sm text-[var(--pd-content-text)]">
    <AppIcon icon="icons/redhat.debezium.png" size="16px" />
    <span>Stream row-level changes of <strong>{container.name}</strong> ({dbName}) to Kafka with Debezium 3.7 (PostgresConnector, pgoutput).</span>
  </div>

  {#each existing as c (c.name)}
    <Card>
      <div class="flex items-center gap-3" role="region" aria-label="Connector {c.name}">
        <AppIcon icon="icons/redhat.debezium.png" size="28px" />
        <div class="grow min-w-0">
          <div class="flex items-center gap-2"><span class="font-semibold text-[var(--pd-content-card-header-text)]">Connector {c.name}</span><Pill label={c.state === 'RUNNING' ? 'Running' : c.state === 'FAILED' ? 'Failed' : c.state.charAt(0) + c.state.slice(1).toLowerCase()} tone={c.state === 'RUNNING' ? 'running' : c.state === 'FAILED' ? 'error' : 'warning'} /></div>
          <div class="text-sm">{c.config['table.include.list']} → {c.kafka}{c.snapshotRows ? ` · snapshot of ${c.snapshotRows.toLocaleString('en-US')} rows done, now streaming changes` : ''}</div>
        </div>
        {#each c.topics as t (t)}
          <Button icon={faArrowUpRightFromSquare} onclick={openTopic.bind(undefined, c.kafka, t)} aria-label="Open {t}">Open topic</Button>
        {/each}
        <Button type="secondary" onclick={openConnectors.bind(undefined, c.kafka)}>Open connector</Button>
      </div>
      {#if createTask}<div class="mt-3"><TaskLog taskId={createTask} label="Connector task" collapseWhenDone /></div>{/if}
    </Card>
  {/each}
  {#if !showForm}
    <Button type="link" onclick={showWizard}>Add another connector</Button>
  {:else}

  <Card title="1. Prerequisites">
    <div class="flex items-center gap-3">
      <span class={wal === 'logical' ? 'text-[var(--pd-state-success)]' : 'text-[var(--pd-state-warning)]'}><Icon icon={wal === 'logical' ? faCheck : faCircleExclamation} /></span>
      <div class="grow">
        <div class="font-medium text-[var(--pd-content-card-header-text)]">wal_level = {wal}</div>
        <div class="text-sm">{wal === 'logical' ? 'Logical decoding is enabled; publication dbz_publication and role debezium are ready.' : 'Debezium needs wal_level=logical. Enabling it runs ALTER SYSTEM and restarts the container (a few seconds of downtime).'}</div>
      </div>
      {#if wal !== 'logical'}<Button icon={faBolt} onclick={enableLogical} inProgress={walRunning} disabled={walRunning}>Enable logical replication</Button>{/if}
    </div>
    {#if walTask}<div class="mt-3"><TaskLog taskId={walTask} label="Logical replication task" collapseWhenDone /></div>{/if}
  </Card>

  <Card title="2. Connector" subtitle={wal !== 'logical' ? 'Available once logical replication is enabled.' : undefined}>
    <!-- every control sits in a 38px slot so left and right columns line up -->
    <div class="grid grid-cols-2 gap-x-6 gap-y-4 items-start [&_.dbz-control]:h-[38px] [&_.dbz-control]:flex [&_.dbz-control]:items-center [&_.dbz-control>*]:w-full" class:opacity-50={wal !== 'logical'}>
      <div class="flex flex-col gap-1">
        <label for="dbz-name" class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Connector name</label>
        <div class="dbz-control"><Input id="dbz-name" value={name} oninput={onName} disabled={wal !== 'logical'} /></div>
      </div>
      <div class="flex flex-col gap-1">
        <label for="dbz-kafka" class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Kafka</label>
        <div class="dbz-control"><Dropdown id="dbz-kafka" value={kafka} options={kafkas.map(k => ({ value: k.id, label: `${k.name} (${k.endpoint})` }))} onChange={onKafka} disabled={wal !== 'logical'} /></div>
      </div>
      <div class="flex flex-col gap-1">
        <label for="dbz-prefix" class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Topic prefix</label>
        <div class="dbz-control"><Input id="dbz-prefix" value={prefix} oninput={onPrefix} disabled={wal !== 'logical'} /></div>
        <span class="text-xs opacity-80">Topics are named &lt;prefix&gt;.&lt;schema&gt;.&lt;table&gt;</span>
      </div>
      <div class="flex flex-col gap-1">
        <label for="dbz-snapshot" class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Snapshot mode</label>
        <div class="dbz-control"><Dropdown id="dbz-snapshot" value={snapshot} options={['initial', 'always', 'initial_only', 'no_data', 'when_needed'].map(v => ({ value: v, label: v }))} onChange={onSnapshot} disabled={wal !== 'logical'} /></div>
        <span class="text-xs opacity-80"><code>snapshot.mode</code>: initial copies existing rows, then streams changes</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Tables ({dbName})</span>
        {#each tables as t (t.schema + t.name)}
          {@const id = `${t.schema}.${t.name}`}
          <Checkbox checked={selected.includes(id)} onclick={toggleTable.bind(undefined, id)} disabled={wal !== 'logical'}>{id}<span class="opacity-70">&nbsp;· {t.rows.toLocaleString('en-US')} rows</span></Checkbox>
        {/each}
      </div>
      <div class="flex flex-col gap-1">
        <label for="dbz-conv" class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Value converter</label>
        <div class="dbz-control"><Dropdown id="dbz-conv" value={converter} options={[{ value: 'avro', label: hasRegistry ? 'Avro, schemas in Apicurio Registry (acme-registry)' : 'Avro (requires an Apicurio Registry service)' }, { value: 'json', label: 'JSON (schemas embedded)' }]} onChange={onConverter} disabled={wal !== 'logical'} /></div>
      </div>
    </div>
    <details class="mt-3">
      <summary class="cursor-pointer text-sm text-[var(--pd-link)]">Connector configuration (JSON)</summary>
      <pre class="mt-2 text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-bg)] overflow-auto">{JSON.stringify({ name, config }, null, 2)}</pre>
    </details>
    <div class="flex justify-end mt-3">
      <Button icon={faPlay} onclick={create} disabled={wal !== 'logical' || selected.length === 0 || creating} inProgress={creating}>Create connector</Button>
    </div>
    {#if createTask && existing.length === 0}<div class="mt-3"><TaskLog taskId={createTask} label="Connector task" /></div>{/if}
  </Card>
  {/if}
</div>
