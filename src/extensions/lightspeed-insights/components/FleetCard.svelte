<script lang="ts">
/** Dashboard card (P17): Lightspeed fleet health of the systems on this computer. */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate } from '#lib/nav.ts';

import { allRegistrations } from '../../rhel-registration/store.ts';
import { lsStore } from '../data.ts';

const systems = $derived(registry.activeConnections.filter(c => c.capabilities?.includes('rhel') && allRegistrations()[c.id]?.status === 'Current').length);
const hits = $derived(lsStore().advisor.length);
const open = $derived(lsStore().cves.filter(c => c.status_name !== 'Resolved'));
const critical = $derived(open.filter(c => c.impact === 'Critical').length);

function go(): void {
  navigate('/c/rhel10-dev?tab=advisor');
}
</script>

<div class="flex items-start gap-4">
  <AppIcon icon="icons/redhat.lightspeed-insights.png" size="48px" />
  <div class="flex flex-col gap-1 grow">
    <span class="text-lg text-[var(--pd-content-card-header-text)]">Fleet health</span>
    <span class="text-sm text-[var(--pd-content-card-text)]">{systems} registered systems · {hits} Advisor recommendations</span>
    <span class="text-sm {critical ? 'text-[var(--pd-state-error)]' : 'text-[var(--pd-content-card-text)]'}">{open.length} open CVEs{critical ? ` · ${critical} critical` : ''}</span>
  </div>
  <Button type="secondary" onclick={go}>Review</Button>
</div>
