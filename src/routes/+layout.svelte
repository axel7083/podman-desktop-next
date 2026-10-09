<script lang="ts">
import '../app.css';

import { page } from '$app/state';
import type { Snippet } from 'svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import { appPath, coreResourcesOf } from '#lib/nav.ts';
import ConfirmHost from '#lib/shell/ConfirmHost.svelte';
import CommandPalette from '#lib/shell/CommandPalette.svelte';
import DialogHost from '#lib/shell/DialogHost.svelte';
import PrimaryNav from '#lib/shell/PrimaryNav.svelte';
import SecondaryNav from '#lib/shell/SecondaryNav.svelte';
import SettingsNav from '#lib/shell/SettingsNav.svelte';
import StatusBar from '#lib/shell/StatusBar.svelte';
import TaskManager from '#lib/shell/TaskManager.svelte';
import TitleBar from '#lib/shell/TitleBar.svelte';
import Toasts from '#lib/shell/Toasts.svelte';
import Welcome from '#lib/shell/Welcome.svelte';
import { ui } from '#lib/ui.svelte.ts';
import { scheduleSave, world } from '#lib/world.svelte.ts';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

const initialUrl = new URL(page.url.href);
ui.init(initialUrl);
if (registry.init(initialUrl) && initialUrl.searchParams.get('welcome') !== 'off') ui.welcomeOpen = true;

const path = $derived(appPath(page.url.pathname));
const conn = $derived(page.params.conn ? registry.getConnection(page.params.conn) : undefined);
const inSettings = $derived(path.startsWith('/settings'));
/** A connection with nothing but "Overview" (most VMs and services) needs no secondary nav. */
const showSecondary = $derived(!!conn && (coreResourcesOf(conn).length > 0 || (!conn.extensionDisabled && registry.navSectionsFor(conn).length > 0)));

$effect(() => {
  JSON.stringify(world);
  scheduleSave();
});
</script>

<main class="flex flex-col w-screen h-screen overflow-hidden">
  <TitleBar />
  <div class="flex flex-row w-full h-full min-h-0 overflow-hidden">
    <PrimaryNav />
    {#if conn && showSecondary}
      <SecondaryNav {conn} resource={page.params.resource} />
    {:else if inSettings}
      <SettingsNav section={page.params.section} />
    {/if}
    <div
      class="flex flex-col w-full min-w-0 h-full overflow-hidden"
      class:bg-[var(--pd-content-bg)]={!inSettings}
      class:bg-[var(--pd-invert-content-bg)]={inSettings}>
      {@render children()}
    </div>
  </div>
  <StatusBar />
</main>

<TaskManager />
<Toasts />
<CommandPalette />
<Welcome />
<ConfirmHost />
<DialogHost />
