<script lang="ts">
/**
 * PD dialog markup (renderer Dialog.svelte) without the clipped `max-h-80`
 * body, so ui-svelte Dropdowns can open. `wide` copies ui-svelte Modal's
 * markup with a larger max width (playbook previews need ~60rem).
 */
import { CloseButton, Modal } from '@podman-desktop/ui-svelte';
import type { Snippet } from 'svelte';

interface Props {
  title: string;
  onclose: () => void;
  wide?: boolean;
  icon?: Snippet;
  content?: Snippet;
  buttons?: Snippet;
}

let { title, onclose, wide = false, icon, content, buttons }: Props = $props();

let box = $state<HTMLDivElement>();

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') onclose();
}

function onMousedown(e: MouseEvent): void {
  if (box && e.target instanceof Node && !box.contains(e.target)) onclose();
}

$effect(() => {
  if (!wide) return;
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('mousedown', onMousedown);
  return (): void => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('mousedown', onMousedown);
  };
});
</script>

{#snippet body()}
  <div class="flex items-center justify-between pl-4 pr-3 py-3 space-x-2 text-[var(--pd-modal-header-text)]">
    {@render icon?.()}
    <h1 class="grow text-lg font-bold">{title}</h1>
    <CloseButton onclick={onclose} />
  </div>
  <div class="relative text-[var(--pd-modal-text)] {wide ? 'px-6' : 'px-10'} py-4">
    {@render content?.()}
  </div>
  <div class="px-5 py-5 mt-2 flex flex-row w-full justify-end space-x-2">
    {@render buttons?.()}
  </div>
{/snippet}

{#if wide}
  <div class="fixed top-0 left-0 right-0 bottom-0 w-full h-full flex justify-center items-center z-50">
    <div aria-hidden="true" class="fixed top-0 left-0 w-full h-full bg-[var(--pd-modal-fade)] bg-blend-multiply opacity-60 z-40 cursor-default"></div>
    <div
      bind:this={box}
      class="bg-[var(--pd-modal-bg)] z-50 rounded-xl w-[calc(100vw-4rem)] max-w-[64rem] max-h-[calc(100vh-4rem)] overflow-auto border-[1px] border-[var(--pd-modal-border)]"
      role="dialog"
      aria-label={title}
      aria-modal="true">
      {@render body()}
    </div>
  </div>
{:else}
  <Modal name={title} {onclose}>
    {@render body()}
  </Modal>
{/if}
