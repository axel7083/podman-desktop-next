<script lang="ts">
/** Lime "Mockup" settings bar (mockup chrome, not product). */
import { goto } from '$app/navigation';

import { href } from '#lib/nav.ts';

import { type ChromeStyle, lab, type ScreenWidth } from '../lab.svelte.ts';

function sync(): void {
  lab.applyTheme();
  goto(href(`/?${lab.query()}`), { replaceState: true }).catch(() => undefined);
}

function set<K extends 'theme' | 'style' | 'toolBg' | 'panel' | 'screen' | 'conns' | 'install' | 'table'>(k: K, v: (typeof lab)[K]): void {
  lab[k] = v;
  sync();
}
</script>

{#snippet seg<T>(label: string, options: [T, string][], value: T, onpick: (v: T) => void)}
  <span class="flex items-center gap-1">
    <span class="opacity-70">{label}</span>
    <span class="flex rounded-md border border-black/30 overflow-hidden">
      {#each options as [v, l] (l)}
        <button type="button" class="px-1.5 h-5" class:bg-black={value === v} class:text-[var(--pdn-mockup-bg)]={value === v} onclick={(): void => onpick(v)}>{l}</button>
      {/each}
    </span>
  </span>
{/snippet}

<div class="flex items-center gap-3 h-7 shrink-0 px-3 text-[11px] font-medium bg-[var(--pdn-mockup-bg)] text-[var(--pdn-mockup-text)] overflow-x-auto whitespace-nowrap" data-testid="mockup-bar">
  <span class="font-bold">Mockup</span>
  {@render seg('Theme', [['dark', 'Dark'], ['light', 'Light']] as ['dark' | 'light', string][], lab.theme, v => set('theme', v))}
  {@render seg('Style', [['islands', 'Islands'], ['classic', 'Classic']] as [ChromeStyle, string][], lab.style, v => set('style', v))}
  {#if lab.style === 'islands'}
    <label class="flex items-center gap-1 cursor-pointer" title="Islands option: tree and bottom panel use a different background than the editor">
      <input type="checkbox" data-testid="twbg" checked={lab.toolBg} onchange={(e): void => set('toolBg', e.currentTarget.checked)} />
      Different tool window background
    </label>
  {/if}
  {@render seg('Install', [['vanilla', 'Vanilla'], ['all', 'All extensions']] as ['vanilla' | 'all', string][], lab.install, v => {
    lab.installed = [];
    set('install', v);
  })}
  {@render seg('Connections', [['one', '1'], ['many', 'Many']] as ['one' | 'many', string][], lab.conns, v => set('conns', v))}
  {@render seg('Table', [['modern', 'Modern'], ['grid', 'Grid'], ['classic', 'Classic']] as ['classic' | 'modern' | 'grid', string][], lab.table, v => set('table', v))}
  {@render seg('Panel `', [[true, 'On'], [false, 'Off']], lab.panel, v => set('panel', v))}
  {@render seg('Screen', [[1440, '1440'], [1280, '1280'], [1024, '1024']] as [ScreenWidth, string][], lab.screen, v => set('screen', v))}
</div>
