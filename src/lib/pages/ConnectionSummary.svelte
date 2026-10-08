<script lang="ts">
/**
 * Connection overview (`/c/<conn>`): provider-card-like header with
 * lifecycle actions, Summary / Add-ons (kube, P13) / extension tabs (P14).
 */
import { faArrowsRotate, faCircleInfo, faPlay, faPuzzlePiece, faStop, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, EmptyScreen, Spinner } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import LazyComponent from '#lib/components/LazyComponent.svelte';
import ListItemButtonIcon from '#lib/components/ListItemButtonIcon.svelte';
import { confirm, withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { AddonDef, ConnectionView, Contributed, ResourceContext } from '#lib/ext/types.ts';
import { coreResourcesOf, href, KUBE_KINDS, navigate, startVerb, STATUS_DOT_CLASS, statusLabel } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import DetailsTabs from '#lib/resources/DetailsTabs.svelte';
import { deleteConnection, restartConnection, runTask, startConnection, stopConnection, toast, world } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const tab = $derived(page.url.searchParams.get('tab') ?? 'summary');
const ctx: ResourceContext = $derived({ target: 'connection', conn, resource: conn });
const extTabs = $derived(conn.extensionDisabled ? [] : registry.tabsFor(ctx));
const addons = $derived(conn.extensionDisabled ? [] : registry.addonsFor(conn));
const sections = $derived(conn.extensionDisabled ? [] : registry.navSectionsFor(conn));
const detailsMenus = $derived(conn.extensionDisabled ? [] : registry.menusFor(ctx, 'details'));
const busy = $derived(['starting', 'stopping', 'creating'].includes(conn.status));
const extTab = $derived(extTabs.find(t => t.id === tab));
const children = $derived(registry.activeConnections.filter(c => c.parentId === conn.id));
const parent = $derived(conn.parentId ? registry.getConnection(conn.parentId) : undefined);

function count(id: string): number {
  const mine = <T extends { engineId: string }>(l: T[]): number => l.filter(x => x.engineId === conn.id).length;
  if (id === 'containers') return mine(world.containers);
  if (id === 'pods') return mine(world.pods);
  if (id === 'images') return mine(world.images);
  if (id === 'volumes') return mine(world.volumes);
  if (id === 'networks') return mine(world.networks);
  if (id === 'secrets') return mine(world.secrets);
  const kinds = KUBE_KINDS[id] ?? [];
  return (world.kube[conn.id] ?? []).filter(o => kinds.includes(o.kind)).length;
}

function tabPath(id: string): string {
  return `/c/${conn.id}${id === 'summary' ? '' : `?tab=${id}`}`;
}

function start(): void {
  startConnection(conn.id, conn.name);
}

function stop(): void {
  stopConnection(conn.id, conn.name);
}

function restart(): void {
  restartConnection(conn.id, conn.name);
}

function remove(): void {
  withConfirmation(
    () => {
      deleteConnection(conn.id, conn.name);
      navigate('/');
    },
    `delete ${conn.name}`,
    `Delete ${conn.kind === 'kubernetes' ? 'cluster' : 'connection'}?`,
  );
}

function noop(): void {
  // top-level page: Escape does not navigate away
}

function addonState(a: Contributed<AddonDef>): 'installed' | 'installing' | undefined {
  return world.addons[`${conn.id}:${a.ext.id}:${a.id}`];
}

function doInstall(a: Contributed<AddonDef>): void {
  const key = `${conn.id}:${a.ext.id}:${a.id}`;
  const target = conn;
  world.addons[key] = 'installing';
  runTask({
    name: `Install ${a.label} on ${conn.name}`,
    ext: a.ext.id,
    steps: a.installSteps,
    action: { label: 'Open add-ons', href: `/c/${conn.id}?tab=addons` },
    onDone: () => {
      world.addons[key] = 'installed';
      a.onInstalled?.(target);
    },
  });
}

function install(a: Contributed<AddonDef>): void {
  if (!a.warning) {
    doInstall(a);
    return;
  }
  confirm({ title: `Install ${a.label}?`, message: a.warning, buttonLabel: 'Install', variant: 'primary' })
    .then(ok => {
      if (ok) doInstall(a);
    })
    .catch(console.error);
}

function openEndpoint(url: string): void {
  toast({ type: 'info', title: `Opening ${url}` });
}

function uninstall(a: Contributed<AddonDef>): void {
  withConfirmation(
    () => {
      delete world.addons[`${conn.id}:${a.ext.id}:${a.id}`];
      a.onUninstalled?.(conn);
      toast({ type: 'success', title: `${a.label} uninstalled from ${conn.name}` });
    },
    `uninstall ${a.label} from ${conn.name}`,
    'Uninstall add-on?',
    'Uninstall',
  );
}

function runMenu(m: (typeof detailsMenus)[number]): void {
  m.run(ctx);
}

function enableExt(): void {
  registry.enable(conn.ext.id);
}

function openTile(path: string): void {
  navigate(path);
}

const tiles = $derived([
  ...coreResourcesOf(conn).map(r => ({ id: r.id, label: r.label, icon: r.icon, count: count(r.id) as number | undefined, path: `/c/${conn.id}/${r.id}`, ext: undefined })),
  ...sections.map(s => ({ id: s.id, label: s.label, icon: s.icon ?? s.ext.icon, count: s.counter?.(world, conn), path: `/c/${conn.id}/${s.id}`, ext: s.ext })),
]);
</script>

<!-- Connection home: one header (identity + lifecycle), Summary + contributed tabs. No breadcrumb/close: it is a top-level destination reached from the primary nav. -->
<div class="h-full w-full [&_[aria-label=Header]_button[aria-label=Close]]:hidden">
<DetailsPage title={conn.name} subtitle="{conn.providerName}{conn.version ? ` ${conn.version}` : ''} · {conn.endpoint}" onclose={noop}>
  {#snippet iconSnippet()}
    <div class="relative">
      <AppIcon icon={conn.icon} size="32px" />
      <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--pd-content-bg)] {STATUS_DOT_CLASS[conn.status]}"></span>
    </div>
  {/snippet}
  {#snippet actionsSnippet()}
    {#if !conn.extensionDisabled}
      {#if busy}
        <span class="flex items-center gap-2 text-sm text-[var(--pd-content-text)] pr-2"><Spinner size="1em" />{statusLabel(conn)}…</span>
      {/if}
      <ListItemButtonIcon title={startVerb(conn)} icon={faPlay} detailed onClick={start} hidden={conn.status !== 'stopped'} />
      <ListItemButtonIcon title="Stop" icon={faStop} detailed onClick={stop} hidden={conn.status !== 'started'} />
      <ListItemButtonIcon title="Restart" icon={faArrowsRotate} detailed onClick={restart} enabled={conn.status === 'started'} />
      {#each detailsMenus as m (m.ext.id + m.id)}
        <Contribution ext={m.ext} kind="menu (details)" api="P4">
          <ListItemButtonIcon title={m.label} icon={m.icon ?? faPuzzlePiece} detailed onClick={runMenu.bind(undefined, m)} />
        </Contribution>
      {/each}
      <ListItemButtonIcon title="Delete" icon={faTrash} detailed onClick={remove} enabled={!busy} />
    {/if}
  {/snippet}
  {#snippet tabsSnippet()}
    <DetailsTabs
      base="/c/{conn.id}"
      current={tab}
      core={[{ id: 'summary', label: 'Summary' }, ...(conn.kind === 'kubernetes' ? [{ id: 'addons', label: addons.length ? `Add-ons (${addons.length})` : 'Add-ons' }] : [])]}
      ext={extTabs}
      pathFor={tabPath} />
  {/snippet}
  {#snippet contentSnippet()}
    {#if conn.extensionDisabled}
      <ConnectionStoppedScreen {conn} kind="resources" />
    {:else if tab === 'summary'}
      <div class="h-full overflow-auto px-5 py-4 space-y-4">
        {#if conn.status !== 'started'}
          <div class="flex items-center gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-text)]">
            <span class="w-2.5 h-2.5 rounded-full {STATUS_DOT_CLASS[conn.status]}"></span>
            <span class="grow">{conn.name} is {statusLabel(conn).toLowerCase()}. {startVerb(conn)} to work with its resources.</span>
            {#if conn.status === 'stopped'}<Button icon={faPlay} onclick={start}>{startVerb(conn)}</Button>{/if}
          </div>
        {/if}
        <div class="grid grid-cols-4 gap-3" aria-label="Resources">
          {#each tiles as t (t.id)}
            <button
              class="flex items-center gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left"
              onclick={openTile.bind(undefined, t.path)}>
              <span class="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--pd-content-card-inset-surface)] text-[var(--pd-content-card-icon)]">
                <AppIcon icon={t.icon as never} size="18" />
              </span>
              <span class="flex flex-col min-w-0">
                <span class="text-xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{t.count ?? '–'}</span>
                <span class="text-sm text-[var(--pd-content-card-text)] truncate">{t.label}</span>
              </span>
              {#if t.ext && t.icon !== t.ext.icon}<span class="ml-auto self-start"><AppIcon icon={t.ext.icon} size="12px" title="From {t.ext.displayName}" /></span>{/if}
            </button>
          {/each}
        </div>
        <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 text-[var(--pd-content-card-text)]">
          <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">Details</h2>
          <table class="w-full">
            <tbody>
              {#each [['Status', statusLabel(conn)], ['Provider', conn.providerName], ['Type', conn.kind === 'engine' ? `${conn.engineType ?? ''} engine` : conn.kind], ['Endpoint', conn.endpoint], ['Version', conn.version ?? ''], ...Object.entries(conn.details ?? {}).filter(([k]) => !(parent && k === 'Runs on')), ['Contributed by', `${conn.ext.displayName} (${conn.ext.id})`]] as [label, value] (label)}
                {#if value}
                  <tr><td class="py-1 w-48 text-[var(--pd-table-body-text)]">{label}</td><td class="py-1 wrap-anywhere">{value}</td></tr>
                {/if}
              {/each}
              {#if parent}
                <tr><td class="py-1 w-48 text-[var(--pd-table-body-text)]">Runs on</td><td class="py-1"><a class="text-[var(--pd-link)]" href={href(`/c/${parent.id}`)}>{parent.name}</a></td></tr>
              {/if}
              {#if children.length}
                <tr>
                  <td class="py-1 w-48 text-[var(--pd-table-body-text)]">Hosts</td>
                  <td class="py-1 space-x-2">{#each children as ch (ch.id)}<a class="text-[var(--pd-link)]" href={href(`/c/${ch.id}`)}>{ch.name}</a>{/each}</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {:else if tab === 'addons'}
      <div class="h-full overflow-auto px-5 py-4 space-y-3">
        {#if addons.length === 0}
          <EmptyScreen icon={faPuzzlePiece} title="No add-ons available" message="Extensions can contribute cluster add-ons (OpenShift console, OLM, Skupper…) to {conn.name}.">
            <Button onclick={openTile.bind(undefined, '/extensions?tab=catalog')}>Browse the catalog</Button>
          </EmptyScreen>
        {/if}
        {#each addons as a (a.ext.id + a.id)}
          {@const st = addonState(a)}
          {@const disabledReason = a.disabledReason?.(conn)}
          <Contribution ext={a.ext} kind="addon" api="P13">
            <div class="flex items-center gap-4 rounded-lg bg-[var(--pd-content-card-bg)] p-4">
              <AppIcon icon={a.icon ?? a.ext.icon} size="36px" />
              <div class="grow min-w-0">
                <div class="font-semibold text-[var(--pd-content-card-header-text)]">{a.label}</div>
                <div class="text-sm text-[var(--pd-content-card-text)]">{a.description}</div>
                {#if a.warning}
                  <div class="flex items-center gap-1.5 mt-1 text-sm text-[var(--pd-state-warning)]"><Icon icon={faTriangleExclamation} />{a.warning}</div>
                {/if}
                {#if disabledReason}
                  <div class="flex items-center gap-1.5 mt-1 text-sm text-[var(--pd-content-sub-header)]"><Icon icon={faCircleInfo} />{disabledReason}</div>
                {/if}
                {#if st === 'installed' && a.endpoints}
                  <div class="flex flex-wrap gap-x-3 mt-1">
                    {#each a.endpoints(conn) as ep (ep.url)}
                      <span class="text-sm">{ep.label}: <button class="text-[var(--pd-link)] hover:underline" onclick={openEndpoint.bind(undefined, ep.url)}>{ep.url}</button></span>
                    {/each}
                  </div>
                {/if}
              </div>
              {#if st === 'installed'}
                <span class="text-sm text-[var(--pd-status-running)]">Installed</span>
                <Button type="secondary" onclick={uninstall.bind(undefined, a)}>Uninstall</Button>
              {:else}
                <Button inProgress={st === 'installing'} disabled={conn.status !== 'started' || st === 'installing' || !!disabledReason} onclick={install.bind(undefined, a)}>Install</Button>
              {/if}
            </div>
          </Contribution>
        {/each}
      </div>
    {:else if extTab}
      {#key extTab.id}
        <LazyComponent component={extTab.component} props={{ ctx }} />
      {/key}
    {:else}
      <EmptyScreen title="Tab not available" message="The extension providing '{tab}' is disabled or does not apply here." />
    {/if}
  {/snippet}
</DetailsPage>
</div>
