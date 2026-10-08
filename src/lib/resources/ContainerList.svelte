<script lang="ts">
/**
 * Containers of one engine connection – faithful to PD's ContainerList.svelte
 * (NavPage, All/Running/Stopped tabs, ui-svelte Table with Status/Name/Image/
 * Uptime/Actions). Grouping generalises compose to contributed groupers (P10);
 * contributed columns (P14) are appended before Actions. The Environment column
 * is dropped because the list is already scoped to one connection.
 */
import { faPlay, faPlusCircle, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  Button,
  EmptyScreen,
  FilteredEmptyScreen,
  NavPage,
  Table,
  TableColumn,
  TableDurationColumn,
  TableRow,
  TableSimpleColumn,
} from '@podman-desktop/ui-svelte';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';

import Contribution from '#lib/components/Contribution.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, IconRef } from '#lib/ext/types.ts';
import PodIcon from '#lib/images/PodIcon.svelte';
import { containerActions, groupActions } from '#lib/resources/actions.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { type Container, deleteContainer, runTask, shortImage, startContainer, stopContainer, world } from '#lib/world.svelte.ts';

import ConnectionStoppedScreen from './ConnectionStoppedScreen.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

interface GroupRow {
  kind: 'group';
  name: string;
  groupName: string;
  type: string;
  icon: IconRef;
  podId?: string;
  containers: Container[];
  allCount: number;
  selected?: boolean;
  ext?: import('#lib/ext/types.ts').ExtensionMeta;
}

type Row = Container | GroupRow;

let searchTerm = $state('');
let filter = $state<'all' | 'running' | 'stopped'>('all');
let selectedItemsNumber = $state(0);

function isGroup(r: Row): r is GroupRow {
  return 'kind' in r && r.kind === 'group';
}

const mine = $derived(world.containers.filter(c => c.engineId === conn.id));

const visible = $derived(
  mine
    .filter(c => (filter === 'running' ? c.state === 'RUNNING' : filter === 'stopped' ? c.state !== 'RUNNING' : true))
    .filter(c => {
      const t = searchTerm.toLowerCase();
      return !t || c.name.toLowerCase().includes(t) || c.image.toLowerCase().includes(t);
    }),
);

const rows: Row[] = $derived.by(() => {
  const groups = new Map<string, GroupRow>();
  const out: Row[] = [];
  for (const c of visible) {
    let key: string | undefined;
    let make: (() => GroupRow) | undefined;
    if (c.podId) {
      const pod = world.pods.find(p => p.id === c.podId);
      if (pod) {
        key = `pod:${pod.id}`;
        make = (): GroupRow => ({ kind: 'group', name: `pod:${pod.name}`, groupName: pod.name, type: 'pod', icon: PodIcon, podId: pod.id, containers: [], allCount: pod.containerIds.length });
      }
    } else {
      const grouper = registry.groupers.find(g => c.labels[g.label]);
      if (grouper) {
        const value = c.labels[grouper.label];
        key = `${grouper.id}:${value}`;
        make = (): GroupRow => ({
          kind: 'group',
          name: key!,
          groupName: value,
          type: grouper.typeName,
          icon: grouper.icon ?? PodIcon,
          containers: [],
          allCount: mine.filter(x => x.labels[grouper.label] === value).length,
          ext: grouper.ext,
        });
      }
    }
    if (key && make) {
      let g = groups.get(key);
      if (!g) {
        g = make();
        groups.set(key, g);
        out.push(g);
      }
      g.containers.push(c);
    } else {
      out.push(c);
    }
  }
  return out;
});

function groupStatus(g: GroupRow): string {
  const states = g.containers.map(c => c.state);
  if (states.every(s => s === 'RUNNING')) return 'RUNNING';
  if (states.some(s => s === 'RUNNING')) return 'DEGRADED';
  return 'EXITED';
}

const statusColumn = new TableColumn<Row, StatusCellData>('Status', {
  align: 'center',
  width: '70px',
  renderer: StatusCell,
  renderMapping: (r): StatusCellData =>
    isGroup(r) ? { status: groupStatus(r), icon: typeof r.icon === 'string' ? PodIcon : (r.icon as StatusCellData['icon']) } : { status: r.state, icon: ContainerIcon },
  comparator: (a, b): number => (isGroup(a) ? groupStatus(a) : a.state).localeCompare(isGroup(b) ? groupStatus(b) : b.state),
});

const nameColumn = new TableColumn<Row, NameCellData>('Name', {
  width: '2fr',
  renderer: NameCell,
  renderMapping: (r): NameCellData => {
    if (isGroup(r)) {
      const filtered = r.allCount - r.containers.length;
      return {
        title: `${r.groupName} (${r.type})`,
        sub: [`${r.allCount} container${r.allCount > 1 ? 's' : ''}${filtered > 0 ? ` (${filtered} filtered)` : ''}`],
        href: r.podId ? `/c/${conn.id}/pods/${r.podId}/summary` : undefined,
        badges: r.ext ? [{ label: `grouped by ${r.ext.displayName}`, ext: r.ext }] : undefined,
      };
    }
    const port = r.ports.length ? `PORT${r.ports.length > 1 ? 'S' : ''} ${r.ports.map(p => p.host).join(', ')}` : '';
    return { title: r.name, sub: [r.state, port].filter(Boolean), href: `/c/${conn.id}/containers/${r.id}/summary` };
  },
  comparator: (a, b): number => (isGroup(a) ? a.groupName : a.name).localeCompare(isGroup(b) ? b.groupName : b.name),
});

const imageColumn = new TableColumn<Row, string>('Image', {
  width: '3fr',
  renderer: TableSimpleColumn,
  renderMapping: (r): string => (isGroup(r) ? '' : shortImage(r.image)),
  comparator: (a, b): number => (isGroup(a) ? '' : a.image).localeCompare(isGroup(b) ? '' : b.image),
});

const uptimeColumn = new TableColumn<Row, Date | undefined>('Uptime', {
  renderer: TableDurationColumn,
  renderMapping: (r): Date | undefined => (!isGroup(r) && r.state === 'RUNNING' && r.startedAt ? new Date(r.startedAt) : undefined),
  comparator: (a, b): number => (isGroup(b) ? 0 : (b.startedAt ?? 0)) - (isGroup(a) ? 0 : (a.startedAt ?? 0)),
});

const actionsColumn = new TableColumn<Row, ActionsCellData>('Actions', {
  align: 'right',
  width: '150px',
  renderer: ActionsCell,
  overflow: true,
  renderMapping: (r): ActionsCellData => {
    if (!isGroup(r)) return containerActions(r);
    const base = groupActions(r.containers, r.podId);
    const grouper = registry.groupers.find(g => g.ext.id === r.ext?.id && g.typeName === r.type);
    const extra = (grouper?.actions ?? []).map(a => ({
      title: a.label,
      icon: a.icon,
      ext: grouper!.ext,
      onClick: (): void => a.run(r.groupName, r.containers),
    }));
    return { buttons: base.buttons, menu: [...base.menu, ...extra] };
  },
});

const columns = $derived([
  statusColumn,
  nameColumn,
  imageColumn,
  uptimeColumn,
  ...registry.columns
    .filter(c => c.target === 'container')
    .map(
      c =>
        new TableColumn<Row, string>(c.title, {
          width: c.width ?? '1fr',
          renderer: TableSimpleColumn,
          renderMapping: (r): string => (isGroup(r) ? '' : (c.value(r) ?? '')),
        }),
    ),
  actionsColumn,
]);

const row = new TableRow<Row>({
  selectable: (): boolean => true,
  children: (r): Row[] => (isGroup(r) ? r.containers : []),
});

function key(r: Row): string {
  return isGroup(r) ? r.name : r.id;
}

function label(r: Row): string {
  return isGroup(r) ? r.groupName : r.name;
}

function setFilter(f: 'all' | 'running' | 'stopped'): void {
  filter = f;
}

function selected(): Container[] {
  return mine.filter(c => c.selected);
}

function startSelected(): void {
  selected().forEach(c => startContainer(c.id));
}

function stopSelected(): void {
  selected().forEach(c => stopContainer(c.id));
}

function deleteSelected(): void {
  const list = selected();
  withConfirmation(() => list.forEach(c => deleteContainer(c.id)), `delete ${list.length} container${list.length > 1 ? 's' : ''}`, 'Delete containers?');
}

function create(): void {
  runTask({
    name: 'Create container from quay.io/podman/hello',
    steps: [
      { label: 'Pulling quay.io/podman/hello:latest', ms: 1200 },
      { label: 'Creating container', ms: 600 },
    ],
    onDone: () => {
      world.containers.push({
        id: crypto.randomUUID().replaceAll('-', ''),
        name: `hello-${Math.floor(Math.random() * 900 + 100)}`,
        image: 'quay.io/podman/hello:latest',
        engineId: conn.id,
        state: 'EXITED',
        created: Date.now(),
        ports: [],
        labels: {},
        logs: ['!... Hello Podman World ...!'],
      });
    },
  });
}

function resetFilter(): void {
  searchTerm = '';
  filter = 'all';
}

function runToolbar(m: (typeof toolbar)[number]): void {
  m.run({ target: 'container', conn, resource: conn });
}

const toolbar = $derived(registry.menusFor({ target: 'container', conn, resource: conn }, 'toolbar'));
</script>

<NavPage bind:searchTerm={searchTerm} title="containers">
  {#snippet additionalActions()}
    {#each toolbar as m (m.ext.id + m.id)}
      <Contribution ext={m.ext} kind="menu (toolbar)" api="P14">
        <Button type="secondary" icon={m.icon} onclick={runToolbar.bind(undefined, m)}>{m.label}</Button>
      </Contribution>
    {/each}
    <Button onclick={create} icon={faPlusCircle} title="Create a container">Create</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}
    {#if selectedItemsNumber > 0}
      <div class="inline-flex space-x-2">
        <Button onclick={startSelected} aria-label="Run selected containers and pods" title="Run {selectedItemsNumber} selected items" icon={faPlay}></Button>
        <Button onclick={stopSelected} aria-label="Stop selected containers and pods" title="Stop {selectedItemsNumber} selected items" icon={faStop}></Button>
        <Button onclick={deleteSelected} aria-label="Delete selected containers and pods" title="Delete {selectedItemsNumber} selected items" icon={faTrash}></Button>
      </div>
      <span>On {selectedItemsNumber} selected items.</span>
    {/if}
  {/snippet}
  {#snippet tabs()}
    <Button type="tab" onclick={setFilter.bind(undefined, 'all')} selected={filter === 'all'}>All</Button>
    <Button type="tab" onclick={setFilter.bind(undefined, 'running')} selected={filter === 'running'}>Running</Button>
    <Button type="tab" onclick={setFilter.bind(undefined, 'stopped')} selected={filter === 'stopped'}>Stopped</Button>
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="containers" />
      {:else if rows.length === 0}
        {#if mine.length > 0}
          <FilteredEmptyScreen icon={ContainerIcon} kind="containers" searchTerm={searchTerm || filter} onResetFilter={resetFilter} />
        {:else}
          <EmptyScreen icon={ContainerIcon} title="No containers" message="Run a first container from an image, or click Create." />
        {/if}
      {:else}
        {#key columns}
          <Table kind="container" bind:selectedItemsNumber={selectedItemsNumber} data={rows} {columns} {row} defaultSortColumn="Name" {key} {label} />
        {/key}
      {/if}
    </div>
  {/snippet}
</NavPage>
