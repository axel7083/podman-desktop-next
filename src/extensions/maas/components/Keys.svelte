<script lang="ts">
/** MaaS › API keys: create (shown once, optionally stored as a Podman secret), revoke. */
import { faKey, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, Input, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';

import Dialog from '#lib/components/Dialog.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, StatusCellData } from '#lib/table/types.ts';
import { hexId, runTask, toast, uid, world } from '#lib/world.svelte.ts';

import CodeBlock from '../../ai-lab/components/ui/CodeBlock.svelte';
import { ENGINE, MAAS } from '../../ai-lab/shared.ts';
import type { ApiKey, MaasState } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const keys = $derived(((world.ext[MAAS] as unknown as MaasState | undefined)?.keys ?? []) as ApiKey[]);
let open = $state(false);
let name = $state('acme-support-assistant-dev');
let expiration = $state('90d');
let storeSecret = $state(true);
let created = $state<string>();

function revoke(k: ApiKey): void {
  withConfirmation(
    () => {
      k.status = 'revoked';
      toast({ type: 'success', title: `API key ${k.name} revoked` });
    },
    `revoke API key ${k.name}`,
    'Revoke API key?',
  );
}

function show(): void {
  open = true;
  created = undefined;
}

function close(): void {
  open = false;
}

function toggleSecret(checked: boolean): void {
  storeSecret = checked;
}

function create(): void {
  const secret = `sk-oai-${hexId(40)}`;
  runTask({
    name: `Creating API key ${name}`,
    ext: MAAS,
    steps: [{ label: 'POST /maas-api/v1/api-keys', ms: 700 }, ...(storeSecret ? [{ label: 'podman secret create maas-api-key -', ms: 400 }] : [])],
    onDone: () => {
      const st = world.ext[MAAS] as unknown as MaasState;
      st.keys.unshift({ id: crypto.randomUUID(), name, subscription: 'premium-ai-team', creationDate: new Date().toISOString(), expirationDate: new Date(Date.now() + 90 * 86400_000).toISOString(), status: 'active' });
      if (storeSecret) world.secrets.push({ id: uid('secret'), name: 'maas-api-key', engineId: ENGINE, created: Date.now(), driver: 'file' });
      created = secret;
    },
  });
}

const columns = [
  new TableColumn<ApiKey, StatusCellData>('Status', { width: '70px', align: 'center', renderer: StatusCell, renderMapping: (k): StatusCellData => ({ status: k.status === 'active' ? 'RUNNING' : 'EXITED', icon: faKey }) }),
  new TableColumn<ApiKey, string>('Name', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (k): string => k.name }),
  new TableColumn<ApiKey, string>('Subscription', { renderer: TableSimpleColumn, renderMapping: (k): string => k.subscription }),
  new TableColumn<ApiKey, string>('Expires', { renderer: TableSimpleColumn, renderMapping: (k): string => k.expirationDate?.slice(0, 10) ?? 'never' }),
  new TableColumn<ApiKey, string>('Last used', { renderer: TableSimpleColumn, renderMapping: (k): string => k.lastUsedAt?.slice(0, 16).replace('T', ' ') ?? '–' }),
  new TableColumn<ApiKey, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    renderMapping: (k): ActionsCellData => ({ buttons: [{ title: 'Revoke API key', icon: faTrash, enabled: k.status === 'active', onClick: (): void => revoke(k) }], menu: [] }),
  }),
];
const row = new TableRow<ApiKey>({});
</script>

<NavPage title="API keys" searchEnabled={false}>
  {#snippet additionalActions()}<Button icon={faPlus} onclick={show}>Create API key</Button>{/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#key keys.length}
        <Table kind="maas-keys" data={keys} {columns} {row} defaultSortColumn="Name" key={(k: ApiKey): string => k.id} label={(k: ApiKey): string => k.name} />
      {/key}
    </div>
  {/snippet}
</NavPage>

{#if open}
  <Dialog title="Create API key" onclose={close}>
    {#snippet content()}
      {#if created}
        <div class="flex flex-col gap-3 text-sm">
          <p>Copy the key now, it is shown only once.</p>
          <CodeBlock wrap code={created} label="API key" />
          {#if storeSecret}<p>Stored as Podman secret <span class="font-mono">maas-api-key</span>; inject it with <span class="font-mono">--secret maas-api-key,type=env,target=OPENAI_API_KEY</span>.</p>{/if}
        </div>
      {:else}
        <div class="flex flex-col gap-3 text-sm">
          <label>Name <Input class="mt-1" aria-label="API key name" bind:value={name} /></label>
          <label>Expiration <Dropdown class="mt-1" ariaLabel="Expiration" bind:value={expiration} options={[{ value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }, { value: 'never', label: 'Never' }]} /></label>
          <Checkbox checked={storeSecret} onclick={toggleSecret} title="Store as Podman secret">Store as Podman secret maas-api-key</Checkbox>
        </div>
      {/if}
    {/snippet}
    {#snippet buttons()}
      {#if created}
        <Button onclick={close}>Done</Button>
      {:else}
        <Button type="link" onclick={close}>Cancel</Button>
        <Button onclick={create}>Create</Button>
      {/if}
    {/snippet}
  </Dialog>
{/if}
