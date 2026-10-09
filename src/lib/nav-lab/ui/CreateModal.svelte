<script lang="ts">
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { CONNECTIONS } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ConnIcon from './ConnIcon.svelte';

let target = $state('podman-machine-default');
</script>

{#if lab.createOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--pd-modal-fade)]" role="presentation" onclick={(): void => { lab.createOpen = false; }}>
    <div role="dialog" aria-label={lab.createContext} tabindex="-1" class="w-[32rem] rounded-xl bg-[var(--pd-modal-bg)] border border-[var(--pd-modal-border)] shadow-xl text-[var(--pd-modal-text)]" onclick={(e): void => e.stopPropagation()} onkeydown={(e): void => { if (e.key === 'Escape') lab.createOpen = false; }}>
      <div class="flex items-center px-5 py-4 border-b border-[var(--pd-modal-header-divider)]">
        <h2 class="flex-1 text-lg font-semibold text-[var(--pd-modal-header-text)]">{lab.createContext}</h2>
        <button type="button" aria-label="Close" onclick={(): void => { lab.createOpen = false; }}><AppIcon icon={faXmark} /></button>
      </div>
      <div class="p-5 flex flex-col gap-3">
        <span class="text-sm">Target connection</span>
        <div class="grid grid-cols-2 gap-2 max-h-56 overflow-auto">
          {#each CONNECTIONS.filter(c => c.status === 'running') as c (c.id)}
            <button type="button" class="flex items-center gap-2 p-2 rounded-md border text-left" class:border-[var(--pd-content-card-border-selected)]={target === c.id} class:border-[var(--pd-content-card-border)]={target !== c.id} onclick={(): void => { target = c.id; }}>
              <ConnIcon connId={c.id} size={16} ring="var(--pd-modal-bg)" /><span class="truncate">{c.name}</span>
            </button>
          {/each}
        </div>
        <span class="text-sm">Name</span>
        <input class="h-8 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)]" value="my-new-thing" />
      </div>
      <div class="flex justify-end gap-2 px-5 pb-4">
        <Button type="link" onclick={(): void => { lab.createOpen = false; }}>Cancel</Button>
        <Button onclick={(): void => { lab.createOpen = false; }}>Create</Button>
      </div>
    </div>
  </div>
{/if}
