<script lang="ts">
/** P13 Extensions page: installed (built-ins first) and catalog suggestions with Install. */
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { EXTENSIONS, installExt, isInstalled, type LabExtension } from './exts.ts';
import Head from './Head.svelte';

const installed = $derived(EXTENSIONS.filter(e => isInstalled(e.id)).sort((a, b) => Number(!!b.builtin) - Number(!!a.builtin)));
const catalog = $derived(EXTENSIONS.filter(e => !isInstalled(e.id)));
</script>

{#snippet card(e: LabExtension, install: boolean)}
  <div class="flex items-center gap-2.5 h-12 px-2.5 rounded-md bg-[var(--pd-content-card-bg)]">
    <AppIcon icon={e.icon} size="26px" />
    <div class="flex-1 min-w-0 leading-tight">
      <div class="flex items-center gap-1.5 font-semibold truncate text-[var(--pd-content-card-header-text)]">{e.name}{#if e.builtin}<span class="px-1 rounded text-[9px] font-normal bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">built-in</span>{/if}</div>
      <div class="text-xs truncate text-[var(--pd-content-card-text)]">{e.description}</div>
    </div>
    {#if install}<Button onclick={(): void => installExt(e.id)}>Install</Button>{/if}
  </div>
{/snippet}

<div class="flex flex-col h-full min-h-0">
  <Head icon={faPuzzlePiece} title="Extensions" sub="{installed.length} installed · {catalog.length} in the catalog" />
  <div class="flex-1 min-h-0 overflow-auto px-3 pb-4 text-sm">
    {#if catalog.length}
      <div class="pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Suggested from the catalog</div>
      <div data-testid="catalog" class="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-2">
        {#each catalog as e (e.id)}{@render card(e, true)}{/each}
      </div>
    {/if}
    <div class="pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Installed</div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-2">
      {#each installed as e (e.id)}{@render card(e, false)}{/each}
    </div>
  </div>
</div>
