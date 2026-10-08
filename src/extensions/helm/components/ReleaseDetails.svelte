<script lang="ts">
/** Release details: summary + `helm history` with rollback (P4 release actions). */
import { faRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import ListItemButtonIcon from '#lib/components/ListItemButtonIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import type { ActionsCellData } from '#lib/table/types.ts';

import { rollback, uninstall } from '../actions.ts';
import { type HelmRelease, type HelmRevision, type ReleaseStatus, revisionsOf, STATUS_CLASS } from '../data.ts';
import ReleaseStatusCell from './ReleaseStatusCell.svelte';

interface Props {
  conn: ConnectionView;
  release: HelmRelease;
}

let { conn, release }: Props = $props();

type Row = HelmRevision & { key: string; selected?: boolean };

const history: Row[] = $derived(
  revisionsOf(conn.id)
    .filter(r => r.name === release.name && r.namespace === release.namespace)
    .toSorted((a, b) => b.revision - a.revision)
    .map(r => ({ ...r, key: String(r.revision) })),
);
const busy = $derived(release.status.startsWith('pending') || release.status === 'uninstalling');
/** Last good revision before the current one (what `helm rollback <r>` without a number picks). */
const previous = $derived(history.find(r => r.revision < release.revision && r.status !== 'failed'));

function back(): void {
  navigate(`/c/${conn.id}/helm-releases`);
}

function rollbackTo(to: HelmRevision): void {
  rollback(conn, release, to);
}

function rollbackPrevious(): void {
  if (previous) rollback(conn, release, previous);
}

function remove(): void {
  uninstall(conn, release);
}

const columns = $derived([
  new TableColumn<Row, string>('Revision', { width: '80px', renderer: TableSimpleColumn, renderMapping: (r): string => String(r.revision) }),
  new TableColumn<Row, string>('Updated', { width: '1.5fr', renderer: TableSimpleColumn, renderMapping: (r): string => r.updated.replace(/\.\d \+0000 UTC$/, ' UTC') }),
  new TableColumn<Row, ReleaseStatus>('Status', { width: '1fr', renderer: ReleaseStatusCell, renderMapping: (r): ReleaseStatus => r.status }),
  new TableColumn<Row, string>('Chart', { width: '1.2fr', renderer: TableSimpleColumn, renderMapping: (r): string => r.chart }),
  new TableColumn<Row, string>('App version', { width: '0.8fr', renderer: TableSimpleColumn, renderMapping: (r): string => r.app_version }),
  new TableColumn<Row, string>('Description', { width: '3fr', renderer: TableSimpleColumn, renderMapping: (r): string => r.description }),
  new TableColumn<Row, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (r): ActionsCellData => ({
      buttons: [
        {
          title: `Rollback to revision ${r.revision}`,
          icon: faRotateLeft,
          hidden: r.revision === release.revision || r.status === 'failed',
          enabled: !busy,
          onClick: (): void => rollbackTo(r),
        },
      ],
      menu: [],
    }),
  }),
]);

const row = new TableRow<Row>({ selectable: (): boolean => false });

function key(r: Row): string {
  return r.key;
}

function label(r: Row): string {
  return `Revision ${r.revision}`;
}
</script>

<DetailsPage
  title={release.name}
  subtitle="{release.namespace} · {release.chart} · revision {release.revision}"
  breadcrumbLeftPart="Helm releases"
  breadcrumbRightPart={release.name}
  onclose={back}
  onbreadcrumbClick={back}>
  {#snippet iconSnippet()}
    <AppIcon icon="icons/podman-desktop.helm.png" size="32px" />
  {/snippet}
  {#snippet actionsSnippet()}
    {#if previous}
      <ListItemButtonIcon title="Rollback to revision {previous.revision}" icon={faRotateLeft} detailed onClick={rollbackPrevious} enabled={!busy} />
    {/if}
    <ListItemButtonIcon title="Uninstall release" icon={faTrash} detailed onClick={remove} enabled={!busy} />
  {/snippet}
  {#snippet contentSnippet()}
    <div class="h-full overflow-auto px-5 py-4 space-y-4">
      {#if release.status === 'failed' && previous}
        <div class="flex items-center gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] border-l-4 border-[var(--pd-status-terminated)]" role="alert">
          <span class="grow">Revision {release.revision} failed: {release.description}</span>
          <Button icon={faRotateLeft} onclick={rollbackPrevious} disabled={busy}>Rollback to revision {previous.revision}</Button>
        </div>
      {/if}
      <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 text-[var(--pd-content-card-text)]">
        <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">Release</h2>
        <table class="w-full" aria-label="Release summary">
          <tbody>
            <tr><td class="py-1 w-48 text-[var(--pd-table-body-text)]">Status</td><td class="py-1 font-medium {STATUS_CLASS[release.status]}">{release.status}</td></tr>
            <tr><td class="py-1 text-[var(--pd-table-body-text)]">Namespace</td><td class="py-1">{release.namespace}</td></tr>
            <tr><td class="py-1 text-[var(--pd-table-body-text)]">Revision</td><td class="py-1">{release.revision}</td></tr>
            <tr><td class="py-1 text-[var(--pd-table-body-text)]">Chart</td><td class="py-1">{release.chart}</td></tr>
            <tr><td class="py-1 text-[var(--pd-table-body-text)]">App version</td><td class="py-1">{release.app_version}</td></tr>
            <tr><td class="py-1 text-[var(--pd-table-body-text)]">Updated</td><td class="py-1">{release.updated}</td></tr>
            <tr><td class="py-1 text-[var(--pd-table-body-text)]">Storage</td><td class="py-1 font-mono text-xs">Secret {release.namespace}/sh.helm.release.v1.{release.name}.v{release.revision}</td></tr>
            <tr><td class="py-1 text-[var(--pd-table-body-text)]">Cluster</td><td class="py-1">{conn.name}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4">
        <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">History</h2>
        <div class="flex min-w-full">
          {#key columns}
            <Table kind="helm-history" data={history} {columns} {row} {key} {label} />
          {/key}
        </div>
      </div>
    </div>
  {/snippet}
</DetailsPage>
