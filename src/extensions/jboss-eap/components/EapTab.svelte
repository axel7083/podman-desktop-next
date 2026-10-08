<script lang="ts">
/** Container › EAP tab (P14): server state, deployments, datasources, management console. */
import { faArrowUpRightFromSquare, faPlug } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import type { Container } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { glow, openConsole, PRODUCT_VERSION, testDatasource } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const container = $derived(ctx.resource as Container);
const running = $derived(container.state === 'RUNNING');
const layers = $derived((container.labels['org.jboss.eap.layers'] ?? 'ee-core-profile-server,jaxrs-server,jpa,ejb-lite,remote-activemq,elytron-oidc-client,infinispan,web-clustering,microprofile-health,postgresql-datasource,postgresql-driver').split(','));
const testTaskId = $derived(glow().dsTestTaskId);

function test(): void {
  testDatasource();
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-3" aria-label="JBoss EAP server">
  <div class="flex items-center gap-2 text-sm text-[var(--pd-content-text)]">
    <span>JBoss EAP {PRODUCT_VERSION} · management API http://localhost:9990/management</span>
    <span class="grow"></span>
    <Button type="link" icon={faArrowUpRightFromSquare} onclick={openConsole}>Open management console</Button>
  </div>
  <div class="grid grid-cols-2 gap-3">
    <Card title="Server">
      <KeyValue
        labelWidth="w-36"
        rows={[
          ['server-state', running ? 'running' : 'stopped'],
          ['product-version', PRODUCT_VERSION],
          ['running-mode', running ? 'NORMAL' : ''],
          ['launch-type', 'STANDALONE'],
          ['Galleon layers', layers.length],
        ]} />
    </Card>
    <Card title="Deployments">
      <div class="flex items-center gap-3">
        <span class="font-mono">inventory-service.war</span>
        <Pill label={running ? 'OK' : 'STOPPED'} tone={running ? 'success' : 'neutral'} />
        <span class="grow"></span>
        <span class="text-sm">context root <a class="text-[var(--pd-link)] hover:underline" href="http://localhost:8080/inventory" target="_blank" rel="noreferrer">/inventory</a></span>
      </div>
    </Card>
  </div>
  <Card title="Datasources">
    {#snippet actions()}
      <Button type="secondary" icon={faPlug} onclick={test} disabled={!running}>Test connection</Button>
    {/snippet}
    <KeyValue
      labelWidth="w-36"
      rows={[
        ['name', 'InventoryDS'],
        ['jndi-name', 'java:jboss/datasources/InventoryDS'],
        ['driver-name', 'postgresql'],
        ['connection-url', 'jdbc:postgresql://postgres:5432/inventory'],
        ['max-pool-size', 20],
        ['active-count', running ? 3 : 0],
      ]} />
    <div class="mt-2"><TaskLog taskId={testTaskId} label="Test connection result" /></div>
  </Card>
  <Card title="Galleon layers">
    <div class="flex flex-wrap gap-1.5">
      {#each layers as l (l)}<Pill label={l} />{/each}
    </div>
  </Card>
</div>
