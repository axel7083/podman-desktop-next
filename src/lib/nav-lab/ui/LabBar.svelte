<script lang="ts">
/** Lime lab toolbar (mockup chrome, not product). */
import { goto } from '$app/navigation';

import { href } from '#lib/nav.ts';

import { lab, PROPOSALS, type ProposalId, type RailMode, type ScreenWidth } from '../lab.svelte.ts';

function sync(): void {
  lab.applyTheme();
  goto(href(`/nav-lab?${lab.query()}`), { replaceState: true }).catch(() => undefined);
}

function set<K extends 'theme' | 'rail' | 'tabs' | 'panel' | 'screen' | 'color' | 'conns'>(k: K, v: (typeof lab)[K]): void {
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

<div class="flex items-center gap-3 h-8 shrink-0 px-3 text-[11px] font-medium bg-[var(--pdn-mockup-bg)] text-[var(--pdn-mockup-text)] overflow-x-auto whitespace-nowrap" data-testid="nav-lab-bar">
  <a href={href('/nav-lab')} class="font-bold" onclick={(): void => lab.selectProposal(undefined)}>Nav lab</a>
  {@render seg<ProposalId | undefined>('', [...PROPOSALS.map(p => [p.id, p.round > 1 ? p.id.toUpperCase() : `${p.id.toUpperCase()} ${p.short}`] as [ProposalId, string])], lab.proposal, v => {
    lab.selectProposal(v);
    sync();
  })}
  {#if lab.proposal === 'p12' || lab.proposal === 'p13' || lab.proposal === 'p14'}
    {@render seg('Connections', [['one', '1'], ['many', 'Many']] as ['one' | 'many', string][], lab.conns, v => set('conns', v))}
  {/if}
  {@render seg('Colour (H)', [[true, 'On'], [false, 'Off']], lab.color, v => set('color', v))}
  {@render seg('Theme', [['dark', 'Dark'], ['light', 'Light']] as ['dark' | 'light', string][], lab.theme, v => set('theme', v))}
  {#if lab.proposal !== 'p13' && lab.proposal !== 'p14'}{@render seg(lab.proposal && Number(lab.proposal.slice(1)) > 5 ? 'Nav' : 'Rail', [['icons', 'Icons'], ['labels', 'Labels'], ['expanded', 'Expanded']] as [RailMode, string][], lab.rail, v => set('rail', v))}{/if}
  {@render seg('Tabs', [['few', 'Few'], ['many', 'Many (16)']] as ['few' | 'many', string][], lab.tabs, v => set('tabs', v))}
  {@render seg('Panel `', [[true, 'On'], [false, 'Off']], lab.panel, v => set('panel', v))}
  {@render seg('Screen', [[1440, '1440'], [1280, '1280'], [1024, '1024']] as [ScreenWidth, string][], lab.screen, v => set('screen', v))}
</div>
