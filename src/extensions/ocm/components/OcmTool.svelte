<script lang="ts">
/**
 * OpenShift clusters (OCM `clusters_mgmt/v1/clusters`): every cluster of the
 * organization with state, product, location and version; ready clusters can
 * be connected (oc login --web) and opened as Kubernetes connections.
 */
import { faArrowUpRightFromSquare, faCopy, faPlug } from '@fortawesome/free-solid-svg-icons';
import { NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import KubeIcon from '#lib/images/KubeIcon.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { toast } from '#lib/world.svelte.ts';

import { connect } from '../connect.ts';
import ConnectionCell from './ConnectionCell.svelte';
import { CLUSTERS, locationLabel, type OcmCluster, productLabel } from '../data.ts';

let searchTerm = $state('');

interface Row extends OcmCluster {
  connection: { label: string; busy: boolean };
  selected?: boolean;
}

const rows: Row[] = $derived(
  CLUSTERS.filter(c => c.name.includes(searchTerm.toLowerCase()) || (c.display_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())).map(c => {
    const conn = registry.getConnection(c.name);
    return { ...c, connection: { label: connectionLabel(conn?.status), busy: conn?.status === 'starting' } };
  }),
);

/** The Connection column describes the kubeconfig connection, never the cluster. */
function connectionLabel(status: string | undefined): string {
  if (status === 'started') return 'Connected';
  if (status === 'starting') return 'Connecting…';
  if (status === 'error') return 'Connection failed';
  return 'Not connected';
}

/**
 * Cluster state → PD StatusIcon variant: in-progress states (installing, resuming)
 * spin, hibernating is the grey outline, error is degraded, Ready is solid green.
 * The icon reflects the cluster only; connection progress lives in the Connection column.
 */
function status(c: Row): string {
  if (c.state === 'installing' || c.state === 'resuming') return 'UPDATING';
  if (c.state === 'error') return 'DEGRADED';
  if (c.state !== 'ready') return 'EXITED';
  return 'RUNNING';
}

const STATE_LABEL: Record<string, string> = { ready: 'Ready', installing: 'Installing', hibernating: 'Hibernating', error: 'Error', resuming: 'Resuming' };

const columns = [
  new TableColumn<Row, StatusCellData>('Status', { align: 'center', width: '70px', renderer: StatusCell, renderMapping: (c): StatusCellData => ({ status: status(c), icon: KubeIcon, label: STATE_LABEL[c.state] ?? c.state }) }),
  new TableColumn<Row, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (c): NameCellData => ({ title: c.name, sub: [(STATE_LABEL[c.state] ?? c.state).toUpperCase(), ...(c.display_name ? [c.display_name] : [])], href: registry.getConnection(c.name) ? `/c/${c.name}` : undefined }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<Row, string>('Product', { width: '1.6fr', renderer: TableSimpleColumn, renderMapping: (c): string => productLabel(c) }),
  new TableColumn<Row, string>('Location', { width: '1.3fr', renderer: TableSimpleColumn, renderMapping: (c): string => locationLabel(c) }),
  new TableColumn<Row, string>('Version', { renderer: TableSimpleColumn, renderMapping: (c): string => (c.available_upgrade ? `${c.openshift_version} → ${c.available_upgrade}` : c.openshift_version) }),
  new TableColumn<Row, string>('Nodes', { width: '70px', renderer: TableSimpleColumn, renderMapping: (c): string => String(c.nodes.compute) }),
  new TableColumn<Row, Row['connection']>('Connection', { renderer: ConnectionCell, renderMapping: (c): Row['connection'] => c.connection }),
  new TableColumn<Row, ActionsCellData>('Actions', {
    align: 'right',
    width: '110px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (c): ActionsCellData => {
      const conn = registry.getConnection(c.name);
      return {
        buttons: [
          {
            title: c.state === 'ready' ? `Connect to ${c.name}` : `${STATE_LABEL[c.state]}: resume in console.redhat.com`,
            icon: faPlug,
            enabled: c.state === 'ready' && conn?.status === 'stopped',
            inProgress: conn?.status === 'starting',
            onClick: (): void => connect(c.name),
          },
          { title: 'Open console', icon: faArrowUpRightFromSquare, enabled: !!c.console, onClick: (): void => toast({ type: 'info', title: `Opening ${c.console?.url}` }) },
        ],
        menu: [
          { title: 'Copy API URL', icon: faCopy, onClick: (): void => toast({ type: 'success', title: 'Copied to clipboard', body: c.api.url }) },
          {
            title: 'Open in console.redhat.com',
            icon: faArrowUpRightFromSquare,
            onClick: (): void => toast({ type: 'info', title: `Opening https://console.redhat.com/openshift/details/s/${c.id}` }),
          },
        ],
      };
    },
  }),
];

const row = new TableRow<Row>({});

function key(c: Row): string {
  return c.id;
}
function label(c: Row): string {
  return c.name;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="OpenShift clusters">
  {#snippet bottomAdditionalActions()}
    <span class="text-sm text-[var(--pd-content-text)]">{CLUSTERS.length} clusters in organization 18833012 · from OpenShift Cluster Manager</span>
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      <Table kind="ocm-cluster" data={rows} {columns} {row} defaultSortColumn="Name" {key} {label} />
    </div>
  {/snippet}
</NavPage>
