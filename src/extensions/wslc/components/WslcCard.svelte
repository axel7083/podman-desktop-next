<script lang="ts">
/** Dashboard card (P17): WSL Containers detected, sessions, containers, VPN hint. */
import { faCircleInfo, faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { navigate, STATUS_DOT_CLASS } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import { WSL_INFO } from '../data.ts';

const sessions = $derived(registry.activeConnections.filter(c => c.engineType === 'wslc'));
const podman = $derived(registry.activeConnections.find(c => c.id === 'podman-machine-default'));

function containers(id: string): { total: number; running: number } {
  const mine = world.containers.filter(c => c.engineId === id);
  return { total: mine.length, running: mine.filter(c => c.state === 'RUNNING').length };
}

function open(id: string): void {
  navigate(`/c/${id}`);
}
</script>

<div class="flex flex-col gap-3" aria-label="WSL Containers">
  <div class="flex items-center gap-4">
    <AppIcon icon="icons/podman-desktop.wslc.png" size="48px" />
    <div class="flex flex-col gap-0.5 grow">
      <div class="flex items-baseline gap-2">
        <span class="text-lg text-[var(--pd-content-card-header-text)]">WSL Containers</span>
        <span class="text-sm text-[var(--pd-content-card-title)]">WSL {WSL_INFO.version} · kernel {WSL_INFO.kernel}</span>
      </div>
      <span class="text-sm text-[var(--pd-status-running)]">Detected: wslc.exe is available</span>
    </div>
  </div>
  <div class="flex flex-wrap gap-2" aria-label="WSLC sessions">
    {#each sessions as s (s.id)}
      {@const n = containers(s.id)}
      <Button type="secondary" onclick={open.bind(undefined, s.id)} title="Open {s.name}">
        <span class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full {STATUS_DOT_CLASS[s.status]}"></span>
          {s.name}
          <span class="text-xs text-[var(--pd-content-card-light-title)]">{s.status === 'started' ? `${n.running}/${n.total} containers running` : s.status}</span>
        </span>
      </Button>
    {/each}
  </div>
  <div class="flex items-start gap-2 text-sm text-[var(--pd-content-card-text)]">
    <Icon icon={faNetworkWired} class="mt-0.5 text-[var(--pd-state-info)]" />
    <span>Consommé networking routes through Windows — VPN friendly. Run VPN-sensitive containers (databases, internal APIs) on WSLC on VPN days.</span>
  </div>
  {#if podman}
    <div class="flex items-start gap-2 text-sm text-[var(--pd-content-card-text)]">
      <Icon icon={faCircleInfo} class="mt-0.5 text-[var(--pd-content-card-icon)]" />
      <span>Podman machine runs in WSL 2 ({podman.name}); WSLC sessions run in their own Hyper-V VM.</span>
    </div>
  {/if}
</div>
