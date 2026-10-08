<script lang="ts">
/**
 * Pods / Images / Volumes / Networks / Secrets of an engine connection,
 * following PD's list pages (NavPage + ui-svelte Table + StatusIcon + actions).
 */
import { faArrowCircleDown, faPlusCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  Button,
  EmptyScreen,
  FilteredEmptyScreen,
  NavPage,
  Table,
  TableColumn,
  TableRow,
  TableSimpleColumn,
} from '@podman-desktop/ui-svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import ImageIcon from '#lib/images/ImageIcon.svelte';
import NetworkIcon from '#lib/images/NetworkIcon.svelte';
import PodIcon from '#lib/images/PodIcon.svelte';
import SecretIcon from '#lib/images/SecretIcon.svelte';
import VolumeIcon from '#lib/images/VolumeIcon.svelte';
import { CORE_RESOURCES } from '#lib/nav.ts';
import { imageActions, podActions, volumeActions } from '#lib/resources/actions.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { humanAge, humanSize, runTask, shortImage, toast, world } from '#lib/world.svelte.ts';

import ConnectionStoppedScreen from './ConnectionStoppedScreen.svelte';

interface Props {
  conn: ConnectionView;
  resource: 'pods' | 'images' | 'volumes' | 'networks' | 'secrets';
}

let { conn, resource }: Props = $props();

interface GenericRow {
  id: string;
  name: string;
  selected?: boolean;
  status: StatusCellData;
  nameCell: NameCellData;
  cols: string[];
  age: number;
  size?: number;
  actions: ActionsCellData;
}

let searchTerm = $state('');
let selectedItemsNumber = $state(0);

const ICONS = { pods: PodIcon, images: ImageIcon, volumes: VolumeIcon, networks: NetworkIcon, secrets: SecretIcon };

const extraTitles: Record<Props['resource'], string[]> = {
  pods: ['Containers'],
  images: [],
  volumes: ['Driver'],
  networks: ['Driver', 'Subnet'],
  secrets: ['Driver'],
};

function noActions(): ActionsCellData {
  return { buttons: [], menu: [] };
}

const rows: GenericRow[] = $derived.by(() => {
  const cid = conn.id;
  const containers = world.containers.filter(c => c.engineId === cid);
  switch (resource) {
    case 'pods':
      return world.pods
        .filter(p => p.engineId === cid)
        .map(p => {
          const members = containers.filter(c => p.containerIds.includes(c.id));
          return {
            id: p.id,
            name: p.name,
            status: { status: p.status, icon: PodIcon },
            nameCell: { title: p.name, sub: [p.id.slice(0, 12)], href: `/c/${cid}/pods/${p.id}/summary` },
            cols: [`${members.length} container${members.length === 1 ? '' : 's'}`],
            age: p.created,
            actions: podActions(p, members),
          };
        });
    case 'images':
      return world.images
        .filter(i => i.engineId === cid)
        .map(i => {
          const ref = `${i.name}:${i.tag}`;
          const used = containers.some(c => c.image === ref || c.image === `${shortImage(i.name)}:${i.tag}`);
          const badges = registry.columns
            .filter(c => c.target === 'image')
            .map(c => ({ label: c.value(i) ?? '', ext: c.ext }))
            .filter(b => b.label);
          return {
            id: i.id,
            name: ref,
            status: { status: used ? 'USED' : 'UNUSED', icon: ImageIcon },
            nameCell: { title: shortImage(i.name), sub: [i.id.slice(0, 12), i.tag], href: `/c/${cid}/images/${i.id}/summary`, badges },
            cols: [],
            age: i.created,
            size: i.size,
            actions: imageActions(i, used),
          };
        });
    case 'volumes':
      return world.volumes
        .filter(v => v.engineId === cid)
        .map(v => {
          const used = v.name.length < 64 && containers.some(c => c.labels['com.docker.compose.project'] && v.name.startsWith(c.labels['com.docker.compose.project']));
          return {
            id: v.name,
            name: v.name,
            status: { status: used ? 'USED' : 'UNUSED', icon: VolumeIcon },
            nameCell: { title: v.name.length > 40 ? v.name.slice(0, 12) : v.name, sub: [v.mountpoint], href: `/c/${cid}/volumes/${encodeURIComponent(v.name)}/summary` },
            cols: [v.driver ?? 'local'],
            age: v.created,
            size: v.size,
            actions: volumeActions(v, used),
          };
        });
    case 'networks':
      return world.networks
        .filter(n => n.engineId === cid)
        .map(n => ({
          id: n.id,
          name: n.name,
          status: { status: n.name === 'podman' || n.name === 'bridge' ? 'USED' : 'UNUSED', icon: NetworkIcon },
          nameCell: { title: n.name, sub: [n.id.slice(0, 12)], href: `/c/${cid}/networks/${n.id}/summary` },
          cols: [n.driver, n.subnet ?? ''],
          age: n.created,
          actions: {
            buttons: [
              {
                title: 'Delete Network',
                icon: faTrash,
                enabled: n.name !== 'podman' && n.name !== 'bridge',
                onClick: (): void =>
                  withConfirmation(() => (world.networks = world.networks.filter(x => x.id !== n.id)), `delete network ${n.name}`, 'Delete network?'),
              },
            ],
            menu: [],
          },
        }));
    case 'secrets':
      return world.secrets
        .filter(s => s.engineId === cid)
        .map(s => ({
          id: s.id,
          name: s.name,
          status: { status: 'UNUSED', icon: SecretIcon },
          nameCell: { title: s.name, sub: [s.id.slice(0, 12)], href: `/c/${cid}/secrets/${s.id}/summary` },
          cols: [s.driver ?? 'file'],
          age: s.created,
          actions: {
            buttons: [
              {
                title: 'Delete Secret',
                icon: faTrash,
                onClick: (): void => withConfirmation(() => (world.secrets = world.secrets.filter(x => x.id !== s.id)), `delete secret ${s.name}`, 'Delete secret?'),
              },
            ],
            menu: [],
          },
        }));
    default:
      return [];
  }
});

const filtered = $derived(rows.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())));

const columns = $derived.by(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols: TableColumn<GenericRow, any>[] = [
    new TableColumn<GenericRow, StatusCellData>('Status', {
      align: 'center',
      width: '70px',
      renderer: StatusCell,
      renderMapping: (r): StatusCellData => r.status,
      comparator: (a, b): number => a.status.status.localeCompare(b.status.status),
    }),
    new TableColumn<GenericRow, NameCellData>('Name', {
      width: '3fr',
      renderer: NameCell,
      renderMapping: (r): NameCellData => r.nameCell,
      comparator: (a, b): number => a.name.localeCompare(b.name),
    }),
  ];
  extraTitles[resource].forEach((title, index) =>
    cols.push(
      new TableColumn<GenericRow, string>(title, {
        renderer: TableSimpleColumn,
        renderMapping: (r): string => r.cols[index] ?? '',
      }),
    ),
  );
  cols.push(
    new TableColumn<GenericRow, string>('Age', {
      renderer: TableSimpleColumn,
      renderMapping: (r): string => humanAge(r.age),
      comparator: (a, b): number => b.age - a.age,
    }),
  );
  if (resource === 'images' || resource === 'volumes') {
    cols.push(
      new TableColumn<GenericRow, string>('Size', {
        align: 'right',
        renderer: TableSimpleColumn,
        renderMapping: (r): string => humanSize(r.size ?? 0),
        comparator: (a, b): number => (b.size ?? 0) - (a.size ?? 0),
        initialOrder: 'descending',
      }),
    );
  }
  cols.push(
    new TableColumn<GenericRow, ActionsCellData>('Actions', {
      align: 'right',
      width: '150px',
      renderer: ActionsCell,
      overflow: true,
      renderMapping: (r): ActionsCellData => r.actions ?? noActions(),
    }),
  );
  return cols;
});

const row = new TableRow<GenericRow>({ selectable: (): boolean => true });

function key(r: GenericRow): string {
  return r.id;
}

function label(r: GenericRow): string {
  return r.name;
}

function pull(): void {
  runTask({
    name: 'Pull registry.access.redhat.com/ubi10/ubi-minimal:latest',
    steps: [
      { label: 'Resolving registry.access.redhat.com', ms: 500 },
      { label: 'Copying blob sha256:7a4c…', ms: 1800 },
      { label: 'Writing manifest to image destination', ms: 400 },
    ],
    onDone: () => {
      world.images.push({
        id: crypto.randomUUID().replaceAll('-', ''),
        name: 'registry.access.redhat.com/ubi10/ubi-minimal',
        tag: 'latest',
        engineId: conn.id,
        size: 38_200_000,
        created: Date.now() - 6 * 86_400_000,
        base: 'ubi10',
      });
    },
  });
}

function create(): void {
  toast({ type: 'info', title: `Create ${CORE_RESOURCES[resource].singular.toLowerCase()}`, body: 'Form not part of this mockup wave.' });
}

function resetFilter(): void {
  searchTerm = '';
}
</script>

<NavPage bind:searchTerm={searchTerm} title={CORE_RESOURCES[resource].label}>
  {#snippet additionalActions()}
    {#if resource === 'images'}
      <Button onclick={pull} icon={faArrowCircleDown} title="Pull an image">Pull</Button>
    {:else}
      <Button onclick={create} icon={faPlusCircle}>Create</Button>
    {/if}
  {/snippet}
  {#snippet bottomAdditionalActions()}
    {#if selectedItemsNumber > 0}
      <span>On {selectedItemsNumber} selected items.</span>
    {/if}
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind={resource} />
      {:else if filtered.length === 0}
        {#if rows.length}
          <FilteredEmptyScreen icon={ICONS[resource]} kind={resource} {searchTerm} onResetFilter={resetFilter} />
        {:else}
          <EmptyScreen icon={ICONS[resource]} title="No {resource}" message="There are no {resource} on {conn.name} yet." />
        {/if}
      {:else}
        {#key columns}
          <Table kind={resource} bind:selectedItemsNumber={selectedItemsNumber} data={filtered} {columns} {row} defaultSortColumn="Name" {key} {label} />
        {/key}
      {/if}
    </div>
  {/snippet}
</NavPage>
