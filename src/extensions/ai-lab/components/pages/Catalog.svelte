<script lang="ts">
/**
 * Unified model catalog (R54): AI Lab ai.json + Hugging Face RedHatAI +
 * Red Hat validated ModelCars + the OpenShift AI catalog of rhoai-dev.
 * Fit badges are computed against the local GPU (RTX 4090, 24 GB).
 */
import { faBookOpen, faBoxArchive, faCloudArrowUp, faDownload, faMessage, faRocket, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Checkbox, Dropdown, FilteredEmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionSpec, ActionsCellData, StatusCellData } from '#lib/table/types.ts';
import { humanSize } from '#lib/world.svelte.ts';

import DeployDialog from '../../../modelcar/components/DeployDialog.svelte';
import PackageDialog from '../../../modelcar/components/PackageDialog.svelte';
import { CATALOG, SOURCES } from '../../data.ts';
import { ai, type CatalogModel, deleteModel, downloadModel, fitsGpu, GPU, toolHref } from '../../shared.ts';
import SubTabs from '../ui/SubTabs.svelte';
import ModelNameCell from '../ui/ModelNameCell.svelte';

type Tone = 'default' | 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'success' | 'warning' | 'error';

let source = $state<string>('all');
let searchTerm = $state('');
let fitsOnly = $state(false);
let task = $state('all');
let packaging = $state<CatalogModel | undefined>();
let deploying = $state<CatalogModel | undefined>();

const st = $derived(ai());
const modelcarOn = $derived(registry.isEnabled('redhat.modelcar'));
const rhoaiOn = $derived(registry.isEnabled('redhat.openshift-ai'));

const tasks = [...new Set(CATALOG.map(m => m.task))].sort();
const inSource = $derived(CATALOG.filter(m => source === 'all' || m.source === source));
const filtered = $derived(
  inSource.filter(
    m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) && (!fitsOnly || fitsGpu(m)) && (task === 'all' || m.task === task),
  ),
);
const sourceTabs = $derived(SOURCES.map(s => ({ id: s.id, label: s.label, count: CATALOG.filter(m => s.id === 'all' || m.source === s.id).length })));

function chips(m: CatalogModel): { label: string; tone?: Tone; title?: string }[] {
  const out: { label: string; tone?: Tone; title?: string }[] = [];
  if (m.quantization) out.push({ label: m.quantization, tone: 'secondary', title: 'Quantization scheme' });
  if (m.validated) out.push({ label: 'Validated', tone: 'primary', title: 'Red Hat AI validated model' });
  if (m.blackwellOnly) out.push({ label: 'Needs Blackwell', tone: 'warning', title: 'NVFP4 runs on Blackwell GPUs only; the RTX 4090 (Ada) is not supported' });
  else if (m.estVramGB !== undefined) {
    out.push(
      fitsGpu(m)
        ? { label: `Fits ${GPU.vramGB} GB`, tone: 'success', title: `Estimated ${m.estVramGB} GB of VRAM` }
        : { label: `Needs ${Math.round(m.estVramGB)} GB`, tone: 'error', title: `Estimated ${m.estVramGB} GB of VRAM, local GPU has ${GPU.vramGB} GB` },
    );
  }
  return out;
}

const SHORT_SOURCE: Record<CatalogModel['source'], string> = { 'ai-lab': 'AI Lab', redhatai: 'Hugging Face', validated: 'Red Hat validated', rhoai: 'rhoai-dev' };

function sourceLabel(m: CatalogModel): string {
  return SHORT_SOURCE[m.source];
}

function serve(m: CatalogModel, backend: string): void {
  navigate(toolHref('create-service', { model: m.id, backend }));
}

function actions(m: CatalogModel): ActionsCellData {
  const downloaded = st.downloaded.includes(m.id);
  const downloading = m.id in st.downloading;
  const buttons: ActionSpec[] = [];
  const menu: ActionSpec[] = [];
  if (m.source === 'ai-lab') {
    if (!downloaded) buttons.push({ title: 'Download Model', icon: faDownload, inProgress: downloading, onClick: (): void => downloadModel(m.id) });
    else {
      buttons.push({ title: 'Create Model service', icon: faRocket, onClick: (): void => serve(m, m.backend === 'openvino' ? 'openvino' : 'llama-cpp') });
      buttons.push({ title: 'Create Playground', icon: faMessage, onClick: (): void => navigate(toolHref('playgrounds', { new: m.id })) });
      menu.push({ title: 'Delete Model', icon: faTrash, onClick: (): void => withConfirmation(() => deleteModel(m.id), `delete model ${m.name}`, 'Delete model?') });
    }
  } else {
    buttons.push({ title: 'Serve with Red Hat AI Inference', icon: faRocket, enabled: fitsGpu(m), onClick: (): void => serve(m, 'vllm') });
    if (modelcarOn && m.source === 'redhatai') menu.push({ title: 'Package as ModelCar', icon: faBoxArchive, onClick: (): void => { packaging = m; } });
    if (rhoaiOn && m.modelcar) menu.push({ title: 'Deploy to OpenShift AI', icon: faCloudArrowUp, onClick: (): void => { deploying = m; } });
  }
  return { buttons, menu };
}

const columns = $derived([
  new TableColumn<CatalogModel, StatusCellData>('Status', {
    width: '60px',
    align: 'center',
    renderer: StatusCell,
    renderMapping: (m): StatusCellData => ({ status: st.downloaded.includes(m.id) ? 'USED' : m.id in st.downloading ? 'STARTING' : 'UNUSED', icon: faBookOpen }),
  }),
  new TableColumn<CatalogModel, { title: string; sub?: string; chips: { label: string; tone?: Tone; title?: string }[] }>('Name', {
    width: '4fr',
    renderer: ModelNameCell,
    renderMapping: (m) => ({ title: m.name, sub: [m.task, m.provider, m.maturity, m.downloads ? `${m.downloads.toLocaleString('en-US')} downloads` : ''].filter(Boolean).join(' · '), chips: chips(m) }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<CatalogModel, string>('Source', { renderer: TableSimpleColumn, renderMapping: sourceLabel }),
  new TableColumn<CatalogModel, string>('Backend', { renderer: TableSimpleColumn, renderMapping: (m): string => (m.backend === 'vllm' ? 'vLLM' : m.backend) }),
  new TableColumn<CatalogModel, string>('Size', { renderer: TableSimpleColumn, renderMapping: (m): string => (m.size ? humanSize(m.size) : '-'), comparator: (a, b): number => (a.size ?? 0) - (b.size ?? 0) }),
  new TableColumn<CatalogModel, string>('License', { renderer: TableSimpleColumn, renderMapping: (m): string => m.license }),
  new TableColumn<CatalogModel, ActionsCellData>('Actions', { align: 'right', width: '130px', overflow: true, renderer: ActionsCell, renderMapping: actions }),
]);
const row = new TableRow<CatalogModel>({});

function selectSource(id: string): void {
  source = id;
}

function toggleFits(checked: boolean): void {
  fitsOnly = checked;
}

function resetFilter(): void {
  searchTerm = '';
  fitsOnly = false;
  task = 'all';
}

function closeDialogs(): void {
  packaging = undefined;
  deploying = undefined;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Models">
  {#snippet additionalActions()}
    <div class="flex items-center gap-3">
      <Dropdown ariaLabel="Task" bind:value={task} options={[{ value: 'all', label: 'All tasks' }, ...tasks.map(t => ({ value: t, label: t }))]} />
      <Checkbox checked={fitsOnly} onclick={toggleFits} title="Fits my GPU ({GPU.vramGB} GB)">Fits my GPU ({GPU.vramGB} GB)</Checkbox>
    </div>
  {/snippet}
  {#snippet tabs()}
    <SubTabs tabs={sourceTabs} current={source} onselect={selectSource} label="Catalog sources" />
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if filtered.length}
        {#key columns}
          <Table kind="ai-models" data={filtered} {columns} {row} defaultSortColumn="Name" key={(m: CatalogModel): string => m.id} label={(m: CatalogModel): string => m.name} />
        {/key}
      {:else}
        <FilteredEmptyScreen icon={faBookOpen} kind="models" {searchTerm} onResetFilter={resetFilter} />
      {/if}
    </div>
  {/snippet}
</NavPage>

{#if packaging}
  <PackageDialog model={packaging} onclose={closeDialogs} />
{/if}
{#if deploying}
  <DeployDialog name={deploying.name.split('/').pop()?.replace(/:.*$/, '') ?? 'model'} storageUri={deploying.modelcar ?? ''} onclose={closeDialogs} />
{/if}
