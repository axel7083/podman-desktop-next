<script lang="ts">
/** Connection › Subscription (P14): subscription-manager status, register / unregister. */
import { faCircleCheck, faCircleXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ResourceContext } from '#lib/ext/types.ts';
import { startConnection } from '#lib/world.svelte.ts';

import { activationKeys, registerConnection, registrationOf, unregisterConnection } from '../store.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const conn = $derived(ctx.conn);
const reg = $derived(registrationOf(conn.id));
const status = $derived(reg?.status ?? 'Not registered');
const isRhel = $derived(!!conn.capabilities?.includes('rhel'));
let key = $state('podman-desktop');
let target = $state<'rhsm' | 'satellite'>('rhsm');

const keyOptions = $derived(
  target === 'satellite'
    ? [
        { value: 'rhel9-dev', label: 'rhel9-dev (CV RHEL9-Base · Dev)' },
        { value: 'rhel10-dev', label: 'rhel10-dev (CV RHEL10-Base · Dev)' },
      ]
    : activationKeys().map(k => ({ value: k.name, label: `${k.name} (${k.usage} · ${k.serviceLevel})` })),
);

function onTarget(v: string): void {
  target = v === 'satellite' ? 'satellite' : 'rhsm';
  key = target === 'satellite' ? 'rhel9-dev' : 'podman-desktop';
}

function onKey(v: string): void {
  key = v;
}

function register(): void {
  if (conn.status !== 'started') startConnection(conn.id, conn.name);
  registerConnection(conn, key, target);
}

function unregister(): void {
  unregisterConnection(conn);
}

const rows = $derived<[string, string | undefined][]>([
  ['Overall status', status === 'Current' ? 'Registered (Simple Content Access)' : status],
  ['Registered with', reg?.status === 'Current' ? (reg.target === 'satellite' ? 'Satellite · satellite.acme.corp' : 'Red Hat · subscription.rhsm.redhat.com') : undefined],
  ['Organization', reg?.org],
  ['Activation key', reg?.key],
  ['Consumer UUID', reg?.consumerUuid],
  ['Content view', reg?.contentView ? `${reg.contentView} · ${reg.environment}` : undefined],
  ['Registered', reg?.registeredAt ? new Date(reg.registeredAt).toLocaleString() : undefined],
  ['Facts', status === 'Current' ? '/etc/rhsm/facts/podman-desktop-redhat-account-ext.facts' : undefined],
]);
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4 text-[var(--pd-content-card-text)]">
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Subscription status">
    <div class="flex items-center gap-3 mb-3">
      {#if status === 'Current'}
        <span class="text-[var(--pd-state-success)]"><Icon icon={faCircleCheck} size="lg" /></span>
      {:else if status === 'Registering'}
        <Icon icon={faSpinner} size="lg" class="animate-spin" />
      {:else}
        <span class="text-[var(--pd-state-warning)]"><Icon icon={faCircleXmark} size="lg" /></span>
      {/if}
      <div class="grow">
        <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">
          {status === 'Current' ? `${conn.name} is registered` : status === 'Registering' ? `Registering ${conn.name}…` : `${conn.name} is not registered`}
        </h2>
        <div class="text-sm">
          {#if !isRhel}
            Fedora CoreOS machine: subscription-manager is layered with rpm-ostree, registration applies after a restart.
          {:else if status === 'Current'}
            Content from Red Hat CDN, Red Hat Lightspeed (Advisor, Vulnerability) enabled.
          {:else}
            Register to get RHEL content (dnf), Lightspeed Advisor and Vulnerability data.
          {/if}
        </div>
      </div>
      {#if status === 'Current'}
        <Button type="secondary" onclick={unregister}>Unregister</Button>
      {/if}
    </div>
    <table class="w-full">
      <tbody>
        {#each rows.filter(r => r[1]) as [label, value] (label)}
          <tr><td class="py-1 w-48 text-[var(--pd-table-body-text)]">{label}</td><td class="py-1 font-mono text-sm wrap-anywhere">{value}</td></tr>
        {/each}
      </tbody>
    </table>
  </section>

  {#if status === 'Not registered'}
    <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 space-y-3" aria-label="Register">
      <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">Register {conn.name}</h2>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="reg-target" class="font-semibold text-[var(--pd-content-card-header-text)]">Register with</label>
          <Dropdown id="reg-target" value={target} onChange={onTarget} options={[{ value: 'rhsm', label: 'Red Hat (console.redhat.com)' }, { value: 'satellite', label: 'Satellite (satellite.acme.corp)' }]} />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="reg-key" class="font-semibold text-[var(--pd-content-card-header-text)]">Activation key</label>
          <Dropdown id="reg-key" value={key} onChange={onKey} options={keyOptions} />
        </div>
      </div>
      <div class="flex items-center justify-end gap-3">
        {#if conn.status !== 'started'}<span class="text-sm">{conn.name} is stopped: it will be started first.</span>{/if}
        <Button onclick={register}>{conn.status !== 'started' ? 'Start and register' : 'Register'}</Button>
      </div>
    </section>
  {/if}
</div>
