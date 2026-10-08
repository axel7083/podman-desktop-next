<script lang="ts">
/** Dashboard card (P17): RHEL systems on this computer and their registration. Subscriptions live on the Red Hat account card. */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate } from '#lib/nav.ts';
import { plural } from '#lib/util.ts';

import { allRegistrations } from '../store.ts';

const systems = $derived(registry.activeConnections.filter(c => c.capabilities?.includes('rhel')));
const registered = $derived(systems.filter(c => allRegistrations()[c.id]?.status === 'Current').length);

function open(): void {
  navigate('/settings/rhel-registration');
}
</script>

<div class="flex items-start gap-4">
  <AppIcon icon="icons/redhat.rhel-registration.png" size="48px" />
  <div class="flex flex-col gap-1 grow min-w-0">
    <span class="text-lg text-[var(--pd-content-card-header-text)]">{registered} of {plural(systems.length, 'RHEL system')} registered</span>
    {#each systems as c (c.id)}
      {@const r = allRegistrations()[c.id]}
      <div class="text-sm text-[var(--pd-content-card-text)] truncate">
        <span class={r?.status === 'Current' ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-state-warning)]'}>●</span>
        {c.name} · {r?.status === 'Current' ? `key ${r.key}` : (r?.status ?? 'Not registered')}
      </div>
    {/each}
  </div>
  <Button type="secondary" onclick={open}>Manage</Button>
</div>
