<script lang="ts">
/**
 * Toasts – markup from PD's toast/ToastCustomUi.svelte, stacked bottom-right
 * above the status bar. Compact (one line + optional body), at most
 * MAX_TOASTS visible; a running task shows a spinner and is replaced in place
 * by its outcome (world.toast keyed by taskId).
 */
import { faCheckCircle, faCircleExclamation, faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, CloseButton, Spinner } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { fly } from 'svelte/transition';

import { navigate } from '#lib/nav.ts';
import { ui } from '#lib/ui.svelte.ts';
import { dismissToast, type Toast, toasts } from '#lib/world.svelte.ts';

function close(t: Toast): void {
  dismissToast(t.id);
}

function openTasks(t: Toast): void {
  ui.taskManagerOpen = true;
  dismissToast(t.id);
}

function act(t: Toast): void {
  if (t.action) navigate(t.action.href);
  dismissToast(t.id);
}
</script>

<div class="fixed bottom-[30px] right-3 z-40 flex flex-col gap-1.5 items-end pointer-events-none" aria-live="polite" aria-label="Notifications toasts">
  {#each toasts as t (t.id)}
    <div
      transition:fly={{ y: 12, duration: 150 }}
      class="flex flex-nowrap select-none pointer-events-auto cursor-default max-h-28 w-[300px] flex-row py-1.5 pl-2 pr-1 border-[var(--pd-content-divider)] border rounded bg-[var(--pd-modal-bg)] gap-2 justify-between text-base shadow-lg"
      role="status"
      title={t.title}>
      <div class="flex flex-row gap-1 items-start min-w-0">
        <div class="mr-1 w-fit h-fit pt-0.5">
          {#if t.progress}
            <Spinner size="14px" />
          {:else if t.type === 'success'}
            <Icon icon={faCheckCircle} class="text-[var(--pd-state-success)] fa-lg" />
          {:else if t.type === 'error'}
            <Icon icon={faCircleExclamation} class="text-[var(--pd-state-error)] fa-lg" />
          {:else if t.type === 'warning'}
            <Icon icon={faTriangleExclamation} class="text-[var(--pd-state-warning)] fa-lg" />
          {:else}
            <Icon icon={faCircleInfo} class="text-[var(--pd-state-info)] fa-lg" />
          {/if}
        </div>
        <div class="text-base text-[var(--pd-card-text)] h-fit min-w-0">
          <div class="line-clamp-2 break-words">{t.title}</div>
          {#if t.body}<p class="text-sm text-[var(--pd-content-text)] line-clamp-2 break-words">{t.body}</p>{/if}
          {#if t.action}
            <Button type="link" padding="p-0" onclick={act.bind(undefined, t)}>{t.action.label}</Button>
          {:else if t.progress}
            <Button type="link" padding="p-0" onclick={openTasks.bind(undefined, t)}>Show progress</Button>
          {/if}
        </div>
      </div>
      <div class="flex flex-none whitespace-nowrap flex-col self-start w-fit">
        <CloseButton class="text-[var(--pd-modal-text)]" onclick={close.bind(undefined, t)} />
      </div>
    </div>
  {/each}
</div>
