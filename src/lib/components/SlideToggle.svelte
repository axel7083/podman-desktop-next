<script lang="ts">
// Adapted from podman-desktop packages/renderer/src/lib/ui/SlideToggle.svelte (Apache-2.0), Svelte 5 callback props
import type { Snippet } from 'svelte';

interface Props {
  id: string;
  checked?: boolean;
  disabled?: boolean;
  left?: boolean;
  'aria-label'?: string;
  onchange?: (checked: boolean) => void;
  children?: Snippet;
}

let { id, checked = false, disabled = false, left = false, 'aria-label': ariaLabel, onchange, children }: Props = $props();

function onInput(event: Event & { currentTarget: HTMLInputElement }): void {
  onchange?.(event.currentTarget.checked);
}
</script>

<label class="inline-flex items-center cursor-pointer" for={id}>
  {#if left && children}
    <span
      class="mr-3 text-sm"
      class:text-[var(--pd-input-toggle-on-text)]={checked}
      class:text-[var(--pd-input-toggle-off-text)]={!checked}>{@render children()}</span>
  {/if}
  <div class="relative inline-flex items-center cursor-pointer">
    <input id={id} type="checkbox" class="sr-only peer" oninput={onInput} checked={checked} disabled={disabled} aria-label={ariaLabel} />
    <div
      class="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-4 after:w-4 after:transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--pd-input-toggle-on-bg)]"
      class:bg-[var(--pd-input-toggle-off-bg)]={!disabled}
      class:hover:bg-[var(--pd-input-toggle-off-focused-bg)]={!disabled}
      class:after:bg-[var(--pd-input-toggle-switch)]={!disabled}
      class:hover:after:bg-[var(--pd-input-toggle-focused-switch)]={!disabled}
      class:peer-checked:bg-[var(--pd-input-toggle-on-bg)]={!disabled}
      class:hover:peer-checked:bg-[var(--pd-input-toggle-on-focused-bg)]={!disabled}
      class:bg-[var(--pd-input-toggle-off-disabled-bg)]={disabled}
      class:peer-checked:bg-[var(--pd-input-toggle-on-disabled-bg)]={disabled}
      class:after:bg-[var(--pd-input-toggle-disabled-switch)]={disabled}>
    </div>
  </div>
  {#if !left && children}
    <span
      class="ml-3"
      class:text-[var(--pd-input-toggle-on-text)]={checked && !disabled}
      class:text-[var(--pd-input-toggle-off-text)]={!checked && !disabled}
      class:text-[var(--pd-input-toggle-disabled-text)]={disabled}>{@render children()}</span>
  {/if}
</label>
