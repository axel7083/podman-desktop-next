<script lang="ts">
/** Running AI apps (AI Lab Applications.svelte). */
import { faArrowUpRightFromSquare, faServer, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import PodIcon from '#lib/images/PodIcon.svelte';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, StatusCellData } from '#lib/table/types.ts';
import { humanAge, stopPod, toast, world } from '#lib/world.svelte.ts';

import { ai, deleteApp, modelLabel, recipe, type RecipeApp, toolHref } from '../../shared.ts';
import ModelNameCell from '../ui/ModelNameCell.svelte';

const apps = $derived(ai().apps);

function podStatus(a: RecipeApp): string {
  return world.pods.find(p => p.id === a.podId)?.status ?? 'EXITED';
}

const columns = [
  new TableColumn<RecipeApp, StatusCellData>('Status', { width: '70px', align: 'center', renderer: StatusCell, renderMapping: (a): StatusCellData => ({ status: podStatus(a), icon: PodIcon }) }),
  new TableColumn<RecipeApp, { title: string; sub?: string; href?: string; chips: { label: string; tone?: 'success' | 'default' }[] }>('Name', {
    width: '2fr',
    renderer: ModelNameCell,
    renderMapping: (a) => ({
      title: a.name,
      sub: `${recipe(a.recipeId)?.name ?? a.recipeId} · pod ${world.pods.find(p => p.id === a.podId)?.name ?? '-'}`,
      href: `/c/podman-machine-default/pods/${a.podId}/summary`,
      chips: [{ label: a.health, tone: a.health === 'healthy' ? 'success' : 'default' }],
    }),
  }),
  new TableColumn<RecipeApp, string>('Model', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (a): string => modelLabel(a.modelId) }),
  new TableColumn<RecipeApp, string>('Ports', { renderer: TableSimpleColumn, renderMapping: (a): string => `app ${a.appPort} · model ${a.modelPort}` }),
  new TableColumn<RecipeApp, string>('Age', { renderer: TableSimpleColumn, renderMapping: (a): string => humanAge(a.created) }),
  new TableColumn<RecipeApp, ActionsCellData>('Actions', {
    align: 'right',
    width: '120px',
    overflow: true,
    renderer: ActionsCell,
    renderMapping: (a): ActionsCellData => ({
      buttons: [
        { title: 'Open app', icon: faArrowUpRightFromSquare, onClick: (): void => toast({ type: 'info', title: `Opening http://localhost:${a.appPort}` }) },
        { title: 'Stop AI App', icon: faStop, onClick: (): void => stopPod(a.podId), hidden: podStatus(a) !== 'RUNNING' },
        { title: 'Delete AI App', icon: faTrash, onClick: (): void => withConfirmation(() => deleteApp(a.id), `delete application ${a.name}`, 'Delete application?') },
      ],
      menu: [],
    }),
  }),
];
const row = new TableRow<RecipeApp>({});

function goRecipes(): void {
  navigate(toolHref('recipes'));
}
</script>

<NavPage title="AI Apps" searchEnabled={false}>
  {#snippet additionalActions()}<Button onclick={goRecipes}>Start an app</Button>{/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if apps.length}
        <Table kind="ai-apps" data={apps} {columns} {row} defaultSortColumn="Name" key={(a: RecipeApp): string => a.id} label={(a: RecipeApp): string => a.name} />
      {:else}
        <EmptyScreen icon={faServer} title="No application running" message="There is no AI App running. You may run a new AI App via the Recipe Catalog." />
      {/if}
    </div>
  {/snippet}
</NavPage>
