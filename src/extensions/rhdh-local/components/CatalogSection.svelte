<script lang="ts">
/** Developer Hub › Catalog (P2): entities by kind (`/api/catalog/entities/by-query`); `?entity=` shows one entity. */
import { faArrowUpRightFromSquare, faCubes } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, Dropdown, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { NameCellData } from '#lib/table/types.ts';
import { toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { type Entity, entityRef, hub } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const kind = $derived(page.url.searchParams.get('kind') ?? 'all');
const ref = $derived(page.url.searchParams.get('entity'));
const entities = $derived(hub(conn.id).entities);
const all = $derived(entities.filter(e => kind === 'all' || e.kind === kind));
const rows = $derived(all.filter(e => `${e.name} ${e.description ?? ''} ${e.owner ?? ''}`.toLowerCase().includes(searchTerm.toLowerCase())));
const selected = $derived(ref ? entities.find(e => entityRef(e) === ref) : undefined);

const KINDS = ['all', 'Component', 'API', 'System', 'Group', 'User'];
const kindOptions = KINDS.map(k => ({ value: k, label: k === 'all' ? 'All kinds' : k }));

function key(e: Entity): string {
  return entityRef(e);
}

function nameOf(e: Entity): NameCellData {
  const repo = e.links?.find(l => l.title === 'Repository');
  return {
    title: e.title ?? e.name,
    sub: [entityRef(e), ...(e.scaffolderTask ? ['new'] : []), repo ? repo.url.replace('https://', '') : (e.description ?? '')].filter(Boolean),
    href: `/c/${conn.id}/catalog?entity=${encodeURIComponent(entityRef(e))}`,
  };
}

const columns: DataColumn<Entity>[] = [
  { title: 'Kind', width: '100px', value: (e): string => e.kind },
  { title: 'Type', width: '100px', value: (e): string => e.type ?? '–' },
  { title: 'Owner', width: '1.3fr', value: (e): string => e.owner ?? (e.memberOf ? `member of ${e.memberOf.join(', ')}` : '–') },
  { title: 'Lifecycle', width: '110px', value: (e): string => e.lifecycle ?? '–' },
  { title: 'System', width: '1fr', value: (e): string => e.system ?? '–' },
];

function setKind(v: string): void {
  navigate(`/c/${conn.id}/catalog${v === 'all' ? '' : `?kind=${encodeURIComponent(v)}`}`);
}

function reset(): void {
  searchTerm = '';
}

function close(): void {
  navigate(`/c/${conn.id}/catalog`);
}

function openInHub(): void {
  if (selected) toast({ type: 'info', title: `Opening ${conn.endpoint}/catalog/${selected.namespace}/${selected.kind.toLowerCase()}/${selected.name}` });
}

function openLink(url: string): void {
  toast({ type: 'info', title: `Opening ${url}` });
}
</script>

{#if selected}
  <DetailsPage title={selected.title ?? selected.name} subtitle="{selected.kind} · {entityRef(selected)}{selected.owner ? ` · owner ${selected.owner}` : ''}" breadcrumbLeftPart="Catalog" breadcrumbRightPart={selected.name} onclose={close} onbreadcrumbClick={close}>
    {#snippet iconSnippet()}<AppIcon icon="icons/redhat.rhdh-local.png" size="28px" />{/snippet}
    {#snippet actionsSnippet()}
      <Button icon={faArrowUpRightFromSquare} onclick={openInHub}>Open in Developer Hub</Button>
    {/snippet}
    {#snippet contentSnippet()}
      <div class="h-full overflow-auto px-5 py-4 space-y-3">
        {#if selected.scaffolderTask}
          <Card inset><p>Created by the scaffolder (task <code>{selected.scaffolderTask}</code>) and registered from <code>catalog-info.yaml</code>.</p></Card>
        {/if}
        <div class="grid grid-cols-2 gap-3">
          <Card title="About">
            {#snippet actions()}{#if selected.lifecycle}<Pill label={selected.lifecycle} tone={selected.lifecycle === 'deprecated' ? 'warning' : selected.lifecycle === 'production' ? 'success' : 'neutral'} />{/if}{/snippet}
            <KeyValue
              rows={[
                ['Description', selected.description],
                ['Kind', selected.kind],
                ['Type', selected.type],
                ['Owner', selected.owner],
                ['System', selected.system],
                ['Provides APIs', selected.providesApis?.join(', ')],
                ['Member of', selected.memberOf?.join(', ')],
              ]} />
          </Card>
          <Card title="Links">
            {#each selected.links ?? [] as l (l.url)}
              <button class="flex items-center gap-2 text-[var(--pd-link)] hover:underline" onclick={openLink.bind(undefined, l.url)}>
                {l.title}: {l.url}
              </button>
            {:else}
              <p>No links.</p>
            {/each}
            {#if selected.annotations}
              <div class="mt-3"><KeyValue labelWidth="w-56" rows={Object.entries(selected.annotations)} /></div>
            {/if}
          </Card>
        </div>
      </div>
    {/snippet}
  </DetailsPage>
{:else}
  <NavPage bind:searchTerm={searchTerm} title="catalog">
    {#snippet additionalActions()}
      <Dropdown id="rhdh-kind" ariaLabel="Kind" value={kind} options={kindOptions} onChange={setKind} class="w-40" />
    {/snippet}
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="catalog entities" />
      {:else}
        <DataTable kind="entities" {rows} total={all.length} {searchTerm} onResetFilter={reset} {key} name={nameOf} {columns} icon={faCubes} emptyMessage="Register a catalog-info.yaml or create a component from a template." />
      {/if}
    {/snippet}
  </NavPage>
{/if}
