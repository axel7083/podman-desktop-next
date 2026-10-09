<script lang="ts">
/** Settings › RHEL registration: registration of the RHEL systems on this computer (keys and subscriptions: Settings › Red Hat account). */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { href, navigate, STATUS_LABEL } from '#lib/nav.ts';
import { plural } from '#lib/util.ts';

import { activationKeys, allRegistrations, ORG_ID, subscriptions } from '../store.ts';

const keys = $derived(activationKeys());
const subs = $derived(subscriptions());
const regs = $derived(allRegistrations());
const systems = $derived(registry.activeConnections.filter(c => c.capabilities?.includes('rhel')));

function openAccount(): void {
  navigate('/settings/redhat-account');
}

</script>

<div class="space-y-6 text-[var(--pd-invert-content-card-text)]">
  <section aria-label="Account" class="bg-[var(--pd-invert-content-card-bg)] rounded-md p-4 flex items-center gap-3">
    <AppIcon icon="icons/redhat.redhat-authentication.png" size="24px" />
    <span class="grow">
      Systems register with the activation keys of your Red Hat account (org {ORG_ID}): {plural(keys.length, 'key')}, {plural(subs.length, 'subscription')}.
    </span>
    <Button type="secondary" onclick={openAccount}>Manage activation keys</Button>
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
