<script lang="ts">
/** Playground environments (AI Lab Playgrounds.svelte) + New playground dialog with a provider picker. */
import { faMessage, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import Dialog from '#lib/components/Dialog.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import { navigate } from '#lib/nav.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import type { ActionsCellData } from '#lib/table/types.ts';
import { humanAge, timeAgo } from '#lib/world.svelte.ts';

import { ai, createPlayground, deletePlayground, type Playground, providerModelLabel, providers, toolHref } from '../../shared.ts';
import ModelNameCell from '../ui/ModelNameCell.svelte';

const list = $derived(ai().playgrounds);
const all = $derived(providers());

// svelte-ignore state_referenced_locally
let open = $state(!!page.url.searchParams.get('new'));
let name = $state('acme-support playground');
// svelte-ignore state_referenced_locally
let providerId = $state(page.url.searchParams.get('provider') ?? all[0]?.id ?? '');
const provider = $derived(all.find(p => p.id === providerId));
// svelte-ignore state_referenced_locally
let modelName = $state(page.url.searchParams.get('new') ?? '');

$effect(() => {
  if (provider && !provider.models.includes(modelName)) modelName = provider.models[0] ?? '';
});

const columns = [
  new TableColumn<Playground, { title: string; sub?: string; href?: string; chips: { label: string }[] }>('Name', {
    width: '2fr',
    renderer: ModelNameCell,
    renderMapping: (p) => ({ title: p.name, sub: `${p.messages.filter(m => m.role === 'user').length} messages`, href: toolHref('playground', { id: p.id }), chips: [] }),
  }),
  new TableColumn<Playground, string>('Provider', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (p): string => all.find(x => x.id === p.providerId)?.label ?? 'Provider not running' }),
  new TableColumn<Playground, string>('Model', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (p): string => providerModelLabel(all.find(x => x.id === p.providerId), p.model) }),
  new TableColumn<Playground, string>('Updated', { renderer: TableSimpleColumn, renderMapping: (p): string => timeAgo(p.updated) }),
  new TableColumn<Playground, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    renderMapping: (p): ActionsCellData => ({
      buttons: [{ title: 'Delete playground', icon: faTrash, onClick: (): void => withConfirmation(() => deletePlayground(p.id), `delete playground ${p.name}`, 'Delete playground?') }],
      menu: [],
    }),
  }),
];
const row = new TableRow<Playground>({});

function show(): void {
  open = true;
}

function close(): void {
  open = false;
}

function create(): void {
  const id = createPlayground(name, providerId, modelName);
  open = false;
  navigate(toolHref('playground', { id }));
}
</script>

<NavPage title="Playground environments" searchEnabled={false}>
  {#snippet additionalActions()}<Button icon={faPlus} onclick={show}>New Playground</Button>{/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if list.length}
        <Table kind="ai-playgrounds" data={list} {columns} {row} defaultSortColumn="Name" key={(p: Playground): string => p.id} label={(p: Playground): string => p.name} />
      {:else}
        <EmptyScreen icon={faMessage} title="No playground environment" message="Playground environments allow for experimenting with available models in a local environment." />
      {/if}
    </div>
  {/snippet}
</NavPage>

{#if open}
  <Dialog title="New playground" onclose={close}>
    {#snippet content()}
      <div class="flex flex-col gap-3 text-sm">
        <label>Playground name <Input class="mt-1" aria-label="Playground name" bind:value={name} /></label>
        <label>Inference provider
          <Dropdown class="mt-1" ariaLabel="Inference provider" bind:value={providerId} options={all.map(p => ({ value: p.id, label: `${p.label} (${p.kind})` }))} />
        </label>
        <label>Model
          <Dropdown class="mt-1" ariaLabel="Model" bind:value={modelName} options={(provider?.models ?? []).map(m => ({ value: m, label: providerModelLabel(provider, m) }))} />
        </label>
        {#if provider?.quota}
          <p class="text-xs">Requests count against the token quota of <b>{provider.quota.subscription}</b>: {provider.quota.used.toLocaleString('en-US')} / {provider.quota.limit.toLocaleString('en-US')} tokens per {provider.quota.window}.</p>
        {/if}
      </div>
    {/snippet}
    {#snippet buttons()}
      <Button type="link" onclick={close}>Cancel</Button>
      <Button onclick={create} disabled={!providerId || !modelName}>Create playground</Button>
    {/snippet}
  </Dialog>
{/if}
