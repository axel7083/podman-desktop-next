<script lang="ts">
/**
 * Kubernetes connection › Helm releases (P2 nav section, P4 actions):
 * `helm list -A` table; `?release=<ns>/<name>` opens the release details.
 */
import { faMagnifyingGlass, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, FilteredEmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import type { ConnectionView } from '#lib/ext/types.ts';
import KubeIcon from '#lib/images/KubeIcon.svelte';
import { navigate, appUrl } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';

import { type HelmRelease, releasesOf, type ReleaseStatus } from '../data.ts';
import { uninstall } from '../actions.ts';
import ReleaseDetails from './ReleaseDetails.svelte';
import ReleaseStatusCell from './ReleaseStatusCell.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
let selectedItemsNumber = $state(0);

const releases = $derived(releasesOf(conn.id));
const filtered = $derived(releases.filter(r => `${r.name} ${r.namespace} ${r.chart}`.toLowerCase().includes(searchTerm.toLowerCase())));
const selectedKey = $derived(appUrl().searchParams.get('release'));
const selected = $derived(selectedKey ? releases.find(r => r.key === selectedKey) : undefined);

function iconStatus(s: ReleaseStatus): string {
  if (s === 'deployed') return 'RUNNING';
  if (s.startsWith('pending') || s === 'uninstalling') return 'STARTING';
  if (s === 'failed') return 'DEGRADED';
  return '';
}

const columns = [
  new TableColumn<HelmRelease, StatusCellData>('Status', {
    align: 'center',
    width: '70px',
    renderer: StatusCell,
    renderMapping: (r): StatusCellData => ({ status: iconStatus(r.status), icon: KubeIcon }),
  }),
  new TableColumn<HelmRelease, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (r): NameCellData => ({ title: r.name, sub: [r.namespace], href: `/c/${conn.id}/helm-releases?release=${encodeURIComponent(r.key)}` }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<HelmRelease, string>('Revision', { width: '80px', renderer: TableSimpleColumn, renderMapping: (r): string => String(r.revision) }),
  new TableColumn<HelmRelease, ReleaseStatus>('Helm status', {
    width: '1fr',
    renderer: ReleaseStatusCell,
    renderMapping: (r): ReleaseStatus => r.status,
    comparator: (a, b): number => a.status.localeCompare(b.status),
  }),
  new TableColumn<HelmRelease, string>('Chart', { width: '1.5fr', renderer: TableSimpleColumn, renderMapping: (r): string => r.chart }),
  new TableColumn<HelmRelease, string>('App version', { width: '1fr', renderer: TableSimpleColumn, renderMapping: (r): string => r.app_version }),
  new TableColumn<HelmRelease, string>('Updated', { width: '1.5fr', renderer: TableSimpleColumn, renderMapping: (r): string => r.updated.replace(/\.\d \+0000 UTC$/, ' UTC') }),
  new TableColumn<HelmRelease, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (r): ActionsCellData => ({
      buttons: [{ title: 'Uninstall release', icon: faTrash, onClick: (): void => uninstall(conn, r) }],
      menu: [],
    }),
  }),
];

const row = new TableRow<HelmRelease>({ selectable: (): boolean => true });

function key(r: HelmRelease): string {
  return r.key;
}

function label(r: HelmRelease): string {
  return r.name;
}

function resetFilter(): void {
  searchTerm = '';
}

function browse(): void {
  navigate('/tools/helm-charts');
}
</script>

{#if selected}
  <ReleaseDetails {conn} release={selected} />
{:else}
  <NavPage bind:searchTerm={searchTerm} title="Helm releases">
    {#snippet additionalActions()}
      <Button icon={faMagnifyingGlass} onclick={browse} aria-label="Browse charts">Browse charts</Button>
    {/snippet}
    {#snippet bottomAdditionalActions()}
      {#if selectedItemsNumber > 0}<span>On {selectedItemsNumber} selected items.</span>{/if}
    {/snippet}
    {#snippet content()}
      <div class="flex min-w-full grow">
        {#if conn.status !== 'started'}
          <ConnectionStoppedScreen {conn} kind="helm releases" />
        {:else if filtered.length === 0}
          {#if releases.length}
            <FilteredEmptyScreen icon={KubeIcon} kind="helm releases" {searchTerm} onResetFilter={resetFilter} />
          {:else}
            <EmptyScreen icon={KubeIcon} title="No Helm releases" message="No releases installed in {conn.name}. Browse Artifact Hub to install a chart.">
              <Button icon={faMagnifyingGlass} onclick={browse}>Browse charts</Button>
            </EmptyScreen>
          {/if}
        {:else}
          <Table kind="helm-releases" bind:selectedItemsNumber={selectedItemsNumber} data={filtered} {columns} {row} defaultSortColumn="Name" {key} {label} />
        {/if}
      </div>
    {/snippet}
  </NavPage>
{/if}
