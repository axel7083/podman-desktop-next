<script lang="ts">
/**
 * Empty-state promotion, like today's PD Kubernetes page: centered big icon,
 * title, description, then a provider card (logo, title, description, more
 * information, primary action) next to a dashed "New provider" card.
 */
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import type { IconRef } from '#lib/ext/types.ts';

import { lab } from '../lab.svelte.ts';
import LabIcon from '../ui/LabIcon.svelte';
import Btn from './Btn.svelte';
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
  <span class="text-[var(--pd-details-empty-icon)]"><LabIcon {icon} size={48} /></span>
  <h2 class="pt-4 text-[16px] font-semibold text-[var(--pd-details-empty-header)]">{title}</h2>
  <p class="pt-2 max-w-xl text-[13px] text-[var(--pd-details-empty-sub-header)]">{description}</p>
  <div class="flex flex-wrap justify-center gap-4 pt-6">
    {#if e}
      <div class="flex flex-col w-72 p-4 gap-2 rounded-lg bg-[var(--pd-content-card-bg)] text-left">
        <div class="flex items-center gap-2"><LabIcon icon={e.icon} size={32} /><span class="text-[14px] font-semibold text-[var(--pd-content-header)]">{cardTitle ?? e.name}</span></div>
        <p class="text-[13px] text-[var(--pd-table-body-text)] flex-1">{e.description}.</p>
        {#if info}<div class="text-[12px] text-[var(--pd-table-body-text)]">More information: <a class="hover:text-[var(--pd-link)] hover:underline" href="https://{info}" target="_blank" rel="noreferrer">{info}</a></div>{/if}
        <div class="pt-2">
          {#if inst}
            <Btn kind="primary" icon={faPlus} onclick={(): void => (onaction ? onaction() : lab.openCreate(`${actionLabel} · ${e.name}`))}>{actionLabel}</Btn>
          {:else}
            <Btn kind="primary" testid="promo-install" onclick={(): void => installExt(extId)}>Install {e.name}</Btn>
          {/if}
        </div>
      </div>
    {/if}
    <div class="flex flex-col items-center justify-center w-72 p-4 gap-3 rounded-lg border-2 border-dashed border-[var(--pd-content-divider)] text-center">
      <span class="text-[14px] font-semibold text-[var(--pd-content-header)]">New provider</span>
      <p class="text-[13px] text-[var(--pd-table-body-text)]">Find more providers in the extensions catalog.</p>
      <Btn onclick={(): void => onbrowse?.()}>See available extensions</Btn>
    </div>
  </div>
</div>
