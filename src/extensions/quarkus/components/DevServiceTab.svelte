<script lang="ts">
/** Container tab "Quarkus" on Dev Services containers: service, injected config, sharing, handoffs. */
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { type Container, toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import CopyField from '../../_appdev/CopyField.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import { DEVSERVICE, PROCESS_UUID, projectByUuid } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const container = $derived(ctx.resource as Container);
const service = $derived(container.labels[DEVSERVICE]);
const project = $derived(projectByUuid(container.labels[PROCESS_UUID] ?? ''));
const spec = $derived(project?.devServices.find(s => s.service === service));
const config = $derived(Object.entries(spec?.config ?? {}).map(([k, v]) => `${k}=${v}`).join('\n'));
const shared = $derived(Object.keys(container.labels).find(k => k.startsWith('quarkus-dev-service-')));

function openDevUi(): void {
  toast({ type: 'info', title: `Opening ${project?.devMode.devUi ?? 'http://localhost:8080/q/dev-ui'}/dev-services` });
}

function openKafka(): void {
  navigate('/c/acme-kafka/topics');
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-3">
  <Card title="Quarkus Dev Service · {service}" subtitle={project ? `Started by ${project.name} (${project.path}) in dev mode` : 'Started by a Quarkus application'}>
    {#snippet actions()}
      <Button icon={faArrowUpRightFromSquare} onclick={openDevUi}>Open Dev UI</Button>
    {/snippet}
    <KeyValue
      rows={[
        ['Service', service],
        ['Launch mode', container.labels['io.quarkus.devservice.launch-mode']],
        ['Shared', shared ? `${shared}=${container.labels[shared]} — reused by other Quarkus apps in dev mode` : 'no (private to this application)'],
        ['Process UUID', container.labels[PROCESS_UUID]],
        ['Testcontainers session', container.labels['org.testcontainers.sessionId']],
        ['Lifecycle', 'Stopped by Quarkus when dev mode exits (Ryuk reaps leftovers)'],
      ]} />
  </Card>
  {#if config}
    <Card title="Configuration injected into {project?.name ?? 'the application'}" subtitle="Quarkus sets these properties automatically; no application.properties change needed.">
      <CopyField value={config} label="properties" toastTitle="Copied dev service configuration" />
    </Card>
  {/if}
  {#if service === 'kafka' && registry.isEnabled('redhat.streams-kafka')}
    <Card>
      <div class="flex items-center gap-3">
        <AppIcon icon="icons/redhat.streams-kafka.svg" size="24px" />
        <span class="grow">Browse topics and consumer groups of your local Kafka with Streams for Apache Kafka.</span>
        <Button type="secondary" onclick={openKafka}>Open in Kafka console</Button>
      </div>
    </Card>
  {/if}
</div>
