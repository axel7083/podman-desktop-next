<script lang="ts">
/**
 * Empty-state promotion, like today's PD Kubernetes page: centered big icon,
 * title, description, then a provider card (logo, title, description, more
 * information, primary action) next to a dashed "New provider" card.
 */
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import { lab } from '../lab.svelte.ts';
import { ext, installExt, isInstalled } from './exts.ts';

interface Props {
  icon: IconRef;
  title: string;
  description: string;
  /** Extension promoted in the provider card. */
  extId: string;
  /** "More information" link text. */
  info?: string;
  /** Provider card title (default: the extension name). */
  cardTitle?: string;
  /** Primary action once installed (e.g. "Create new"). */
  actionLabel?: string;
  onaction?: () => void;
  onbrowse?: () => void;
}

let { icon, title, description, extId, info, cardTitle, actionLabel = 'Create new', onaction, onbrowse }: Props = $props();
const e = $derived(ext(extId));
const inst = $derived(isInstalled(extId));
</script>

<div data-testid="promo-empty" class="flex flex-col items-center px-6 py-10 text-center text-[var(--pd-content-text)]">
  <span class="text-[var(--pd-details-empty-icon)] opacity-80"><AppIcon {icon} size="56px" /></span>
  <h2 class="pt-4 text-xl font-semibold text-[var(--pd-details-empty-header)]">{title}</h2>
  <p class="pt-2 max-w-xl text-[13px] text-[var(--pd-details-empty-sub-header)]">{description}</p>
  <div class="flex flex-wrap justify-center gap-4 pt-6">
    {#if e}
      <div class="flex flex-col w-72 p-4 gap-2 rounded-lg bg-[var(--pd-content-card-bg)] text-left">
        <div class="flex items-center gap-2"><AppIcon icon={e.icon} size="28px" /><span class="text-base font-semibold text-[var(--pd-content-card-header-text)]">{cardTitle ?? e.name}</span></div>
        <p class="text-[13px] text-[var(--pd-content-card-text)] flex-1">{e.description}.</p>
        {#if info}<div class="text-xs text-[var(--pd-content-card-text)]">More information: <a class="hover:text-[var(--pd-link)] hover:underline" href="https://{info}" target="_blank" rel="noreferrer">{info}</a></div>{/if}
        <div class="pt-2">
          {#if inst}
            <Button icon={faPlus} onclick={(): void => (onaction ? onaction() : lab.openCreate(`${actionLabel} · ${e.name}`))}>{actionLabel}</Button>
          {:else}
            <Button onclick={(): void => installExt(extId)}>Install {e.name}</Button>
          {/if}
        </div>
      </div>
    {/if}
    <div class="flex flex-col items-center justify-center w-72 p-4 gap-3 rounded-lg border-2 border-dashed border-[var(--pd-content-divider)] text-center">
      <span class="text-base font-semibold text-[var(--pd-content-card-header-text)]">New provider</span>
      <p class="text-[13px] text-[var(--pd-content-card-text)]">Find more providers in the extensions catalog.</p>
      <Button type="secondary" onclick={(): void => onbrowse?.()}>See available extensions</Button>
    </div>
  </div>
</div>
