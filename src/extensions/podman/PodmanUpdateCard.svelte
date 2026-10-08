<script lang="ts">
/** Dashboard card (P17) – mirrors PD's dashboard provider card with an update action. */
import { faCircleArrowUp } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { extData, runTask } from '#lib/world.svelte.ts';

const state = extData<{ version: string; updating: boolean }>('podman-desktop.podman', 'cli', { version: '5.6.2', updating: false });

function update(): void {
  state.updating = true;
  runTask({
    name: 'Update Podman to 5.7.0',
    ext: 'podman-desktop.podman',
    steps: [
      { label: 'Downloading podman-installer-5.7.0', ms: 2500 },
      { label: 'Installing', ms: 1500 },
    ],
    onDone: () => {
      state.version = '5.7.0';
      state.updating = false;
    },
  });
}
</script>

<div class="flex items-center gap-4">
  <AppIcon icon="icons/podman-desktop.podman.png" size="56px" />
  <div class="flex flex-col gap-1 grow">
    <div class="flex items-baseline gap-2">
      <span class="text-lg text-[var(--pd-content-card-header-text)]">Podman</span>
      <span class="text-sm text-[var(--pd-content-card-title)]">v{state.version}</span>
    </div>
    <div class="flex items-center gap-1.5 text-sm text-[var(--pd-status-running)]">
      <span class="w-2.5 h-2.5 rounded-full bg-[var(--pd-status-running)]"></span>RUNNING
    </div>
  </div>
  {#if state.version !== '5.7.0'}
    <Button icon={faCircleArrowUp} inProgress={state.updating} onclick={update}>Update to 5.7.0</Button>
  {/if}
</div>
