<script lang="ts">
/**
 * Operators section (P2): Catalog (packages served by the cluster's
 * catalogs) / Installed (ClusterExtension or Subscription) / Catalogs.
 * Install creates the service account + ClusterExtension as a task.
 */
import { faCubes, faDownload, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import Dialog from '#lib/components/Dialog.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { addKube, kube, type KubeObject, runTask, toast, world } from '#lib/world.svelte.ts';

import { CATALOG_KINDS, extensionObj, INSTALLED_KINDS, OLM_ID, olmVersion, type OperatorPackage, PACKAGES } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let tab = $state<'catalog' | 'installed' | 'catalogs'>('catalog');
let searchTerm = $state('');
let installing = $state<OperatorPackage | undefined>();
let channel = $state('');
let namespace = $state('');

const objects = $derived(world.kube[conn.id] ?? []);
const catalogs = $derived(objects.filter(o => CATALOG_KINDS.includes(o.kind)));
const installed = $derived(objects.filter(o => INSTALLED_KINDS.includes(o.kind)));
const catalogNames = $derived(catalogs.map(c => c.metadata.name.replace(/-catalog$/, '')));
const version = $derived(olmVersion(conn.id));
const packages = $derived(
  PACKAGES.filter(p => catalogNames.includes(p.catalog)).filter(
    p => p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || p.packageName.includes(searchTerm.toLowerCase()),
  ),
);

function installedPkg(p: OperatorPackage): KubeObject | undefined {
  return installed.find(o => {
    const src = (o.spec?.source as { catalog?: { packageName?: string } } | undefined)?.catalog?.packageName ?? (o.spec?.name as string | undefined);
    return src === p.packageName;
  });
}

function setTab(t: typeof tab): void {
  tab = t;
}

function openInstall(p: OperatorPackage): void {
  installing = p;
  channel = p.defaultChannel;
  namespace = p.packageName.replace(/-operator(-rh)?$/, '').replace(/^openshift-/, '') + '-operator';
}

function closeInstall(): void {
  installing = undefined;
}

function onNs(e: Event): void {
  namespace = (e.currentTarget as HTMLInputElement).value;
}

function onChannel(v: string): void {
  channel = v;
}

function install(): void {
  const p = installing;
  if (!p) return;
  installing = undefined;
  const name = p.packageName.replace(/-operator(-rh)?$/, '');
  const v1 = version === 'v1';
  const obj = v1
    ? extensionObj(name, namespace, p.packageName, channel, p.latest, 'STARTING', 'Retrying', undefined, { d: 0 })
    : kube('operators.coreos.com/v1alpha1', 'Subscription', name, namespace, { name: p.packageName, channel, source: `${p.catalog}-catalog` }, { state: 'STARTING', installedCSV: `${p.packageName}.v${p.latest}` }, { m: 0 });
  runTask({
    name: `Install ${p.displayName} on ${conn.name}`,
    ext: OLM_ID,
    steps: v1
      ? [
          { label: `Creating namespace ${namespace} and ServiceAccount ${name}-installer`, ms: 700, log: [`serviceaccount/${name}-installer created`, `clusterrolebinding.rbac.authorization.k8s.io/${name}-installer created`] },
          { label: `Creating ClusterExtension ${name} (channel ${channel})`, ms: 600, log: ['Progressing: Retrying – resolving bundle'] },
          { label: `Unpacking bundle ${p.packageName}.v${p.latest}`, ms: 1600 },
          { label: 'Waiting for Installed=True', ms: 1400, log: [`Installed: Succeeded – Installed bundle ${p.packageName}.v${p.latest} successfully`] },
        ]
      : [
          { label: `Creating OperatorGroup and Subscription ${name}`, ms: 800 },
          { label: `Waiting for InstallPlan and CSV ${p.packageName}.v${p.latest}`, ms: 2400 },
        ],
    action: { label: 'View installed operators', href: `/c/${conn.id}/operators` },
    onDone: () => {
      const target = (world.kube[conn.id] ?? []).find(o => o.metadata.uid === obj.metadata.uid);
      if (target) target.status = { ...target.status, state: 'RUNNING', installed: 'True', reason: 'Succeeded' };
    },
  });
  addKube(conn.id, [obj]);
  tab = 'installed';
}

function uninstall(o: KubeObject): void {
  withConfirmation(
    () => {
      world.kube[conn.id] = (world.kube[conn.id] ?? []).filter(x => x.metadata.uid !== o.metadata.uid);
      toast({ type: 'success', title: `Operator ${o.metadata.name} uninstalled from ${conn.name}` });
    },
    `uninstall operator ${o.metadata.name} from ${conn.name}`,
    'Uninstall operator?',
    'Uninstall',
  );
}

function addOperatorHub(): void {
  navigate(`/c/${conn.id}?tab=addons`);
}

function stateOf(o: KubeObject): string {
  return String(o.status?.state ?? 'RUNNING');
}

function statusText(o: KubeObject): string {
  const reason = String(o.status?.reason ?? (stateOf(o) === 'RUNNING' ? 'Succeeded' : 'Progressing'));
  const msg = o.status?.message ? `: ${String(o.status.message)}` : '';
  return stateOf(o) === 'STARTING' ? 'Progressing' : `${reason}${msg}`;
}

const installedColumns = $derived([
  new TableColumn<KubeObject, StatusCellData>('Status', { align: 'center', width: '70px', renderer: StatusCell, renderMapping: (o): StatusCellData => ({ status: stateOf(o), icon: faCubes }) }),
  new TableColumn<KubeObject, NameCellData>('Name', {
    width: '1.5fr',
    renderer: NameCell,
    renderMapping: (o): NameCellData => ({ title: o.metadata.name, sub: [o.kind, String(o.spec?.namespace ?? o.metadata.namespace ?? '')], href: `/c/${conn.id}/kube/${o.kind}~${o.metadata.namespace ?? '_'}~${o.metadata.name}/summary` }),
    comparator: (a, b): number => a.metadata.name.localeCompare(b.metadata.name),
  }),
  new TableColumn<KubeObject, string>('Bundle', { width: '1.5fr', renderer: TableSimpleColumn, renderMapping: (o): string => String(o.status?.bundle ?? o.status?.installedCSV ?? '') }),
  new TableColumn<KubeObject, string>('Channel', {
    renderer: TableSimpleColumn,
    renderMapping: (o): string => ((o.spec?.source as { catalog?: { channels?: string[] } } | undefined)?.catalog?.channels ?? [String(o.spec?.channel ?? '')]).join(', '),
  }),
  new TableColumn<KubeObject, string>('Installed', { width: '2fr', renderer: TableSimpleColumn, renderMapping: statusText }),
  new TableColumn<KubeObject, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    renderMapping: (o): ActionsCellData => ({ buttons: [{ title: 'Uninstall operator', icon: faTrash, onClick: (): void => uninstall(o) }], menu: [] }),
  }),
]);

const catalogColumns = [
  new TableColumn<KubeObject, StatusCellData>('Status', { align: 'center', width: '70px', renderer: StatusCell, renderMapping: (o): StatusCellData => ({ status: stateOf(o), icon: faCubes }) }),
  new TableColumn<KubeObject, NameCellData>('Name', { width: '1.5fr', renderer: NameCell, renderMapping: (o): NameCellData => ({ title: o.metadata.name, sub: [o.kind] }) }),
  new TableColumn<KubeObject, string>('Image', {
    width: '2.5fr',
    renderer: TableSimpleColumn,
    renderMapping: (o): string => String((o.spec?.source as { image?: { ref?: string } } | undefined)?.image?.ref ?? o.spec?.image ?? ''),
  }),
  new TableColumn<KubeObject, string>('Priority', { width: '80px', renderer: TableSimpleColumn, renderMapping: (o): string => String(o.spec?.priority ?? 0) }),
  new TableColumn<KubeObject, string>('Serving', { renderer: TableSimpleColumn, renderMapping: (o): string => (o.status?.serving === 'True' || o.status?.connectionState === 'READY' ? 'Serving' : 'Unpacking') }),
];

const row = new TableRow<KubeObject>({});
function key(o: KubeObject): string {
  return o.metadata.uid;
}
function label(o: KubeObject): string {
  return o.metadata.name;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Operators" searchEnabled={tab === 'catalog'}>
  {#snippet additionalActions()}
    <span class="text-sm text-[var(--pd-content-text)]">OLM {version} · {catalogs.length} catalog{catalogs.length === 1 ? '' : 's'}</span>
  {/snippet}
  {#snippet tabs()}
    <Button type="tab" onclick={setTab.bind(undefined, 'catalog')} selected={tab === 'catalog'}>Catalog</Button>
    <Button type="tab" onclick={setTab.bind(undefined, 'installed')} selected={tab === 'installed'}>Installed ({installed.length})</Button>
    <Button type="tab" onclick={setTab.bind(undefined, 'catalogs')} selected={tab === 'catalogs'}>Catalogs</Button>
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if tab === 'catalog'}
        {#if catalogs.length === 0}
          <EmptyScreen icon={faCubes} title="No operator catalog" message="{conn.name} runs OLM {version} without a catalog. Add the OperatorHub.io catalog to browse community operators.">
            <Button onclick={addOperatorHub}>Add OperatorHub.io catalog</Button>
          </EmptyScreen>
        {:else if packages.length === 0}
          <EmptyScreen icon={faCubes} title="No operators match" message="No package matching '{searchTerm}' in {catalogNames.join(', ')}." />
        {:else}
          <div class="grid grid-cols-3 gap-3 px-5 py-2 w-full h-fit" aria-label="Operator catalog">
            {#each packages as p (p.packageName)}
              {@const inst = installedPkg(p)}
              <div class="flex flex-col gap-2 rounded-lg bg-[var(--pd-content-card-bg)] p-4" role="region" aria-label={p.displayName}>
                <div class="flex items-center gap-3">
                  <AppIcon icon="icons/redhat.olm.png" size="28px" />
                  <div class="flex flex-col min-w-0">
                    <span class="font-semibold text-[var(--pd-content-card-header-text)] truncate" title={p.displayName}>{p.displayName}</span>
                    <span class="text-xs text-[var(--pd-content-card-title)]">{p.provider} · {p.catalog}</span>
                  </div>
                </div>
                <p class="text-sm text-[var(--pd-content-card-text)] grow">{p.description}</p>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-[var(--pd-content-card-title)]">{p.defaultChannel} · v{p.latest}</span>
                  {#if inst}
                    <span class="text-sm {stateOf(inst) === 'RUNNING' ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-content-card-text)]'}">{stateOf(inst) === 'STARTING' ? 'Installing…' : 'Installed'}</span>
                  {:else}
                    <Button icon={faDownload} onclick={openInstall.bind(undefined, p)}>Install</Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else if tab === 'installed'}
        {#if installed.length === 0}
          <EmptyScreen icon={faCubes} title="No operators installed" message="Install an operator from the Catalog tab." />
        {:else}
          <Table kind="olm-installed" data={installed} columns={installedColumns} {row} defaultSortColumn="Name" {key} {label} />
        {/if}
      {:else if catalogs.length === 0}
        <EmptyScreen icon={faCubes} title="No catalogs" message="Add a catalog to browse operators.">
          <Button onclick={addOperatorHub}>Add OperatorHub.io catalog</Button>
        </EmptyScreen>
      {:else}
        <Table kind="olm-catalogs" data={catalogs} columns={catalogColumns} {row} defaultSortColumn="Name" {key} {label} />
      {/if}
    </div>
  {/snippet}
</NavPage>

{#if installing}
  {@const pkg = installing}
  <Dialog title="Install {pkg.displayName}" onclose={closeInstall}>
    {#snippet content()}
      <div class="flex flex-col gap-3 w-[30rem]">
        <p class="text-sm">Creates a ServiceAccount with the permissions the bundle needs and a {version === 'v1' ? 'ClusterExtension' : 'Subscription'} for package <code>{pkg.packageName}</code> from {pkg.catalog}.</p>
        <span class="flex flex-col gap-1">Channel<Dropdown ariaLabel="Channel" value={channel} onChange={onChannel} options={pkg.channels.map(c => ({ value: c, label: c }))} /></span>
        <label class="flex flex-col gap-1" for="olm-ns">Install namespace<Input id="olm-ns" value={namespace} oninput={onNs} aria-label="Install namespace" /></label>
      </div>
    {/snippet}
    {#snippet buttons()}
      <Button type="link" onclick={closeInstall}>Cancel</Button>
      <Button disabled={!namespace.trim()} onclick={install}>Install</Button>
    {/snippet}
  </Dialog>
{/if}
