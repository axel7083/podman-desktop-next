<script lang="ts">
/**
 * v3 app: the P13 navigation, full viewport, outside the v1 shell. Rendered by
 * `#/` and by the legacy alias `#/nav-lab` (old `?p=…` links keep working; the
 * other proposals were removed). Mockup params live in the hash query:
 * `#/?theme=light&style=classic&twbg=on&install=vanilla&conns=one&table=grid&panel=on&screen=1280`.
 */
import { page } from '$app/state';
import { untrack } from 'svelte';

import { lab } from '#lib/nav-lab/lab.svelte.ts';
import P13 from '#lib/nav-lab/proposals/P13.svelte';
import ContextMenu from '#lib/nav-lab/r3/ContextMenu.svelte';
import CreateModal from '#lib/nav-lab/ui/CreateModal.svelte';
import LabBar from '#lib/nav-lab/ui/LabBar.svelte';
import { appUrl } from '#lib/nav.ts';

const query = $derived(appUrl().search);

$effect.pre(() => {
  void page.url.hash;
  const q = query;
  untrack(() => lab.init(new URLSearchParams(q)));
});

function onkey(e: KeyboardEvent): void {
  const el = e.target as HTMLElement;
  if (e.key === '`' && !['INPUT', 'TEXTAREA'].includes(el.tagName)) {
    e.preventDefault();
    lab.panel = !lab.panel;
  }
}
</script>

<svelte:window onkeydown={onkey} />

<div class="flex flex-col w-screen h-screen overflow-hidden bg-[var(--pdn-canvas)]" data-testid="mockup-app">
  {#if !query.includes('bar=off')}<LabBar />{/if}
  <div class="flex-1 min-h-0 flex justify-center">
    <div class="h-full flex" style:width="min(100%, {lab.screen}px)">
      <P13 />
    </div>
  </div>
</div>
<CreateModal />
<ContextMenu />
