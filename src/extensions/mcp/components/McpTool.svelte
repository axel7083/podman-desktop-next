<script lang="ts">
/** MCP servers tool (P3): Installed / Registry / Clients, server details with tools. */
import { faCloudArrowUp, faDownload, faPlug, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, EmptyScreen, NavPage, StatusIcon, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, StatusCellData } from '#lib/table/types.ts';

import Card from '../../ai-lab/components/ui/Card.svelte';
import Chip from '../../ai-lab/components/ui/Chip.svelte';
import ModelNameCell from '../../ai-lab/components/ui/ModelNameCell.svelte';
import SubTabs from '../../ai-lab/components/ui/SubTabs.svelte';
import { applyMcpServer } from '../../openshift-ai/shared.ts';
import { CLIENTS, type InstalledServer, type McpServerEntry, REGISTRY, shortName } from '../data.ts';
import { entry, mcp, removeServer, TOOL } from '../shared.ts';
import ClientDialog from './ClientDialog.svelte';
import InstallDialog from './InstallDialog.svelte';

const icon = 'icons/podman-desktop.mcp.png';
const serverId = $derived(page.url.searchParams.get('server'));
// svelte-ignore state_referenced_locally
let tab = $state(page.url.searchParams.get('tab') ?? 'installed');
let searchTerm = $state('');
let installing = $state<McpServerEntry>();
let adding = $state<InstalledServer>();

const installed = $derived(mcp().installed);
const results = $derived(REGISTRY.filter(e => `${e.name} ${e.title} ${e.description}`.toLowerCase().includes(searchTerm.toLowerCase())));
const current = $derived(serverId ? installed.find(s => s.id === serverId) : undefined);
const currentEntry = $derived(current ? entry(current.entry) : undefined);
const rhoaiOn = $derived(registry.isEnabled('redhat.openshift-ai'));

function select(id: string): void {
  tab = id;
}

function clientLabel(id: string): string {
  return CLIENTS.find(c => c.id === id)?.label ?? id;
}

const columns = $derived([
  new TableColumn<InstalledServer, StatusCellData>('Status', { width: '70px', align: 'center', renderer: StatusCell, renderMapping: (s): StatusCellData => ({ status: s.status === 'running' ? 'RUNNING' : 'EXITED', icon: faPlug }) }),
  new TableColumn<InstalledServer, { title: string; sub?: string; href?: string; chips: { label: string; tone?: 'secondary' | 'default' }[] }>('Name', {
    width: '2.2fr',
    renderer: ModelNameCell,
    renderMapping: (s) => ({ title: shortName(s.name), sub: s.name, href: `${TOOL}?server=${s.id}`, chips: [{ label: s.kind === 'container' ? 'container' : s.kind === 'process' ? 'local process' : 'remote', tone: 'secondary' }] }),
  }),
  new TableColumn<InstalledServer, string>('Endpoint', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (s): string => (s.kind === 'process' ? `stdio · npx ${s.endpoint}` : s.endpoint) }),
  new TableColumn<InstalledServer, string>('Tools', { renderer: TableSimpleColumn, renderMapping: (s): string => String(entry(s.entry)?.totalTools ?? '') }),
  new TableColumn<InstalledServer, string>('Clients', { width: '1.6fr', renderer: TableSimpleColumn, renderMapping: (s): string => s.clients.map(clientLabel).join(', ') || '–' }),
  new TableColumn<InstalledServer, ActionsCellData>('Actions', {
    align: 'right',
    width: '100px',
    renderer: ActionsCell,
    renderMapping: (s): ActionsCellData => ({
      buttons: [
        { title: 'Add to client', icon: faPlug, onClick: (): void => { adding = s; } },
        { title: 'Remove MCP server', icon: faTrash, onClick: (): void => withConfirmation(() => removeServer(s.id), `remove MCP server ${shortName(s.name)}`, 'Remove MCP server?') },
      ],
      menu: [],
    }),
  }),
]);
const row = new TableRow<InstalledServer>({});

function openInstall(e: McpServerEntry): void {
  installing = e;
}

function closeDialogs(): void {
  installing = undefined;
  adding = undefined;
}

function back(): void {
  navigate(TOOL);
}

function addCurrent(): void {
  adding = current;
}

function deploy(): void {
  if (current && currentEntry) applyMcpServer(shortName(current.name).replace(/-server$/, ''), currentEntry.packages[0].identifier);
}
</script>

{#if serverId && current}
  <DetailsPage title={shortName(current.name)} subtitle={current.name} breadcrumbLeftPart="MCP servers" breadcrumbRightPart={shortName(current.name)} onclose={back} onbreadcrumbClick={back}>
    {#snippet iconSnippet()}<StatusIcon icon={faPlug} size={24} status={current?.status === 'running' ? 'RUNNING' : 'EXITED'} />{/snippet}
    {#snippet actionsSnippet()}
      <div class="flex gap-2">
        <Button icon={faPlug} onclick={addCurrent}>Add to client</Button>
        {#if rhoaiOn && current?.kind === 'container'}<Button type="secondary" icon={faCloudArrowUp} onclick={deploy}>Deploy to rhoai-dev</Button>{/if}
      </div>
    {/snippet}
    {#snippet contentSnippet()}
      <div class="flex flex-col gap-4 p-5 overflow-auto h-full">
        <Card title="Connection">
          <div class="grid grid-cols-[9rem_1fr] gap-y-1">
            <span>Transport</span><span>{current?.kind === 'process' ? 'stdio (local process)' : 'streamable-http'}</span>
            <span>Endpoint</span><span class="font-mono text-[var(--pd-content-card-header-text)]">{current?.endpoint}</span>
            <span>Version</span><span>{currentEntry?.version}</span>
            <span>Clients</span><span class="flex gap-1 flex-wrap">{#each current?.clients ?? [] as c (c)}<Chip label={clientLabel(c)} tone="primary" />{:else}<span>Not added to any client yet</span>{/each}</span>
          </div>
        </Card>
        <Card title="Tools ({currentEntry?.totalTools})">
          <ul class="divide-y divide-[var(--pd-content-divider)]" aria-label="MCP server tools">
            {#each currentEntry?.tools ?? [] as t (t.name)}
              <li class="py-1.5 flex gap-4"><span class="w-60 shrink-0 font-mono text-xs text-[var(--pd-content-card-header-text)]">{t.name}</span><span class="text-xs">{t.description}</span></li>
            {/each}
          </ul>
        </Card>
      </div>
    {/snippet}
  </DetailsPage>
{:else}
  <NavPage bind:searchTerm={searchTerm} title="MCP servers">
    {#snippet tabs()}
      <SubTabs tabs={[{ id: 'installed', label: 'Installed', count: installed.length }, { id: 'registry', label: 'Registry' }, { id: 'clients', label: 'Clients' }]} current={tab} onselect={select} label="MCP views" />
    {/snippet}
    {#snippet content()}
      <div class="flex min-w-full grow overflow-auto">
        {#if tab === 'installed'}
          {#if installed.length}
            {#key columns}
              <Table kind="mcp-installed" data={installed} {columns} {row} defaultSortColumn="Name" key={(s: InstalledServer): string => s.id} label={(s: InstalledServer): string => shortName(s.name)} />
            {/key}
          {:else}
            <EmptyScreen icon={faPlug} title="No MCP server installed" message="Install servers from the official MCP registry." />
          {/if}
        {:else if tab === 'registry'}
          <div class="grid grid-cols-3 gap-4 px-5 py-4 w-full content-start">
            {#each results as e (e.name)}
              {@const isInstalled = installed.some(s => s.entry === e.name)}
              <article class="flex flex-col rounded-md bg-[var(--pd-content-card-bg)] p-4 min-h-40" aria-label={e.name}>
                <div class="flex items-start gap-2">
                  <AppIcon {icon} size="24px" class="rounded-sm" />
                  <div class="grow min-w-0">
                    <h3 class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">{e.title}</h3>
                    <p class="font-mono text-xs truncate text-[var(--pd-content-card-text)]" title={e.name}>{e.name}</p>
                  </div>
                  {#if isInstalled}<Chip label="Installed" tone="success" />{:else}<Button type="secondary" icon={faDownload} aria-label="Install {e.title}" title="Install" onclick={openInstall.bind(undefined, e)} />{/if}
                </div>
                <p class="mt-2 text-xs text-[var(--pd-content-card-text)] line-clamp-2">{e.description}</p>
                <div class="mt-auto pt-3 flex flex-wrap gap-1 items-center">
                  {#each e.packages as p (p.identifier)}<Chip label={p.registryType} tone="secondary" />{/each}
                  {#if e.remote}<Chip label="remote" tone="secondary" />{/if}
                  <Chip label="{e.totalTools} tools" />
                  <span class="grow"></span>
                  <span class="text-xs opacity-70">v{e.version} · {e.publishedAt}</span>
                </div>
              </article>
            {/each}
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-4 px-5 py-4 w-full content-start">
            {#each CLIENTS as c (c.id)}
              <Card title={c.label}>
                <p class="font-mono text-xs mb-2">{c.file}</p>
                <div class="flex flex-wrap gap-1">
                  {#each installed.filter(s => s.clients.includes(c.id)) as s (s.id)}<Chip label={shortName(s.name)} tone="primary" />{:else}<span class="text-xs">No MCP server configured</span>{/each}
                </div>
              </Card>
            {/each}
          </div>
        {/if}
      </div>
    {/snippet}
  </NavPage>
{/if}

{#if installing}<InstallDialog entry={installing} onclose={closeDialogs} />{/if}
{#if adding}<ClientDialog server={adding} onclose={closeDialogs} />{/if}
