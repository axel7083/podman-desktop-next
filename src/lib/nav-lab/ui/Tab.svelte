<script lang="ts">
/**
 * The one P13 tab (rule A1), shared by the editor tab strip and the bottom
 * panel (JetBrains New UI: editor and tool-window tabs look the same):
 * 32px, 16px icon + 8px provider badge, 12px label, 2px accent bar at the
 * bottom when active, close ✕ on the active tab and on hover, italic preview,
 * middle-click closes, right-click opens the tab menu.
 */
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { HTMLAttributes } from 'svelte/elements';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import { type MenuItem, openMenu } from '../r3/live.svelte.ts';
import TabIcon from './TabIcon.svelte';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: IconRef;
  connId?: string;
  title: string;
  tooltip?: string;
  /** Shown in the content area (accent bar). */
  selected: boolean;
  /** Shown but not focused (split panes): half-strength bar. */
  dim?: boolean;
  preview?: boolean;
  closable?: boolean;
  /** Override for the accent bar colour (lab colour overlay). */
  color?: string;
  testid?: string;
  onselect: () => void;
  onclose?: () => void;
  onpin?: () => void;
  menu?: () => MenuItem[];
}

let { icon, connId, title, tooltip, selected, dim = false, preview = false, closable = true, color, testid = 'tab', onselect, onclose, onpin, menu, ...rest }: Props = $props();
</script>

<div
  {...rest}
  role="tab"
  tabindex="0"
  aria-selected={selected}
  data-testid={testid}
  title={tooltip ?? title}
  class="ltab group/tab"
  class:sel={selected}
  class:dim
  onclick={onselect}
  ondblclick={onpin}
  onauxclick={(e): void => {
    if (e.button === 1 && closable) onclose?.();
  }}
  oncontextmenu={(e): void => {
    if (menu) openMenu(e, menu());
  }}
  onkeydown={(e): void => {
    if (e.key === 'Enter') onselect();
  }}>
  {#if selected}<span class="bar" style:background={color}></span>{/if}
  <TabIcon {icon} {connId} />
  <span class="truncate" class:italic={preview}>{title}</span>
  {#if closable}
    <button
      type="button"
      aria-label="Close {title}"
      class="x"
      onclick={(e): void => {
        e.stopPropagation();
        onclose?.();
      }}><AppIcon icon={faXmark} /></button>
  {:else}
    <span class="w-1"></span>
  {/if}
</div>

<style>
.ltab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 32px;
  max-width: 200px;
  padding: 0 6px 0 12px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  color: var(--pd-tab-text);
}
.ltab:hover {
  background: var(--pd-content-card-hover-bg);
  color: var(--pd-tab-text-highlight);
}
.ltab.sel {
  color: var(--pd-tab-text-highlight);
}
.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--pd-tab-highlight);
}
.ltab.dim .bar {
  opacity: 0.45;
}
.x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  font-size: 10px;
  visibility: hidden;
}
.ltab:hover .x,
.ltab.sel .x {
  visibility: visible;
}
.x:hover {
  background: var(--pd-content-card-hover-inset-bg);
}
</style>
