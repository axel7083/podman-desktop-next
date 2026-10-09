<script lang="ts">
/**
 * P13 icon in a fixed square box (rule B5): FontAwesome glyphs are scaled by
 * font-size, images and SVG components by width / height, so every icon of a
 * given size renders in the same box. Sizes: 8 badge, 14 inline, 16 primary,
 * 20 card, 32 logo, 48 empty-state hero.
 */
import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

interface Props {
  icon: IconRef | undefined;
  /** 8 | 14 | 16 | 20 | 32 | 48 in P13 (other proposals may pass other sizes). */
  size?: number;
  class?: string;
  title?: string;
}

let { icon, size = 16, class: cls = '', title }: Props = $props();
</script>

<span
  data-icon={size}
  class="inline-flex shrink-0 items-center justify-center leading-none {cls}"
  style:width="{size}px"
  style:height="{size}px"
  style:font-size="{size}px"
  {title}><AppIcon {icon} size="{size}px" /></span>
