<script lang="ts">
/** Small header action icon button (disabled = not applicable / not now). */
import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

interface Props {
  icon: IconRef;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onclick: (e: MouseEvent) => void;
}

let { icon, label, disabled = false, danger = false, onclick }: Props = $props();
</script>

<button
  type="button"
  aria-label={label}
  title={label}
  {disabled}
  class="w-7 h-7 flex items-center justify-center rounded text-[12px] {disabled ? 'opacity-30 cursor-default' : danger ? 'hover:bg-[var(--pd-action-button-details-bg)] hover:text-[var(--pd-status-dead)]' : 'hover:bg-[var(--pd-action-button-details-bg)] hover:text-[var(--pd-action-button-details-hover-text)]'}"
  {onclick}><AppIcon {icon} size="xs" /></button>
