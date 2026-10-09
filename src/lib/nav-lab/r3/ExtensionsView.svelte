<script lang="ts">
/** P13 Extensions page: catalog (PD catalog cards with download) then installed. */
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';

import ExtCards from './ExtCards.svelte';
import { EXTENSIONS, isInstalled } from './exts.ts';
import Head from './Head.svelte';

let search = $state('');
const match = (name: string): boolean => !search || name.toLowerCase().includes(search.toLowerCase());
const installed = $derived(EXTENSIONS.filter(e => isInstalled(e.id) && match(e.name)).sort((a, b) => Number(!!b.builtin) - Number(!!a.builtin)));
const catalog = $derived(EXTENSIONS.filter(e => !isInstalled(e.id) && match(e.name)));
</script>

<div class="flex flex-col h-full min-h-0">
  <Head icon={faPuzzlePiece} title="Extensions" sub="{installed.length} installed · {catalog.length} in the catalog" placeholder="Filter extensions" bind:search />
  <div class="flex-1 min-h-0 overflow-auto p-5 flex flex-col gap-4 text-[13px]">
    {#if catalog.length}<ExtCards ids={catalog.map(e => e.id)} title="Available extensions" />{/if}
    <ExtCards ids={installed.map(e => e.id)} title="Installed" />
  </div>
</div>
