<script lang="ts">
/** Dashboard card (P17): Red Hat subscriptions and registered systems. */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { navigate } from '#lib/nav.ts';

import { allRegistrations, subscriptions } from '../store.ts';

const subs = $derived(subscriptions());
const registered = $derived(Object.values(allRegistrations()).filter(r => r.status === 'Current').length);

function open(): void {
  navigate('/settings/rhel-registration');
}
</script>

<div class="flex items-start gap-4">
  <AppIcon icon="icons/redhat.rhel-registration.png" size="48px" />
  <div class="flex flex-col gap-1 grow min-w-0">
    <span class="text-lg text-[var(--pd-content-card-header-text)]">{registered} systems registered</span>
    {#each subs as s (s.sku)}
      <div class="text-sm text-[var(--pd-content-card-text)] truncate">
        <span class={s.status === 'Active' ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-state-warning)]'}>●</span>
        {s.name.replace('Red Hat ', '')} · {s.consumed}/{s.quantity} · {s.status === 'Active' ? `renews ${s.endDate}` : `ends ${s.endDate}`}
      </div>
    {/each}
  </div>
  <Button type="secondary" onclick={open}>Manage</Button>
</div>
