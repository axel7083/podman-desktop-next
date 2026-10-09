<script lang="ts">
/**
 * Round-2 app chrome: title bar with left/center slots (scope chip, omnibox…),
 * body, status bar with an optional leading context item. `tint` (overlay H or
 * P10) colours a thin title-bar border / the status bar.
 */
import { faBell, faMagnifyingGlass, faTerminal } from '@fortawesome/free-solid-svg-icons';
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import logo from '#lib/images/logo.png';

import { CONNECTIONS } from '../data.ts';
import { lab } from '../lab.svelte.ts';

interface Props {
  children: Snippet;
  /** Next to the logo (P6 scope chip). */
  titleLeft?: Snippet;
  /** Replaces the default search box (P11 omnibox). */
  titleCenter?: Snippet;
  /** Leading status-bar item (P10 context). */
  statusLeft?: Snippet;
  /** Single-connection colour: thin tinted title-bar border (overlay H). */
  tint?: string;
  /** Fill the status bar with this colour (P10). */
  statusTint?: string;
}

let { children, titleLeft, titleCenter, statusLeft, tint, statusTint }: Props = $props();

const running = CONNECTIONS.filter(c => c.status === 'running').length;
const errors = CONNECTIONS.filter(c => c.status === 'error').length;
</script>

<div class="flex flex-col h-full w-full min-w-0 overflow-hidden bg-[var(--pd-content-bg)] text-[var(--pd-content-text)]">
  <header
    class="relative grid grid-cols-[1fr_auto_1fr] items-center h-[38px] shrink-0 px-3 bg-[var(--pd-titlebar-bg)] text-[var(--pd-titlebar-text)] border-b border-[var(--pd-global-nav-bg-border)]"
    style:background={tint ? `color-mix(in srgb, ${tint} 16%, var(--pd-titlebar-bg))` : undefined}>
    {#if tint}<span class="absolute left-0 right-0 bottom-0 h-[2px]" style:background={tint}></span>{/if}
    <div class="flex items-center gap-2 min-w-0">
      <img src={logo} alt="" class="w-5 h-5" />
      {#if titleLeft}{@render titleLeft()}{:else}<span class="text-base font-semibold">Podman Desktop</span>{/if}
    </div>
    {#if titleCenter}
      {@render titleCenter()}
    {:else}
      <button type="button" class="flex items-center gap-2 w-[360px] max-w-[30vw] h-6 px-2 rounded-md bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] text-sm text-[var(--pd-input-field-placeholder-text)]">
        <AppIcon icon={faMagnifyingGlass} size="xs" /><span class="flex-1 text-left truncate">Search</span><kbd class="opacity-70">⌘K</kbd>
      </button>
    {/if}
    <div class="flex items-center justify-end gap-3 text-[var(--pd-titlebar-icon)]"><AppIcon icon={faBell} /></div>
  </header>
  <div class="flex flex-1 min-h-0 min-w-0">
    {@render children()}
  </div>
  <footer
    class="dark relative flex items-center gap-3 h-6 shrink-0 pr-2 text-sm bg-[var(--pd-statusbar-bg)] text-[var(--pd-statusbar-text)]"
    class:pl-2={!statusLeft}
    style:background={statusTint ? `color-mix(in srgb, ${statusTint} 70%, #111)` : undefined}>
    {#if statusLeft}{@render statusLeft()}{/if}
    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-running)]"></span>{running} running</span>
    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-dead)]"></span>{errors} errors</span>
    <span class="flex-1"></span>
    <button type="button" class="flex items-center gap-1 px-1 hover:bg-[var(--pd-statusbar-hover-bg)]" onclick={(): void => { lab.panel = !lab.panel; }}><AppIcon icon={faTerminal} size="xs" /> Panel <kbd class="opacity-70">`</kbd></button>
    <span>v2.0.0-next</span>
  </footer>
</div>
