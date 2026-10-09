<script lang="ts">
/**
 * Nav lab (throwaway): full-viewport navigation proposals for v2, outside the
 * real shell. `#/nav-lab` = index, `#/nav-lab?p=p1&rail=labels&tabs=many&panel=on&theme=light&screen=1280&color=on&open=on`.
 */
import { page } from '$app/state';
import { untrack } from 'svelte';

import NavLabIndex from '#lib/nav-lab/NavLabIndex.svelte';
import { lab } from '#lib/nav-lab/lab.svelte.ts';
import P1 from '#lib/nav-lab/proposals/P1.svelte';
import P2 from '#lib/nav-lab/proposals/P2.svelte';
import P5 from '#lib/nav-lab/proposals/P5.svelte';
import P6 from '#lib/nav-lab/proposals/P6.svelte';
import P7 from '#lib/nav-lab/proposals/P7.svelte';
import P8 from '#lib/nav-lab/proposals/P8.svelte';
import P9 from '#lib/nav-lab/proposals/P9.svelte';
import P10 from '#lib/nav-lab/proposals/P10.svelte';
import P12 from '#lib/nav-lab/proposals/P12.svelte';
import P13 from '#lib/nav-lab/proposals/P13.svelte';
import P14 from '#lib/nav-lab/proposals/P14.svelte';
import CreateModal from '#lib/nav-lab/ui/CreateModal.svelte';
import LabBar from '#lib/nav-lab/ui/LabBar.svelte';
import ContextMenu from '#lib/nav-lab/r3/ContextMenu.svelte';
import { appUrl } from '#lib/nav.ts';

const query = $derived(appUrl().search);

$effect.pre(() => {
  void page.url.hash;
  const q = query;
  untrack(() => lab.init(new URLSearchParams(q)));
});

const views = { p1: P1, p2: P2, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9, p10: P10, p12: P12, p13: P13, p14: P14 };
const View = $derived(lab.proposal ? views[lab.proposal] : undefined);

function onkey(e: KeyboardEvent): void {
  const el = e.target as HTMLElement;
  if (e.key === '`' && !['INPUT', 'TEXTAREA'].includes(el.tagName)) {
    e.preventDefault();
    lab.panel = !lab.panel;
  }
}
</script>

<svelte:window onkeydown={onkey} />

<div class="flex flex-col w-screen h-screen overflow-hidden bg-[var(--pd-titlebar-bg)]">
  {#if !query.includes('bar=off')}<LabBar />{/if}
  {#if View}
    <div class="flex-1 min-h-0 flex justify-center">
      <div class="h-full flex" style:width="min(100%, {lab.screen}px)">
        {#key lab.proposal}<View />{/key}
      </div>
    </div>
  {:else}
    <div class="flex-1 min-h-0 overflow-auto bg-[var(--pd-content-bg)]"><NavLabIndex /></div>
  {/if}
</div>
<CreateModal />
<ContextMenu />
