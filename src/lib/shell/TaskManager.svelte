<script lang="ts">
/**
 * Task manager panel – frame from PD's task-manager/TaskManager.svelte
 * (fixed bottom-right modal surface with NavPage "Tasks").
 */
import { faCheckCircle, faCircleExclamation, faTrash, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Button, CloseButton, EmptyScreen, NavPage, ProgressBar, Spinner } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import { getExtension } from '#lib/ext/registry.svelte.ts';
import TaskIcon from '#lib/images/TaskIcon.svelte';
import { navigate } from '#lib/nav.ts';
import { ui } from '#lib/ui.svelte.ts';
import { cancelTask, clearCompletedTasks, humanAge, timeAgo, type Task, world } from '#lib/world.svelte.ts';

let searchTerm = $state('');
let tab = $state<'all' | 'running' | 'done'>('all');
let expandedTask = $state<string | undefined>();

const tasks = $derived(
  world.tasks
    .filter(t => (tab === 'running' ? t.status === 'in-progress' : tab === 'done' ? t.status !== 'in-progress' : true))
    .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())),
);

function hide(): void {
  ui.taskManagerOpen = false;
}

function setTab(t: 'all' | 'running' | 'done'): void {
  tab = t;
}

function toggleLogs(task: Task): void {
  expandedTask = expandedTask === task.id ? undefined : task.id;
}

function cancel(task: Task): void {
  cancelTask(task.id);
}

function openAction(task: Task): void {
  if (!task.action) return;
  hide();
  navigate(task.action.href);
}

function onKeydown(e: KeyboardEvent): void {
  if (ui.taskManagerOpen && e.key === 'Escape') hide();
}
</script>

<svelte:window onkeydown={onKeydown} />

{#if ui.taskManagerOpen}
  <div
    class="fixed bottom-8 right-4 bg-[var(--pd-modal-bg)] min-h-96 h-3/4 w-[min(900px,calc(100%-52px-var(--spacing-leftnavbar)))] z-40 border border-[var(--pd-modal-border)] rounded-md shadow-xl shadow-(--pd-modal-shadow)"
    role="dialog"
    aria-label="Task Manager">
    <NavPage title="Tasks" bind:searchTerm={searchTerm}>
      {#snippet additionalActions()}
        <Button type="secondary" icon={faTrash} onclick={clearCompletedTasks} title="Clear completed tasks">Clear completed</Button>
        <CloseButton onclick={hide} />
      {/snippet}
      {#snippet tabs()}
        <Button type="tab" selected={tab === 'all'} onclick={setTab.bind(undefined, 'all')}>All</Button>
        <Button type="tab" selected={tab === 'running'} onclick={setTab.bind(undefined, 'running')}>Running</Button>
        <Button type="tab" selected={tab === 'done'} onclick={setTab.bind(undefined, 'done')}>Completed</Button>
      {/snippet}
      {#snippet content()}
        <div class="flex flex-col min-w-full grow px-5 gap-2 pb-4">
          {#if tasks.length === 0}
            <EmptyScreen icon={TaskIcon} title="No tasks" message="Long-running actions (create a machine, install an add-on…) show up here." />
          {/if}
          {#each tasks as task (task.id)}
            {@const ext = task.ext ? getExtension(task.ext) : undefined}
            <div class="bg-[var(--pd-content-card-bg)] rounded-lg px-4 py-3" role="row" aria-label={task.name}>
              <div class="flex items-center gap-3">
                <div class="w-5 flex justify-center text-[var(--pd-state-info)]">
                  {#if task.status === 'in-progress'}
                    <Spinner size="1.2em" />
                  {:else if task.status === 'success'}
                    <Icon icon={faCheckCircle} class="text-[var(--pd-state-success)]" />
                  {:else if task.status === 'failure'}
                    <Icon icon={faCircleExclamation} class="text-[var(--pd-state-error)]" />
                  {:else}
                    <Icon icon={faTriangleExclamation} class="text-[var(--pd-state-warning)]" />
                  {/if}
                </div>
                <div class="flex flex-col grow min-w-0">
                  <button class="text-left text-[var(--pd-table-body-text-highlight)] truncate hover:text-[var(--pd-link)]" onclick={toggleLogs.bind(undefined, task)}>
                    {task.name}
                  </button>
                  <div class="text-xs text-[var(--pd-table-body-text)] flex items-center gap-2">
                    {#if ext}<span class="flex items-center gap-1"><AppIcon icon={ext.icon} size="11px" />{ext.displayName}</span>{/if}
                    <span>{task.status === 'in-progress' ? (task.step ?? 'Running') : task.status === 'success' ? 'Completed' : task.status === 'failure' ? (task.error ?? 'Failed') : 'Canceled'}</span>
                    <span>· {timeAgo(task.started)}</span>
                  </div>
                </div>
                {#if task.status === 'in-progress'}
                  <div class="flex items-center gap-2 w-48">
                    <ProgressBar progress={task.progress} width="w-36" height="h-1.5" />
                    <span class="text-xs tabular-nums w-8 text-right">{task.progress}%</span>
                  </div>
                  <button class="text-[var(--pd-action-button-text)] hover:text-[var(--pd-action-button-hover-text)] p-1" title="Cancel task" aria-label="Cancel task" onclick={cancel.bind(undefined, task)}>
                    <Icon icon={faXmark} />
                  </button>
                {:else if task.action && task.status === 'success'}
                  <Button type="link" onclick={openAction.bind(undefined, task)}>{task.action.label}</Button>
                {/if}
              </div>
              {#if expandedTask === task.id}
                <pre class="mt-2 max-h-40 overflow-auto rounded-md bg-[var(--pd-code-block-bg)] ring-1 ring-inset ring-[var(--pd-code-block-border)] text-[var(--pd-code-block-text)] p-2 text-xs font-mono">{task.logs.join('\n') || 'No output'}</pre>
              {/if}
            </div>
          {/each}
        </div>
      {/snippet}
    </NavPage>
  </div>
{/if}
