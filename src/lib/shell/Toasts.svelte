<script lang="ts">
/** Toasts – markup from PD's toast/ToastCustomUi.svelte, stacked bottom-right above the status bar. */
import { faCheckCircle, faCircleExclamation, faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, CloseButton } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { fly } from 'svelte/transition';

import { navigate } from '#lib/nav.ts';
import { dismissToast, type Toast, toasts } from '#lib/world.svelte.ts';

function close(t: Toast): void {
  dismissToast(t.id);
}

function act(t: Toast): void {
  if (t.action) navigate(t.action.href);
  dismissToast(t.id);
}
</script>

<div class="fixed bottom-8 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
  {#each toasts as t (t.id)}
    <div
      transition:fly={{ y: 12, duration: 150 }}
      class="flex flex-nowrap min-h-10 select-none pointer-events-auto cursor-default max-h-50 w-[320px] flex-row p-2 border-[var(--pd-content-divider)] border rounded bg-[var(--pd-modal-bg)] gap-2 justify-between text-base shadow-lg"
      role="status"
      title={t.title}>
      <div class="flex flex-row gap-1 items-start min-w-0">
        <div class="mr-1 w-fit h-fit pt-0.5">
          {#if t.type === 'success'}
            <Icon icon={faCheckCircle} class="text-[var(--pd-state-success)] fa-xl" />
          {:else if t.type === 'error'}
            <Icon icon={faCircleExclamation} class="text-[var(--pd-state-error)] fa-xl" />
          {:else if t.type === 'warning'}
            <Icon icon={faTriangleExclamation} class="text-[var(--pd-state-warning)] fa-xl" />
          {:else}
            <Icon icon={faCircleInfo} class="text-[var(--pd-state-info)] fa-xl" />
          {/if}
        </div>
        <div class="text-base text-[var(--pd-card-text)] h-fit break-words min-w-0">
          {t.title}
          {#if t.body}<p class="text-[var(--pd-content-text)]">{t.body}</p>{/if}
          {#if t.action}<Button type="link" padding="p-0" onclick={act.bind(undefined, t)}>{t.action.label}</Button>{/if}
        </div>
      </div>
      <div class="flex flex-none whitespace-nowrap flex-col self-start w-fit">
        <CloseButton class="text-[var(--pd-modal-text)]" onclick={close.bind(undefined, t)} />
      </div>
    </div>
  {/each}
</div>
