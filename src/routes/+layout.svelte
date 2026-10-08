<script lang="ts">
import '../app.css';

import { page } from '$app/state';
import type { Snippet } from 'svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import PrimaryNav from '#lib/shell/PrimaryNav.svelte';
import { ui } from '#lib/ui.svelte.ts';
import { scheduleSave, world } from '#lib/world.svelte.ts';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

ui.init(new URL(page.url.href));
if (registry.init(new URL(page.url.href))) ui.welcomeOpen = true;

$effect(() => {
  JSON.stringify(world);
  scheduleSave();
});
</script>

<main class="flex flex-col w-screen h-screen overflow-hidden">
  <div class="flex flex-row w-full h-full overflow-hidden">
    <PrimaryNav />
    <div class="flex flex-col w-full min-w-0 h-full overflow-hidden bg-[var(--pd-content-bg)]">
      {@render children()}
    </div>
  </div>
</main>
