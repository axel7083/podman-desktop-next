<script lang="ts">
/**
 * Title bar – markup from PD's TitleBar.svelte (38px, 3-column grid, search
 * in the center). The mockup pill sits at the right, like PD's
 * prototype switcher.
 */
import { faSquare } from '@fortawesome/free-regular-svg-icons';
import { faArrowLeft, faArrowRight, faMagnifyingGlass, faMinus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import DesktopIcon from '#lib/images/DesktopIcon.svelte';
import { ui } from '#lib/ui.svelte.ts';

import MockupPill from './MockupPill.svelte';

function goBack(): void {
  history.back();
}

function goForward(): void {
  history.forward();
}

function openPalette(): void {
  ui.paletteOpen = true;
}

function noop(): void {}

const controls = [
  { name: 'Minimize', icon: faMinus },
  { name: 'Maximize', icon: faSquare },
  { name: 'Close', icon: faXmark },
];
</script>

<header
  id="navbar"
  class="bg-[var(--pd-titlebar-bg)] body-font relative min-h-[38px] h-[38px] shrink-0 border-[var(--pd-global-nav-bg-border)] border-b-[1px]">
  <div class="select-none grid grid-cols-3 items-center h-full w-full">
    <!-- left -->
    <div class="flex flex-row grow pl-[7px] items-center gap-x-2">
      <DesktopIcon size="18" />
      <div class="relative flex items-center gap-1 text-[color:var(--pd-global-nav-icon)]">
        <button
          class="h-[25px] w-[25px] flex place-items-center justify-center hover:rounded hover:bg-[var(--pd-titlebar-hover-bg)]"
          title="Back"
          aria-label="Back"
          onclick={goBack}><Icon icon={faArrowLeft} /></button>
        <button
          class="h-[25px] w-[25px] flex place-items-center justify-center hover:rounded hover:bg-[var(--pd-titlebar-hover-bg)]"
          title="Forward"
          aria-label="Forward"
          onclick={goForward}><Icon icon={faArrowRight} /></button>
      </div>
    </div>

    <!-- center -->
    <div class="flex flex-row grow items-center justify-center w-full">
      <button
        id="Search button"
        title="Search or run a command (Ctrl+K)"
        class="text-[color:var(--pd-global-nav-icon)] flex items-center gap-2 h-[26px] w-full max-w-[340px] px-3 rounded-md border border-[var(--pd-global-nav-bg-border)] hover:bg-[var(--pd-titlebar-hover-bg)]"
        onclick={openPalette}>
        <Icon icon={faMagnifyingGlass} />
        <span class="grow text-left">Search or run a command…</span>
        <kbd class="text-xs font-sans opacity-80">Ctrl K</kbd>
      </button>
    </div>

    <!-- right -->
    <div class="flex flex-row grow justify-end items-center gap-3">
      {#if ui.chrome}
        <MockupPill />
      {/if}
      <div class="pr-3 flex flex-row space-x-2">
        {#each controls as control (control.name)}
          <button
            onclick={noop}
            title={control.name}
            aria-label={control.name}
            class="h-[25px] w-[25px] cursor-pointer text-[color:var(--pd-global-nav-icon)] hover:rounded-full hover:bg-[var(--pd-titlebar-hover-bg)] flex place-items-center justify-center">
            <Icon size="0.875x" icon={control.icon} />
          </button>
        {/each}
      </div>
    </div>
  </div>
</header>
