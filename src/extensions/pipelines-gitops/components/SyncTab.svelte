<script lang="ts">
/** Application › Sync (P14): source, destination, sync/health and managed resources. */
import SummaryTable from '#lib/details/SummaryTable.svelte';
import type { ResourceContext } from '#lib/ext/types.ts';
import type { KubeObject } from '#lib/world.svelte.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const app = $derived(ctx.resource as KubeObject);
const src = $derived((app.spec?.source ?? {}) as { repoURL?: string; path?: string; targetRevision?: string });
const dst = $derived((app.spec?.destination ?? {}) as { name?: string; namespace?: string });
const sync = $derived((app.status?.sync ?? {}) as { status?: string; revision?: string });
const health = $derived((app.status?.health ?? {}) as { status?: string });
const op = $derived((app.status?.operationState ?? {}) as { phase?: string });
</script>

<SummaryTable
  sections={[
    { title: 'Status', rows: [['Sync', sync.status], ['Health', health.status], ['Last operation', op.phase ?? '—'], ['Revision', sync.revision]] },
    { title: 'Source', rows: [['Repository', src.repoURL], ['Path', src.path], ['Target revision', src.targetRevision]] },
    { title: 'Destination', rows: [['Cluster', `${dst.name} (${ctx.conn.name})`], ['Namespace', dst.namespace], ['Project', String(app.spec?.project ?? 'default')]] },
    {
      title: 'Resources',
      rows: [
        ['Deployment/payments-api', sync.status === 'OutOfSync' ? 'OutOfSync · image quay.io/acme/payments-api:1.4.0 → 1.5.0' : 'Synced'],
        ['Service/payments-api', 'Synced'],
        ['Route/payments-api', 'Synced'],
        ['ConfigMap/payments-api-config', sync.status === 'OutOfSync' ? 'OutOfSync · LOG_LEVEL' : 'Synced'],
      ],
    },
  ]} />
