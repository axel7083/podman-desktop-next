<script lang="ts">
/**
 * Icon wrapper: ui-svelte `Icon` for FontAwesome definitions and components,
 * `<img>` for static asset paths (extension icons). Re-keyed on change because
 * ui-svelte's Icon captures the component at init.
 */
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { IconRef } from '#lib/ext/types.ts';
import { assetUrl } from '#lib/nav.ts';

interface Props {
  icon: IconRef | undefined;
  size?: string | number;
  class?: string;
  title?: string;
}

let { icon, size, class: className = '', title }: Props = $props();

const isImage = $derived(typeof icon === 'string' && !icon.startsWith('fas ') && !icon.startsWith('far '));
const imgSize = $derived(typeof size === 'number' ? `${size}px` : size?.endsWith('px') ? size : undefined);
// FontAwesome only accepts FA sizes ('sm', 'lg', '2x'…); pixel sizes are for images/components
const isFa = $derived(typeof icon === 'object' && icon !== null && 'iconName' in icon);
const iconSize = $derived(isFa && (typeof size === 'number' || size?.endsWith('px')) ? undefined : size);
</script>

{#if icon}
  {#if isImage}
    <img
      src={assetUrl(icon as string)}
      alt={title ?? ''}
      title={title}
      class="object-contain {className}"
      style:width={imgSize}
      style:height={imgSize}
      draggable="false" />
  {:else}
    {#key icon}
      <Icon icon={icon} size={iconSize} class={className} title={title} />
    {/key}
  {/if}
{/if}
