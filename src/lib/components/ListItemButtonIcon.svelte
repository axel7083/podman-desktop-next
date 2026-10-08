<script lang="ts">
// Adapted from podman-desktop packages/renderer/src/lib/ui/ListItemButtonIcon.svelte (Apache-2.0)
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { DropdownMenu } from '@podman-desktop/ui-svelte';
import type { Component } from 'svelte';

import LoadingIcon from './LoadingIcon.svelte';

interface Props {
  title: string;
  icon: IconDefinition | Component | string;
  hidden?: boolean;
  enabled?: boolean;
  onClick?: () => void;
  menu?: boolean;
  detailed?: boolean;
  inProgress?: boolean;
  tooltip?: string;
}

let {
  title,
  icon,
  hidden = false,
  enabled = true,
  onClick = (): void => {},
  menu = false,
  detailed = false,
  inProgress = false,
  tooltip = '',
}: Props = $props();

const buttonDetailedClass =
  'text-[var(--pd-action-button-details-text)] bg-[var(--pd-action-button-details-bg)] hover:text-[var(--pd-action-button-details-hover-text)] font-medium rounded-lg text-sm items-center px-3 py-2 text-center';
const buttonDetailedDisabledClass =
  'text-[var(--pd-action-button-details-disabled-text)] bg-[var(--pd-action-button-details-disabled-bg)] font-medium rounded-lg text-sm  items-center px-3 py-2 text-center';
const buttonClass =
  'text-[var(--pd-action-button-text)] hover:bg-[var(--pd-action-button-hover-bg)] hover:text-[var(--pd-action-button-hover-text)] font-medium rounded-full items-center px-2 py-2 text-center';
const buttonDisabledClass =
  'text-[var(--pd-action-button-disabled-text)] font-medium rounded-full items-center px-2 py-2 text-center';

function handleClick(): void {
  if (enabled && !inProgress) {
    onClick();
  }
}

const styleClass = $derived(
  detailed
    ? enabled && !inProgress
      ? buttonDetailedClass
      : buttonDetailedDisabledClass
    : enabled && !inProgress
      ? buttonClass
      : buttonDisabledClass,
);
</script>

{#if menu}
  <DropdownMenu.Item title={title} tooltip={tooltip} icon={icon} enabled={enabled} hidden={hidden} onClick={handleClick} />
{:else}
  <button
    title={title}
    aria-label={title}
    onclick={handleClick}
    class="{styleClass} relative"
    class:hidden={hidden}
    class:inline-flex={!hidden}
    disabled={!enabled}>
    <LoadingIcon icon={icon} loading={inProgress} />
  </button>
{/if}
