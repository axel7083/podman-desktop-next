<script lang="ts">
import '../app.css';

import { page } from '$app/state';
import type { Snippet } from 'svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import { appPath, coreResourcesOf, appUrl } from '#lib/nav.ts';
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
const path = $derived(appPath(appUrl().pathname));
/** v3 app (P13) at `#/` and its legacy alias `#/nav-lab`: full viewport, no v1 shell, no Welcome. */
const isMockupApp = (p: string): boolean => p === '/' || p.startsWith('/nav-lab');
const firstRun = registry.init(initialUrl);
if (firstRun && initialUrl.searchParams.get('welcome') !== 'off' && !isMockupApp(appPath(appUrl().pathname))) ui.welcomeOpen = true;
const conn = $derived(page.params.conn ? registry.getConnection(page.params.conn) : undefined);
const inSettings = $derived(path.startsWith('/settings'));
/** A connection with nothing but "Overview" (most VMs and services) needs no secondary nav. */
const showSecondary = $derived(!!conn && (coreResourcesOf(conn).length > 0 || (!conn.extensionDisabled && registry.navSectionsFor(conn).length > 0)));

$effect(() => {
  JSON.stringify(world);
  scheduleSave();
});
</script>

{#if isMockupApp(path)}
  <!-- v3 app (P13): full viewport, outside the v1 shell -->
  {@render children()}
{:else}
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
{/if}
