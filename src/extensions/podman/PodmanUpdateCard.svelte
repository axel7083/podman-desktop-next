<script lang="ts">
/** Compact dashboard card (P17): PD's provider update notice as a one-line row. */
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

<!-- compact one-line card: PD's provider update notice, never takes an extension-card slot -->
<div class="flex items-center gap-3 text-sm">
  <AppIcon icon="icons/podman-desktop.podman.png" size="24px" />
  <span class="text-[var(--pd-content-card-header-text)] font-medium">Podman v{state.version}</span>
  <span class="text-[var(--pd-content-card-text)] grow">
    {state.version !== '5.7.0' ? 'Podman 5.7.0 is available.' : 'Podman is up to date.'}
  </span>
  {#if state.version !== '5.7.0'}
    <Button type="link" icon={faCircleArrowUp} inProgress={state.updating} onclick={update}>Update to 5.7.0</Button>
  {/if}
</div>
