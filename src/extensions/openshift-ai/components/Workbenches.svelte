<script lang="ts">
/** Workbenches (kubeflow.org Notebook) with Start / Stop (kubeflow-resource-stopped annotation). */
import { faArrowUpRightFromSquare, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import KubeIcon from '#lib/images/KubeIcon.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { type KubeObject, runTask, toast, world } from '#lib/world.svelte.ts';

import { APPS_DOMAIN } from '../shared.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const notebooks = $derived((world.kube[conn.id] ?? []).filter(o => o.kind === 'Notebook'));

function patch(o: KubeObject, status: Record<string, unknown>): void {
  world.kube[conn.id] = (world.kube[conn.id] ?? []).map(x => (x.metadata.uid === o.metadata.uid ? { ...x, status } : x));
}

function setState(o: KubeObject, run: boolean): void {
  patch(o, { ...o.status, state: 'updating' });
  runTask({
    name: `${run ? 'Starting' : 'Stopping'} workbench ${o.metadata.name}`,
    ext: 'redhat.openshift-ai',
    steps: run
      ? [
          { label: 'Removing annotation kubeflow-resource-stopped', ms: 400 },
          { label: 'Pod Pending → Running', ms: 2400 },
        ]
      : [{ label: 'Adding annotation kubeflow-resource-stopped', ms: 800 }],
    onDone: () => {
      patch(o, { state: run ? 'running' : 'stopped', url: run ? `https://${o.metadata.name}-${o.metadata.namespace}.${APPS_DOMAIN}` : undefined });
    },
  });
}

const columns = $derived([
  new TableColumn<KubeObject, StatusCellData>('Status', { width: '70px', align: 'center', renderer: StatusCell, renderMapping: (o): StatusCellData => ({ status: String(o.status?.state ?? 'stopped').toUpperCase(), icon: KubeIcon }) }),
  new TableColumn<KubeObject, NameCellData>('Name', { width: '2fr', renderer: NameCell, renderMapping: (o): NameCellData => ({ title: o.metadata.name, sub: [o.metadata.namespace ?? ''], href: `/c/${conn.id}/kube/Notebook~${o.metadata.namespace}~${o.metadata.name}/summary` }) }),
  new TableColumn<KubeObject, string>('Image', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (o): string => String(o.spec?.image ?? '') }),
  new TableColumn<KubeObject, string>('Size', { renderer: TableSimpleColumn, renderMapping: (o): string => `${String(o.spec?.size)}${o.spec?.gpu ? ` · ${String(o.spec.gpu)} GPU` : ''}` }),
  new TableColumn<KubeObject, ActionsCellData>('Actions', {
    align: 'right',
    width: '110px',
    renderer: ActionsCell,
    renderMapping: (o): ActionsCellData => {
      const running = o.status?.state === 'running';
      return {
        buttons: [
          { title: 'Start workbench', icon: faPlay, hidden: running, inProgress: o.status?.state === 'updating', onClick: (): void => setState(o, true) },
          { title: 'Stop workbench', icon: faStop, hidden: !running, onClick: (): void => setState(o, false) },
          { title: 'Open workbench', icon: faArrowUpRightFromSquare, enabled: running, onClick: (): void => toast({ type: 'info', title: `Opening ${String(o.status?.url)}` }) },
        ],
        menu: [],
      };
    },
  }),
]);
const row = new TableRow<KubeObject>({});
</script>

<NavPage title="Workbenches" searchEnabled={false}>
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if notebooks.length}
        {#key columns}
          <Table kind="rhoai-workbenches" data={notebooks} {columns} {row} defaultSortColumn="Name" key={(o: KubeObject): string => o.metadata.uid} label={(o: KubeObject): string => o.metadata.name} />
        {/key}
      {:else}
        <EmptyScreen icon={KubeIcon} title="No workbenches" message="Create a workbench from the OpenShift AI dashboard." />
      {/if}
    </div>
  {/snippet}
</NavPage>
