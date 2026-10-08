<script lang="ts">
/** Connection › Cluster tab (P14): OCM cluster record, upgrade, links. */
import { faArrowUpRightFromSquare, faCircleArrowUp } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import SummaryTable from '#lib/details/SummaryTable.svelte';
import { toast } from '#lib/world.svelte.ts';

import { CLUSTERS, contextName, locationLabel, productLabel } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const c = $derived(CLUSTERS.find(x => x.name === ctx.conn.id));

function upgrade(): void {
  toast({ type: 'info', title: `Opening https://console.redhat.com/openshift/details/s/${c?.id}#settings`, body: 'Cluster upgrades are scheduled in OpenShift Cluster Manager.' });
}

function openOcm(): void {
  toast({ type: 'info', title: `Opening https://console.redhat.com/openshift/details/s/${c?.id}` });
}
</script>

{#if c}
  <SummaryTable
    sections={[
      {
        title: 'Cluster',
        rows: [
          ['Name', c.name],
          ['Display name', c.display_name],
          ['Cluster ID', c.id],
          ['State', c.state],
          ['Product', productLabel(c)],
          ['Location', locationLabel(c)],
          ['Multi-AZ', c.multi_az ? 'Yes' : 'No'],
          ['Compute nodes', String(c.nodes.compute)],
          ['Created', c.creation_timestamp],
        ],
      },
      {
        title: 'Access',
        rows: [
          ['API URL', `${c.api.url} (${c.api.listening ?? 'external'})`],
          ['Console', c.console?.url],
          ['kubeconfig context', ctx.conn.status === 'started' ? contextName(c) : 'Not connected'],
          ['Signed in with', 'Red Hat SSO · jdoe@acme-bank.com (scope api.ocm)'],
        ],
      },
      { title: 'Version', rows: [['OpenShift', c.openshift_version], ['Available upgrade', c.available_upgrade ?? 'Up to date']] },
    ]}>
    {#snippet before()}
      <div class="flex gap-2 mb-3">
        {#if c.available_upgrade}<Button icon={faCircleArrowUp} onclick={upgrade}>Upgrade to {c.available_upgrade}…</Button>{/if}
        <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={openOcm}>Open in console.redhat.com</Button>
      </div>
    {/snippet}
  </SummaryTable>
{/if}
