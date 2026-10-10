<script lang="ts">
/**
 * Ghost icon-only button (rule D11): per-resource quick actions and the `⋯`
 * overflow only. 28px, 14px glyph, tooltip + aria-label (disabled = not now).
 */
import type { IconRef } from '#lib/ext/types.ts';

import LabIcon from '../ui/LabIcon.svelte';

interface Props {
  icon: IconRef;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  testid?: string;
  onclick: (e: MouseEvent) => void;
}

let { icon, label, disabled = false, danger = false, testid, onclick }: Props = $props();
</script>

<button
  type="button"
  aria-label={label}
  title={label}
  data-btn="ghost"
  data-testid={testid}
  {disabled}
  class="w-7 h-7 shrink-0 flex items-center justify-center rounded-md {disabled ? 'opacity-40 cursor-default' : danger ? 'hover:bg-[var(--pd-action-button-details-bg)] hover:text-[var(--pd-status-dead)]' : 'hover:bg-[var(--pd-action-button-details-bg)] hover:text-[var(--pd-action-button-details-hover-text)]'}"
  {onclick}><LabIcon {icon} size={14} /></button>
