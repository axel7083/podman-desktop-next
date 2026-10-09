<script lang="ts">
/** Inline icon buttons + ⋮ (opens the shared P13 context menu). */
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { openMenu } from '../live.svelte.ts';
import type { LabRow } from './types.ts';

interface Props {
  object: LabRow;
}

let { object }: Props = $props();
</script>

<div class="flex items-center justify-end gap-0.5 text-[var(--pd-action-button-details-text)]">
  {#each object.buttons as b (b.title)}
    <button
      type="button"
      title={b.title}
      aria-label={b.title}
      disabled={b.enabled === false}
      class="w-7 h-7 rounded-md text-[13px] {b.enabled === false ? 'opacity-30' : b.danger ? 'hover:text-[var(--pd-status-dead)] hover:bg-[var(--pd-action-button-details-bg)]' : 'hover:text-[var(--pd-action-button-details-hover-text)] hover:bg-[var(--pd-action-button-details-bg)]'}"
      onclick={(e): void => {
        e.stopPropagation();
        b.run();
      }}><AppIcon icon={b.icon} size="xs" /></button>
  {/each}
  {#if object.menu}
    <button
      type="button"
      title="More actions"
      aria-label="More actions for {object.title}"
      class="w-7 h-7 rounded-md text-[13px] hover:text-[var(--pd-action-button-details-hover-text)] hover:bg-[var(--pd-action-button-details-bg)]"
      onclick={(e): void => openMenu(e, object.menu!())}><AppIcon icon={faEllipsisVertical} size="xs" /></button>
  {/if}
</div>
