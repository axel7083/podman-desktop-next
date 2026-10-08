<script lang="ts">
/** Dashboard card (P17): latest Image Builder compose. */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { navigate } from '#lib/nav.ts';

import { ibStore } from '../data.ts';
import ComposeStatusCell from './ComposeStatusCell.svelte';

const latest = $derived(ibStore().composes.toSorted((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3));

function open(): void {
  navigate('/tools/image-builder?tab=images');
}
</script>

<div class="flex items-start gap-4">
  <AppIcon icon="icons/redhat.image-builder.png" size="48px" />
  <div class="flex flex-col gap-1 grow min-w-0">
    <span class="text-lg text-[var(--pd-content-card-header-text)]">Image Builder</span>
    {#each latest as c (c.id)}
      <div class="flex items-center gap-2 text-sm text-[var(--pd-content-card-text)]">
        <span class="w-24"><ComposeStatusCell object={c.image_status.status} /></span>
        <span class="truncate">{c.blueprint} v{c.blueprint_version}</span>
      </div>
    {/each}
  </div>
  <Button type="secondary" onclick={open}>Open</Button>
</div>
