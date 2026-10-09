<script lang="ts">
/** Fake app chrome shared by every proposal: title bar, body, status bar. */
import { faBell, faMagnifyingGlass, faTerminal } from '@fortawesome/free-solid-svg-icons';
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import logo from '#lib/images/logo.png';

import { CONNECTIONS } from '../data.ts';
import { lab } from '../lab.svelte.ts';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

const running = CONNECTIONS.filter(c => c.status === 'running').length;
const errors = CONNECTIONS.filter(c => c.status === 'error').length;
const stopped = CONNECTIONS.filter(c => c.status === 'stopped').length;
</script>

<div class="flex flex-col h-full w-full min-w-0 overflow-hidden bg-[var(--pd-content-bg)] text-[var(--pd-content-text)]">
  <header class="grid grid-cols-[1fr_auto_1fr] items-center h-[38px] shrink-0 px-3 bg-[var(--pd-titlebar-bg)] text-[var(--pd-titlebar-text)] border-b border-[var(--pd-global-nav-bg-border)]">
    <div class="flex items-center gap-2"><img src={logo} alt="" class="w-5 h-5" /><span class="text-base font-semibold">Podman Desktop</span></div>
    <button type="button" class="flex items-center gap-2 w-[420px] max-w-[40vw] h-6 px-2 rounded-md bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] text-sm text-[var(--pd-input-field-placeholder-text)]">
      <AppIcon icon={faMagnifyingGlass} size="xs" /><span class="flex-1 text-left">Search connections, resources, tools…</span><kbd class="opacity-70">⌘K</kbd>
    </button>
    <div class="flex items-center justify-end gap-3 text-[var(--pd-titlebar-icon)]"><AppIcon icon={faBell} /></div>
  </header>
  <div class="flex flex-1 min-h-0 min-w-0">
    {@render children()}
  </div>
  <footer class="dark flex items-center gap-3 h-6 shrink-0 px-2 text-sm bg-[var(--pd-statusbar-bg)] text-[var(--pd-statusbar-text)]">
    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-running)]"></span>{running} running</span>
    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-stopped)]"></span>{stopped} stopped</span>
    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-dead)]"></span>{errors} errors</span>
    <span class="flex-1"></span>
    <button type="button" class="flex items-center gap-1 px-1 hover:bg-[var(--pd-statusbar-hover-bg)]" onclick={(): void => { lab.panel = !lab.panel; }}><AppIcon icon={faTerminal} size="xs" /> Panel <kbd class="opacity-70">`</kbd></button>
    <span>v2.0.0-next</span>
  </footer>
</div>
