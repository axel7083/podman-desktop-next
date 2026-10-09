<script lang="ts">
/**
 * Tools › Dev Containers (P3/P15): projects with a `.devcontainer/devcontainer.json`,
 * their containers, and the "Open folder in dev container" wizard that runs
 * `devcontainer up` as a task. `?open=1` opens the wizard.
 */
import { faArrowUpRightFromSquare, faBoxOpen, faFolderOpen, faPlay } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, Input, NavPage } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';
import { page } from '$app/state';

import { href, navigate, appUrl } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { CLI_VERSION, containerOf, devcontainerUp, featureShort, type Project, PROJECTS, projectByFolder, upCommand } from '../data.ts';

let wizardOpen = $state(false);
let folder = $state(PROJECTS[0].path);
let configFile = $state(PROJECTS[0].configPath);
let keepId = $state(true);
let removeExisting = $state(false);
let taskId = $state<string | undefined>();
let wizard = $state<HTMLElement>();

const project = $derived(projectByFolder(folder.trim()));
const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const running = $derived(task?.status === 'in-progress');
const existing = $derived(project ? containerOf(project) : undefined);
const configOptions = $derived(project ? [{ value: project.configPath, label: project.configPath }] : [{ value: '.devcontainer/devcontainer.json', label: '.devcontainer/devcontainer.json' }]);

$effect(() => {
  if (appUrl().searchParams.get('open') === '1') {
    wizardOpen = true;
    wizard?.scrollIntoView({ block: 'nearest' });
  }
});

function openWizard(): void {
  wizardOpen = true;
}

function openFor(p: Project): void {
  folder = p.path;
  configFile = p.configPath;
  taskId = undefined;
  wizardOpen = true;
}

function browse(): void {
  const i = PROJECTS.findIndex(p => p.path === folder.trim());
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  folder = next.path;
  configFile = next.configPath;
}

function cancel(): void {
  wizardOpen = false;
  taskId = undefined;
  if (appUrl().searchParams.has('open')) navigate('/tools/devcontainers', true);
}

function start(): void {
  if (!project) return;
  taskId = devcontainerUp(project, { keepId, removeExisting });
}

function openContainer(): void {
  const c = project ? containerOf(project) : undefined;
  if (c) navigate(`/c/${c.engineId}/containers/${c.id}/devcontainer`);
}

function json(p: Project): string {
  return JSON.stringify(p.json, undefined, 2);
}

function containerHref(p: Project): string | undefined {
  const c = containerOf(p);
  return c ? href(`/c/${c.engineId}/containers/${c.id}/devcontainer`) : undefined;
}
</script>

<NavPage title="Dev Containers" searchEnabled={false}>
  {#snippet additionalActions()}
    <Button icon={faBoxOpen} onclick={openWizard}>Open folder in dev container</Button>
  {/snippet}
  {#snippet content()}
    <div class="w-full h-full overflow-auto px-5 pb-4 space-y-3">
      <p class="text-sm text-[var(--pd-content-text)]">
        Projects with a <code>.devcontainer/devcontainer.json</code> in <code>~/dev</code>. Containers are built and started on podman-machine-default with the
        Dev Containers CLI {CLI_VERSION} (<code>--docker-path podman</code>).
      </p>

      {#if wizardOpen}
        <div bind:this={wizard}>
          <Card title="Open folder in dev container" subtitle="Runs devcontainer up: resolves features, builds the image, starts the container and runs the lifecycle commands.">
            <div class="space-y-3 max-w-[720px]" role="group" aria-label="Open folder in dev container">
              <div class="flex flex-col gap-1">
                <label for="devc-folder" class="text-sm">Folder</label>
                <div class="flex gap-2">
                  <Input id="devc-folder" class="grow" bind:value={folder} aria-label="Folder" disabled={running} error={project ? undefined : 'No .devcontainer/devcontainer.json found in this folder'} />
                  <Button type="secondary" icon={faFolderOpen} onclick={browse} disabled={running}>Browse…</Button>
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <label for="devc-config" class="text-sm">Configuration file</label>
                <Dropdown id="devc-config" bind:value={configFile} options={configOptions} ariaLabel="Configuration file" disabled={running} />
              </div>
              <div class="flex flex-col gap-2">
                <Checkbox bind:checked={keepId} disabled={running} title="Add --userns=keep-id (rootless Podman)">Add --userns=keep-id (rootless Podman)</Checkbox>
                <Checkbox bind:checked={removeExisting} disabled={running} title="Remove existing container">
                  Remove existing container{existing ? ` (${existing.name})` : ''}
                </Checkbox>
              </div>
              {#if project}
                <code class="block rounded-md px-2 py-1.5 text-sm font-mono bg-[var(--pd-content-card-inset-surface)] wrap-anywhere">{upCommand(project, removeExisting)}</code>
              {/if}
              <div class="flex items-center gap-3">
                <Button icon={faPlay} onclick={start} disabled={!project || running} inProgress={running}>Start dev container</Button>
                {#if task?.status === 'success'}
                  <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={openContainer}>Open container</Button>
                {/if}
                <Button type="link" onclick={cancel}>{task?.status === 'success' ? 'Close' : 'Cancel'}</Button>
              </div>
              <TaskLog {taskId} label="devcontainer up progress" />
            </div>
          </Card>
        </div>
      {/if}

      {#each PROJECTS as p (p.path)}
        {@const c = containerOf(p)}
        {@const link = containerHref(p)}
        <Card title={p.name} subtitle="{p.path} · {p.stack}">
          {#snippet actions()}
            <div class="flex items-center gap-2">
              {#if c}
                <Pill label={c.state} tone={c.state === 'RUNNING' ? 'running' : 'neutral'} />
                <a class="text-sm text-[var(--pd-link)]" href={link}>{c.name}</a>
              {:else}
                <Pill label="No container" />
              {/if}
              <Button type="secondary" icon={faBoxOpen} onclick={openFor.bind(undefined, p)} aria-label="Open {p.name} in dev container">
                {c ? 'Reopen in dev container' : 'Open in dev container'}
              </Button>
            </div>
          {/snippet}
          <div class="grid grid-cols-[1fr_1fr] gap-4">
            <div class="space-y-2 text-sm">
              <div><span class="text-[var(--pd-table-body-text)]">Image</span> <code>{p.json.image}</code></div>
              <div class="flex flex-wrap items-center gap-1">
                <span class="text-[var(--pd-table-body-text)] mr-1">Features</span>
                {#each Object.keys(p.json.features ?? {}) as f (f)}<Pill label={featureShort(f)} tone="info" title={f} />{/each}
              </div>
              <div><span class="text-[var(--pd-table-body-text)]">Forward ports</span> {(p.json.forwardPorts ?? []).join(', ')}</div>
              <div><span class="text-[var(--pd-table-body-text)]">postCreateCommand</span> <code>{p.json.postCreateCommand}</code></div>
              <div><span class="text-[var(--pd-table-body-text)]">remoteUser</span> {p.json.remoteUser} · <span class="text-[var(--pd-table-body-text)]">runArgs</span> <code>{(p.json.runArgs ?? []).join(' ')}</code></div>
            </div>
            <details class="min-w-0">
              <summary class="cursor-pointer text-sm text-[var(--pd-link)]">{p.configPath}</summary>
              <pre class="mt-2 max-h-64 overflow-auto rounded-md p-2 text-xs font-mono bg-[var(--pd-content-card-inset-surface)]" aria-label="{p.name} devcontainer.json">{json(p)}</pre>
            </details>
          </div>
        </Card>
      {/each}
    </div>
  {/snippet}
</NavPage>
