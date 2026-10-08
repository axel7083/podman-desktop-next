<script lang="ts">
/**
 * Settings › Red Hat account: organization, registry service account,
 * activation keys (RHSM) with "Create activation key", subscriptions.
 */
import { faKey, faPlusCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, Input } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import Dialog from '#lib/components/Dialog.svelte';
import ListItemButtonIcon from '#lib/components/ListItemButtonIcon.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import { navigate } from '#lib/nav.ts';
import { runTask, toast, world } from '#lib/world.svelte.ts';

import { type ActivationKey, REGISTRY_SERVICE_ACCOUNT, SESSION, SSO_PROVIDER_ID } from '../data.ts';
import { activationKeys, addActivationKey, removeActivationKey, subscriptions } from '../store.ts';

const ID = 'redhat.redhat-authentication';
const keys = $derived(activationKeys());
const subs = $derived(subscriptions());
const signedIn = $derived(world.accounts[SSO_PROVIDER_ID] ?? true);

let creating = $state(false);
let name = $state('');
let role = $state<ActivationKey['role']>('Red Hat Enterprise Linux Server');
let usage = $state<ActivationKey['usage']>('Development/Test');
let serviceLevel = $state<ActivationKey['serviceLevel']>('Self-Support');
const duplicate = $derived(keys.some(k => k.name === name.trim()));

function openCreate(): void {
  name = '';
  creating = true;
}

function closeCreate(): void {
  creating = false;
}

function onName(e: Event): void {
  name = (e.currentTarget as HTMLInputElement).value;
}

function create(): void {
  const key: ActivationKey = { id: String(38600 + keys.length), name: name.trim(), role, usage, serviceLevel, releaseVersion: '', additionalRepositories: [] };
  creating = false;
  runTask({
    name: `Create activation key ${key.name}`,
    ext: ID,
    steps: [{ label: 'POST https://console.redhat.com/api/rhsm/v2/activation_keys', ms: 900 }],
    onDone: () => addActivationKey(key),
  });
}

function remove(k: ActivationKey): void {
  withConfirmation(
    () => {
      removeActivationKey(k.name);
      toast({ type: 'success', title: `Activation key ${k.name} deleted` });
    },
    `delete activation key ${k.name}`,
    'Delete activation key?',
  );
}

function setRole(v: string): void {
  role = v as ActivationKey['role'];
}
function setUsage(v: string): void {
  usage = v as ActivationKey['usage'];
}
function setSla(v: string): void {
  serviceLevel = v as ActivationKey['serviceLevel'];
}
function accounts(): void {
  navigate('/accounts');
}
</script>

<div class="flex flex-col gap-5 text-[var(--pd-invert-content-card-text)]">
  <section class="bg-[var(--pd-invert-content-card-bg)] rounded-md p-4" aria-label="Organization">
    <h2 class="font-semibold text-[var(--pd-invert-content-card-header-text)] mb-2">Organization</h2>
    {#if signedIn}
      <table class="w-full text-sm">
        <tbody>
          {#each [['Signed in as', SESSION.account.label], ['Organization ID', SESSION.organizationId], ['Account number', SESSION.accountNumber], ['Scopes', SESSION.scopes.join(', ')], ['Registry service account', `${REGISTRY_SERVICE_ACCOUNT.name} (${REGISTRY_SERVICE_ACCOUNT.username}) → ${REGISTRY_SERVICE_ACCOUNT.registry}`]] as [label, value] (label)}
            <tr><td class="py-1 w-56">{label}</td><td class="py-1 wrap-anywhere">{value}</td></tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="flex items-center gap-3"><span class="grow">You are signed out of Red Hat SSO.</span><Button onclick={accounts}>Sign in</Button></div>
    {/if}
  </section>

  <section class="bg-[var(--pd-invert-content-card-bg)] rounded-md p-4" aria-label="Activation keys">
    <div class="flex items-center mb-2">
      <h2 class="grow font-semibold text-[var(--pd-invert-content-card-header-text)]">Activation keys</h2>
      <Button icon={faPlusCircle} disabled={!signedIn} onclick={openCreate}>Create activation key</Button>
    </div>
    <p class="text-sm mb-2">Used to register Podman machines and RHEL VMs with <code>subscription-manager register --activationkey</code>. Registration status per system: Settings › RHEL registration.</p>
    <div class="grid grid-cols-[1.4fr_2fr_1.2fr_1fr_0.6fr_40px] px-2 py-1.5 text-xs uppercase font-semibold text-[var(--pd-table-header-text)] border-b border-[var(--pd-content-divider)]">
      <span>Name</span><span>Role</span><span>Usage</span><span>Service level</span><span>Release</span><span></span>
    </div>
    {#each keys as k (k.id)}
      <div class="grid grid-cols-[1.4fr_2fr_1.2fr_1fr_0.6fr_40px] items-center px-2 py-1.5 text-sm border-b last:border-b-0 border-[var(--pd-content-divider)]">
        <span class="flex items-center gap-2 font-semibold text-[var(--pd-invert-content-card-header-text)]"><Icon icon={faKey} />{k.name}</span>
        <span>{k.role}</span><span>{k.usage}</span><span>{k.serviceLevel}</span><span>{k.releaseVersion || '—'}</span>
        <span class="flex justify-end"><ListItemButtonIcon title="Delete activation key" icon={faTrash} onClick={remove.bind(undefined, k)} enabled={k.name !== 'podman-desktop'} /></span>
      </div>
    {/each}
  </section>

  <section class="bg-[var(--pd-invert-content-card-bg)] rounded-md p-4" aria-label="Subscriptions">
    <h2 class="font-semibold text-[var(--pd-invert-content-card-header-text)] mb-2">Subscriptions</h2>
    {#each subs as s (s.sku)}
      <div class="flex items-center gap-3 py-1.5 text-sm border-b last:border-b-0 border-[var(--pd-content-divider)]">
        <span class="w-20 font-mono">{s.sku}</span><span class="grow">{s.name}</span><span class="tabular-nums">{s.consumed} / {s.quantity} used</span><span class="w-36 text-right">{s.status} · {s.endDate}</span>
      </div>
    {/each}
  </section>
</div>

{#if creating}
  <Dialog title="Create activation key" onclose={closeCreate}>
    {#snippet content()}
      <div class="flex flex-col gap-3 w-[28rem]">
        <label class="flex flex-col gap-1" for="ak-name">Name<Input id="ak-name" value={name} oninput={onName} placeholder="ci-runners" aria-label="Activation key name" error={duplicate ? 'Activation key name already exists' : undefined} /></label>
        <span class="flex flex-col gap-1">Role<Dropdown ariaLabel="Role" value={role} onChange={setRole} options={[{ value: 'Red Hat Enterprise Linux Server', label: 'Red Hat Enterprise Linux Server' }, { value: 'Red Hat Enterprise Linux Workstation', label: 'Red Hat Enterprise Linux Workstation' }, { value: 'Red Hat Enterprise Linux Compute Node', label: 'Red Hat Enterprise Linux Compute Node' }]} /></span>
        <span class="flex flex-col gap-1">Usage<Dropdown ariaLabel="Usage" value={usage} onChange={setUsage} options={[{ value: 'Production', label: 'Production' }, { value: 'Development/Test', label: 'Development/Test' }, { value: 'Disaster Recovery', label: 'Disaster Recovery' }]} /></span>
        <span class="flex flex-col gap-1">Service level<Dropdown ariaLabel="Service level" value={serviceLevel} onChange={setSla} options={[{ value: 'Premium', label: 'Premium' }, { value: 'Standard', label: 'Standard' }, { value: 'Self-Support', label: 'Self-Support' }]} /></span>
      </div>
    {/snippet}
    {#snippet buttons()}
      <Button type="link" onclick={closeCreate}>Cancel</Button>
      <Button disabled={!name.trim() || duplicate} onclick={create}>Create</Button>
    {/snippet}
  </Dialog>
{/if}
