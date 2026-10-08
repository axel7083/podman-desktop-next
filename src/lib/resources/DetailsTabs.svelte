<script lang="ts">
/**
 * Details tabs (docs/ia.md rule 3): core tabs, a divider, then extension tabs
 * (P14); more than 3 extension tabs overflow into a "More" menu.
 */
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Tab } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import Contribution from '#lib/components/Contribution.svelte';
import MenuItem from '#lib/components/MenuItem.svelte';
import Popover from '#lib/components/Popover.svelte';
import type { Contributed, TabDef } from '#lib/ext/types.ts';
import { href, navigate } from '#lib/nav.ts';

interface Props {
  base: string;
  current: string;
  core: { id: string; label: string }[];
  ext: Contributed<TabDef>[];
}

let { base, current, core, ext }: Props = $props();

const MAX_EXT = 3;
const inline = $derived(ext.length > MAX_EXT ? ext.slice(0, MAX_EXT - 1) : ext);
const overflow = $derived(ext.length > MAX_EXT ? ext.slice(MAX_EXT - 1) : []);
const selectedOverflow = $derived(overflow.find(t => t.id === current));

let open = $state(false);
let anchor = $state<HTMLButtonElement>();

function toggle(): void {
  open = !open;
}

function close(): void {
  open = false;
}

function go(id: string): void {
  open = false;
  navigate(`${base}/${id}`);
}
</script>

{#each core as t (t.id)}
  <Tab title={t.label} selected={current === t.id} url={href(`${base}/${t.id}`)} />
{/each}
{#if ext.length}
  <div class="mx-2 my-1.5 border-l border-[var(--pd-content-divider)]" role="separator" aria-label="Extension tabs"></div>
  {#each inline as t (t.ext.id + t.id)}
    <Contribution ext={t.ext} kind="tab" api="P14">
      <div class="flex items-center">
        <Tab title={t.label} selected={current === t.id} url={href(`${base}/${t.id}`)} />
      </div>
    </Contribution>
  {/each}
  {#if overflow.length}
    <div
      class="pb-1 border-b-[3px] whitespace-nowrap {selectedOverflow ? 'border-[var(--pd-tab-highlight)]' : 'border-transparent hover:border-[var(--pd-tab-hover)]'}">
      <button
        bind:this={anchor}
        class="px-4 py-2 flex items-center gap-1.5 {selectedOverflow ? 'text-[var(--pd-tab-text-highlight)]' : 'text-[var(--pd-tab-text)]'}"
        onclick={toggle}
        aria-label="More tabs">
        {selectedOverflow ? selectedOverflow.label : `More (${overflow.length})`}
        <Icon icon={faChevronDown} size="xs" />
      </button>
    </div>
    <Popover {open} {anchor} placement="bottom-start" onclose={close} class="w-56">
      {#each overflow as t (t.ext.id + t.id)}
        <MenuItem title={t.label} icon={t.ext.icon} onclick={go.bind(undefined, t.id)}>
          {#snippet trailing()}<span class="text-xs opacity-70">{t.ext.displayName}</span>{/snippet}
        </MenuItem>
      {/each}
    </Popover>
  {/if}
{/if}
