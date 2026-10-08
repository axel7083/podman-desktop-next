<script lang="ts">
/** MaaS › Models (GET /maas-api/v1/models). */
import { faCopy, faMessage } from '@fortawesome/free-solid-svg-icons';
import { NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, StatusCellData } from '#lib/table/types.ts';
import { toast } from '#lib/world.svelte.ts';

import ModelNameCell from '../../ai-lab/components/ui/ModelNameCell.svelte';
import { createPlayground, toolHref } from '../../ai-lab/shared.ts';
import { type MaasModel, MODELS } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

function short(m: MaasModel): string {
  return m.id.split('/').pop() ?? m.id;
}

function playground(m: MaasModel): void {
  const id = createPlayground(`${short(m)} (MaaS)`, `conn:${conn.id}`, short(m));
  navigate(toolHref('playground', { id }));
}

const columns = [
  new TableColumn<MaasModel, StatusCellData>('Status', { width: '70px', align: 'center', renderer: StatusCell, renderMapping: (m): StatusCellData => ({ status: m.ready ? 'RUNNING' : 'STARTING', icon: faMessage }) }),
  new TableColumn<MaasModel, { title: string; sub?: string; chips: { label: string; tone?: 'secondary' | 'default' }[] }>('Name', {
    width: '2.5fr',
    renderer: ModelNameCell,
    renderMapping: (m) => ({ title: m.displayName, sub: m.id, chips: m.capabilities.map(c => ({ label: c, tone: 'secondary' as const })) }),
  }),
  new TableColumn<MaasModel, string>('Kind', { renderer: TableSimpleColumn, renderMapping: (m): string => m.kind }),
  new TableColumn<MaasModel, string>('Context window', { renderer: TableSimpleColumn, renderMapping: (m): string => m.contextWindow ?? '–' }),
  new TableColumn<MaasModel, string>('Subscription', { renderer: TableSimpleColumn, renderMapping: (m): string => m.subscription }),
  new TableColumn<MaasModel, ActionsCellData>('Actions', {
    align: 'right',
    width: '100px',
    renderer: ActionsCell,
    renderMapping: (m): ActionsCellData => ({
      buttons: [
        { title: 'Use in AI Lab Playground', icon: faMessage, enabled: m.ready && m.capabilities.includes('chat'), onClick: (): void => playground(m) },
        { title: 'Copy curl', icon: faCopy, onClick: (): void => toast({ type: 'success', title: 'curl command copied', body: `curl ${conn.endpoint}/chat/completions -H "Authorization: Bearer $MAAS_API_KEY" …` }) },
      ],
      menu: [],
    }),
  }),
];
const row = new TableRow<MaasModel>({});
</script>

<NavPage title="Models" searchEnabled={false}>
  {#snippet content()}
    <div class="flex min-w-full grow">
      <Table kind="maas-models" data={MODELS} {columns} {row} defaultSortColumn="Name" key={(m: MaasModel): string => m.id} label={(m: MaasModel): string => m.displayName} />
    </div>
  {/snippet}
</NavPage>
