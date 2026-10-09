<script lang="ts">
/** Model Services (AI Lab InferenceServers.svelte). */
import { faMessage, faPlay, faRocket, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, StatusCellData } from '#lib/table/types.ts';
import { humanAge } from '#lib/world.svelte.ts';

import { INFERENCE_IMAGES } from '../../data.ts';
import { ai, deleteService, type InferenceService, modelLabel, setServiceRunning, toolHref } from '../../shared.ts';
import ModelNameCell from '../ui/ModelNameCell.svelte';

const services = $derived(ai().services);

function status(s: InferenceService): string {
  return s.status === 'running' ? 'RUNNING' : s.status === 'starting' ? 'STARTING' : 'EXITED';
}

const columns = $derived([
  new TableColumn<InferenceService, StatusCellData>('Status', { width: '70px', align: 'center', renderer: StatusCell, renderMapping: (s): StatusCellData => ({ status: status(s), icon: faRocket }) }),
  new TableColumn<InferenceService, { title: string; sub?: string; href?: string; chips: { label: string; tone?: 'primary' | 'secondary' | 'default' }[] }>('Name', {
    width: '2fr',
    renderer: ModelNameCell,
    renderMapping: (s) => ({
      title: s.name,
      sub: s.containerId.slice(0, 12),
      href: toolHref('service', { id: s.id }),
      chips: [{ label: INFERENCE_IMAGES[s.backend]?.label ?? s.backend, tone: s.backend === 'vllm' ? 'primary' : 'default' }, ...(s.gpu ? [{ label: 'GPU', tone: 'secondary' as const }] : [])],
    }),
  }),
  new TableColumn<InferenceService, string>('Model', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (s): string => modelLabel(s.modelId) }),
  new TableColumn<InferenceService, string>('Endpoint', { width: '1.4fr', renderer: TableSimpleColumn, renderMapping: (s): string => `http://localhost:${s.port}/v1` }),
  new TableColumn<InferenceService, string>('Age', { renderer: TableSimpleColumn, renderMapping: (s): string => humanAge(s.created) }),
  new TableColumn<InferenceService, ActionsCellData>('Actions', {
    align: 'right',
    width: '120px',
    overflow: true,
    renderer: ActionsCell,
    renderMapping: (s): ActionsCellData => ({
      buttons: [
        { title: 'Start service', icon: faPlay, hidden: s.status !== 'stopped', onClick: (): void => setServiceRunning(s.id, true) },
        { title: 'Stop service', icon: faStop, hidden: s.status === 'stopped', inProgress: s.status === 'starting', onClick: (): void => setServiceRunning(s.id, false) },
        { title: 'Delete service', icon: faTrash, onClick: (): void => withConfirmation(() => deleteService(s.id), `delete service ${s.name}`, 'Delete service?') },
      ],
      menu: [{ title: 'Open in playground', icon: faMessage, onClick: (): void => navigate(toolHref('playgrounds', { new: s.modelId, provider: `ailab:${s.id}` })) }],
    }),
  }),
]);
const row = new TableRow<InferenceService>({});

function create(): void {
  navigate(toolHref('create-service'));
}
</script>

<NavPage title="Model services" searchEnabled={false}>
  {#snippet additionalActions()}<Button icon={faRocket} onclick={create}>New Model Service</Button>{/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if services.length}
        {#key columns}
          <Table kind="ai-services" data={services} {columns} {row} defaultSortColumn="Name" key={(s: InferenceService): string => s.id} label={(s: InferenceService): string => s.name} />
        {/key}
      {:else}
        <EmptyScreen icon={faRocket} title="No model service running" message="A model service offers a configurable endpoint via an OpenAI-compatible web server." />
      {/if}
    </div>
  {/snippet}
</NavPage>
