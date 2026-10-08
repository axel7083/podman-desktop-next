<script lang="ts">
/** Dashboard card (P17): organization clusters at a glance. */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate } from '#lib/nav.ts';

import { CLUSTERS } from '../data.ts';

const connected = $derived(CLUSTERS.filter(c => registry.getConnection(c.name)?.status === 'started').length);
const upgrades = $derived(CLUSTERS.filter(c => c.available_upgrade));

function open(): void {
  navigate('/tools/openshift-cluster-manager');
}
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3">
    <AppIcon icon="icons/redhat.openshift-cluster-manager.svg" size="32px" />
    <div class="flex flex-col grow">
      <span class="text-lg text-[var(--pd-content-card-header-text)]">OpenShift clusters</span>
      <span class="text-sm text-[var(--pd-content-card-title)]">{CLUSTERS.length} in your organization · {connected} connected</span>
    </div>
    <Button type="secondary" onclick={open}>View all</Button>
  </div>
  <ul class="text-sm text-[var(--pd-content-card-text)] flex flex-col gap-1">
    {#each CLUSTERS as c (c.id)}
      <li class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full {registry.getConnection(c.name)?.status === 'started' ? 'bg-[var(--pd-status-running)]' : c.state === 'installing' ? 'bg-[var(--pd-status-starting)]' : 'bg-[var(--pd-status-stopped)]'}"></span>
        <span class="grow">{c.name}</span>
        <span class="text-[var(--pd-content-card-title)]">{c.state === 'ready' ? `${c.openshift_version}${registry.getConnection(c.name)?.status === 'started' ? '' : ' · not connected'}` : c.state}</span>
      </li>
    {/each}
  </ul>
  {#if upgrades.length}<span class="text-sm text-[var(--pd-content-card-text)]">{upgrades.length} upgrade available: {upgrades.map(u => `${u.name} → ${u.available_upgrade}`).join(', ')}</span>{/if}
</div>
