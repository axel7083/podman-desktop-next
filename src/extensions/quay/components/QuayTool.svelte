<script lang="ts">
/** Quay tool (P17): repositories of quay.io/acme with tags of the selected one, and robot accounts. */
import { faKey, faLock } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { humanAge, timeAgo, humanSize, shortImage, toast, world } from '#lib/world.svelte.ts';

import { isPushed, REPOSITORIES, ROBOTS } from '../data.ts';

type Repo = (typeof REPOSITORIES)[number] & { selected?: boolean };
type Robot = (typeof ROBOTS)[number] & { selected?: boolean };

let tab = $state<'repos' | 'robots'>('repos');
let searchTerm = $state('');

const repos = $derived(REPOSITORIES.filter(r => r.name.includes(searchTerm.toLowerCase())));
/** Local images whose manifest is on quay.io. */
const pushedLocal = $derived(world.images.filter(i => i.name.startsWith('quay.io/acme/') && isPushed(i)));

function setTab(t: typeof tab): void {
  tab = t;
}

function useRobot(r: Robot): void {
  toast({ type: 'success', title: `${r.name} stored as quay.io credential`, body: 'Settings › Registries now authenticates to quay.io with this robot token.' });
}

const repoColumns = [
  new TableColumn<Repo, StatusCellData>('Status', { align: 'center', width: '70px', renderer: StatusCell, renderMapping: (r): StatusCellData => ({ status: r.state === 'NORMAL' ? 'USED' : 'CREATED', icon: faLock }) }),
  new TableColumn<Repo, NameCellData>('Repository', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (r): NameCellData => ({ title: `quay.io/${r.namespace}/${r.name}`, sub: [r.is_public ? 'Public' : 'Private', r.state === 'MIRROR' ? 'Mirror' : ''] }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<Repo, string>('Tags', { width: '80px', renderer: TableSimpleColumn, renderMapping: (r): string => String(r.tags) }),
  new TableColumn<Repo, string>('Pulls (30d)', { width: '100px', renderer: TableSimpleColumn, renderMapping: (r): string => String(r.popularity * 37) }),
  new TableColumn<Repo, string>('Last modified', { renderer: TableSimpleColumn, renderMapping: (r): string => timeAgo(new Date(r.last_modified).getTime()) }),
];

const robotColumns = [
  new TableColumn<Robot, StatusCellData>('Status', { align: 'center', width: '70px', renderer: StatusCell, renderMapping: (): StatusCellData => ({ status: 'USED', icon: faKey }) }),
  new TableColumn<Robot, NameCellData>('Robot account', { width: '2fr', renderer: NameCell, renderMapping: (r): NameCellData => ({ title: r.name, sub: [r.description] }) }),
  new TableColumn<Robot, string>('Repositories', { renderer: TableSimpleColumn, renderMapping: (r): string => `${r.repositories} (write)` }),
  new TableColumn<Robot, string>('Last accessed', { renderer: TableSimpleColumn, renderMapping: (r): string => timeAgo(new Date(r.last_accessed).getTime()) }),
  new TableColumn<Robot, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    renderMapping: (r): ActionsCellData => ({ buttons: [{ title: 'Use as registry credential', icon: faKey, onClick: (): void => useRobot(r) }], menu: [] }),
  }),
];

const repoRow = new TableRow<Repo>({});
const robotRow = new TableRow<Robot>({});
function repoKey(r: Repo): string {
  return r.name;
}
function robotKey(r: Robot): string {
  return r.name;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Quay">
  {#snippet additionalActions()}
    <span class="text-sm text-[var(--pd-content-text)]">quay.io · organization acme · signed in as acme+ci_push</span>
  {/snippet}
  {#snippet tabs()}
    <Button type="tab" onclick={setTab.bind(undefined, 'repos')} selected={tab === 'repos'}>Repositories</Button>
    <Button type="tab" onclick={setTab.bind(undefined, 'robots')} selected={tab === 'robots'}>Robot accounts</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}
    {#if tab === 'repos'}
      <span class="text-sm text-[var(--pd-content-text)]">Pushed from this machine: {pushedLocal.map(i => `${shortImage(i.name)}:${i.tag} (${humanSize(i.size)})`).join(', ') || 'none'}</span>
    {/if}
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if tab === 'repos'}
        <Table kind="quay-repo" data={repos} columns={repoColumns} row={repoRow} defaultSortColumn="Repository" key={repoKey} label={repoKey} />
      {:else}
        <Table kind="quay-robot" data={ROBOTS} columns={robotColumns} row={robotRow} defaultSortColumn="Robot account" key={robotKey} label={robotKey} />
      {/if}
    </div>
  {/snippet}
</NavPage>
