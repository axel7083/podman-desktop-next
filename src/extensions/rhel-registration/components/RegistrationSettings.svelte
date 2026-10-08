<script lang="ts">
/** Settings › RHEL registration: activation keys (create), subscriptions, registered systems. */
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, Input } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { href, STATUS_LABEL } from '#lib/nav.ts';
import { toast } from '#lib/world.svelte.ts';

import { activationKeys, addActivationKey, allRegistrations, subscriptions } from '../store.ts';

let creating = $state(false);
let name = $state('');
let role = $state('Red Hat Enterprise Linux Server');
let usage = $state('Development/Test');
let sla = $state('Self-Support');

const keys = $derived(activationKeys());
const subs = $derived(subscriptions());
const regs = $derived(allRegistrations());
const duplicate = $derived(keys.some(k => k.name === name.trim()));
const systems = $derived(registry.activeConnections.filter(c => c.capabilities?.includes('rhel') || c.capabilities?.includes('machine')));

function startCreate(): void {
  creating = true;
  name = 'qa-runners';
}

function cancel(): void {
  creating = false;
}

function onName(e: Event): void {
  name = (e.currentTarget as HTMLInputElement).value;
}

function setRole(v: string): void {
  role = v;
}

function setUsage(v: string): void {
  usage = v;
}

function setSla(v: string): void {
  sla = v;
}

function save(): void {
  addActivationKey({ id: String(38600 + keys.length), name: name.trim(), role, usage, serviceLevel: sla, releaseVersion: '', additionalRepositories: [] });
  toast({ type: 'success', title: `Activation key ${name.trim()} created`, body: 'It is now available in the RHEL machine and VM wizards.' });
  creating = false;
}

const COLS = 'grid grid-cols-[1.4fr_2fr_1.3fr_1fr_0.7fr] gap-2';
</script>

<div class="space-y-6 text-[var(--pd-invert-content-card-text)]">
  <section aria-label="Activation keys">
    <div class="flex items-center mb-2">
      <h2 class="grow text-lg font-semibold text-[var(--pd-invert-content-header-text)]">Activation keys</h2>
      <Button icon={faPlusCircle} onclick={startCreate} disabled={creating}>Create activation key</Button>
    </div>
    <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md">
      <div class="{COLS} px-4 py-2 text-xs uppercase font-semibold text-[var(--pd-table-header-text)] border-b border-[var(--pd-content-divider)]">
        <span>Name</span><span>Role</span><span>Usage</span><span>Service level</span><span>Release</span>
      </div>
      {#each keys as k (k.id)}
        <div class="{COLS} items-center px-4 py-2.5 border-b last:border-b-0 border-[var(--pd-content-divider)]">
          <span class="font-semibold text-[var(--pd-invert-content-card-header-text)]">{k.name}</span>
          <span>{k.role}</span><span>{k.usage}</span><span>{k.serviceLevel}</span><span>{k.releaseVersion || 'Not set'}</span>
        </div>
      {/each}
      {#if creating}
        <div class="px-4 py-3 space-y-3 border-t border-[var(--pd-content-divider)]" aria-label="New activation key">
          <div class="grid grid-cols-4 gap-3">
            <div class="flex flex-col gap-1">
              <label for="ak-name" class="text-sm font-semibold">Name</label>
              <Input id="ak-name" value={name} oninput={onName} error={duplicate ? 'Activation key name already exists' : undefined} />
            </div>
            <div class="flex flex-col gap-1">
              <label for="ak-role" class="text-sm font-semibold">Role</label>
              <Dropdown id="ak-role" value={role} onChange={setRole} options={[{ value: 'Red Hat Enterprise Linux Server', label: 'Server' }, { value: 'Red Hat Enterprise Linux Workstation', label: 'Workstation' }, { value: 'Red Hat Enterprise Linux Compute Node', label: 'Compute Node' }]} />
            </div>
            <div class="flex flex-col gap-1">
              <label for="ak-usage" class="text-sm font-semibold">Usage</label>
              <Dropdown id="ak-usage" value={usage} onChange={setUsage} options={['Production', 'Development/Test', 'Disaster Recovery'].map(v => ({ value: v, label: v }))} />
            </div>
            <div class="flex flex-col gap-1">
              <label for="ak-sla" class="text-sm font-semibold">Service level</label>
              <Dropdown id="ak-sla" value={sla} onChange={setSla} options={['Premium', 'Standard', 'Self-Support'].map(v => ({ value: v, label: v }))} />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button type="link" onclick={cancel}>Cancel</Button>
            <Button onclick={save} disabled={!name.trim() || duplicate}>Create</Button>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <section aria-label="Subscriptions">
    <h2 class="text-lg font-semibold text-[var(--pd-invert-content-header-text)] mb-2">Subscriptions</h2>
    <div class="grid grid-cols-2 gap-3">
      {#each subs as s (s.sku)}
        <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md p-4">
          <div class="flex items-start gap-2">
            <span class="grow font-semibold text-[var(--pd-invert-content-card-header-text)]">{s.name}</span>
            <span class="rounded-sm px-1.5 text-xs font-semibold {s.status === 'Active' ? 'bg-[var(--pd-state-success)]' : 'bg-[var(--pd-state-warning)]'} text-[var(--pd-status-contrast)]">{s.status}</span>
          </div>
          <div class="text-sm mt-1">SKU {s.sku} · {s.consumed}/{s.quantity} systems · ends {s.endDate}</div>
          <div class="mt-2 h-1.5 rounded-full bg-[var(--pd-content-card-inset-bg)] overflow-hidden">
            <div class="h-full bg-[var(--pd-button-primary-bg)]" style:width="{Math.round((s.consumed / s.quantity) * 100)}%"></div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section aria-label="Registered systems">
    <h2 class="text-lg font-semibold text-[var(--pd-invert-content-header-text)] mb-2">Systems on this computer</h2>
    <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md">
      {#each systems as c (c.id)}
        {@const r = regs[c.id]}
        <div class="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 border-[var(--pd-content-divider)]">
          <AppIcon icon={c.icon} size="18px" />
          <a class="font-semibold text-[var(--pd-link)] w-48" href={href(`/c/${c.id}?tab=subscription`)}>{c.name}</a>
          <span class="w-28 text-sm">{c.providerName} · {STATUS_LABEL[c.status]}</span>
          <span class="grow text-sm">{r?.status === 'Current' ? `Registered · key ${r.key} · ${r.target === 'satellite' ? 'Satellite' : 'Red Hat'}` : (r?.status ?? 'Not registered')}</span>
          <span class="font-mono text-xs opacity-80">{r?.consumerUuid ?? ''}</span>
        </div>
      {/each}
    </div>
  </section>
</div>
