<script lang="ts">
/**
 * P13 labelled button (rules D11–D13): 28px, 12px label, 14px icon.
 * `primary` (filled, max one per header, rightmost) or `secondary` (outlined).
 */
import type { Snippet } from 'svelte';

import type { IconRef } from '#lib/ext/types.ts';

import LabIcon from '../ui/LabIcon.svelte';

interface Props {
  kind?: 'primary' | 'secondary';
  icon?: IconRef;
  disabled?: boolean;
  title?: string;
  testid?: string;
  onclick?: (e: MouseEvent) => void;
  children: Snippet;
}

let { kind = 'secondary', icon, disabled = false, title, testid, onclick, children }: Props = $props();
</script>

<button type="button" class="btn {kind}" {disabled} {title} data-testid={testid} data-btn={kind} {onclick}>
  {#if icon}<LabIcon {icon} size={14} />{/if}
  <span class="whitespace-nowrap">{@render children()}</span>
</button>

<style>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.primary {
  background: var(--pd-button-primary-bg);
  color: var(--pd-button-primary-text);
  border-color: var(--pd-button-primary-border, transparent);
}
.primary:hover:not(:disabled) {
  background: var(--pd-button-primary-hover-bg);
}
.secondary {
  background: transparent;
  color: var(--pd-content-header);
  border-color: var(--pd-button-secondary-border, var(--pd-content-divider));
}
.secondary:hover:not(:disabled) {
  background: var(--pd-action-button-details-bg);
}
.btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.btn:focus-visible {
  outline: 2px solid var(--pd-button-focus-ring, var(--pd-tab-highlight));
  outline-offset: 1px;
}
</style>
