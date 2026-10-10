<script lang="ts">
/**
 * P13 flow modal shell: 16px icon + title (16px semibold) + muted sub, body,
 * footer with the secondary actions then ONE primary rightmost (rule D11).
 * Esc / backdrop click / ✕ close it.
 */
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import LabIcon from '../../ui/LabIcon.svelte';
import Btn from '../Btn.svelte';
import { closeModal } from '../flows.svelte.ts';

interface Props {
  title: string;
  icon?: IconRef;
  sub?: string;
  /** Primary action label (omitted: only Close). */
  primary?: string;
  primaryIcon?: IconRef;
  disabled?: boolean;
  onprimary?: () => void;
  /** Extra secondary buttons before the primary (Back…). */
  secondary?: Snippet;
  width?: string;
  testid?: string;
  children: Snippet;
}

let { title, icon, sub, primary, primaryIcon, disabled = false, onprimary, secondary, width = '36rem', testid = 'flow-modal', children }: Props = $props();
</script>

<svelte:window
  onkeydown={(e): void => {
    if (e.key === 'Escape') closeModal();
  }} />

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--pd-modal-fade)]" role="presentation" onclick={closeModal}>
  <div
    role="dialog"
    aria-label={title}
    tabindex="-1"
    data-testid={testid}
    class="flex flex-col max-h-[86vh] rounded-xl bg-[var(--pd-modal-bg)] border border-[var(--pd-modal-border)] shadow-xl text-[var(--pd-modal-text)]"
    style:width
    onclick={(e): void => e.stopPropagation()}
    onkeydown={(): void => undefined}>
    <div class="flex items-center gap-2 px-5 h-14 shrink-0 border-b border-[var(--pd-modal-header-divider)]">
      {#if icon}<LabIcon {icon} size={16} />{/if}
      <div class="flex-1 min-w-0">
        <h2 class="text-[16px] font-semibold leading-5 truncate text-[var(--pd-modal-header-text)]">{title}</h2>
        {#if sub}<div class="text-[12px] truncate text-[var(--pd-table-body-text)]">{sub}</div>{/if}
      </div>
      <button type="button" aria-label="Close" class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--pd-action-button-details-bg)]" onclick={closeModal}><AppIcon icon={faXmark} /></button>
    </div>
    <div class="flex-1 min-h-0 overflow-auto p-5 flex flex-col gap-4 text-[13px]">{@render children()}</div>
    <div class="flex items-center justify-end gap-2 px-5 py-3 shrink-0 border-t border-[var(--pd-modal-header-divider)]">
      <Btn onclick={closeModal}>{primary ? 'Cancel' : 'Close'}</Btn>
      {#if secondary}{@render secondary()}{/if}
      {#if primary}<Btn kind="primary" icon={primaryIcon} {disabled} testid="modal-primary" onclick={onprimary}>{primary}</Btn>{/if}
    </div>
  </div>
</div>
