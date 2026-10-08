<script lang="ts">
/**
 * Container › Dev Container tab (P14): configuration, resolved features,
 * forwarded ports, lifecycle command status and the parsed
 * `devcontainer.metadata` label, with Rebuild / Open in VS Code.
 */
import { faCode, faHammer } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import type { Container } from '#lib/world.svelte.ts';
import { world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import CopyField from '../../_appdev/CopyField.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { CONFIG_LABEL, featureShort, FOLDER_LABEL, METADATA_LABEL, openInVsCode, projectByFolder, rebuild } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const container = $derived(ctx.resource as Container);
const folder = $derived(container.labels[FOLDER_LABEL] ?? '');
const project = $derived(projectByFolder(folder));
const metadata = $derived.by(() => {
  try {
    return JSON.stringify(JSON.parse(container.labels[METADATA_LABEL] ?? '[]'), undefined, 2);
  } catch {
    return container.labels[METADATA_LABEL] ?? '';
  }
});
const features = $derived(Object.entries(project?.json.features ?? {}));
const lifecycle = $derived([
  { name: 'initializeCommand', command: '', status: 'not set' },
  { name: 'onCreateCommand', command: '', status: 'not set' },
  { name: 'postCreateCommand', command: project?.json.postCreateCommand ?? '', status: project ? `done (${project.postCreateS} s)` : 'unknown' },
  { name: 'postStartCommand', command: project?.json.postStartCommand ?? '', status: project?.json.postStartCommand ? 'done' : 'not set' },
]);

let taskId = $state<string | undefined>();
const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const rebuilding = $derived(task?.status === 'in-progress');

function versionOf(id: string): string {
  return project?.resolved.find(f => f.id === id)?.version ?? '';
}

function options(o: Record<string, string | boolean>): string {
  const entries = Object.entries(o);
  return entries.length ? entries.map(([k, v]) => `${k}=${String(v)}`).join(', ') : 'defaults';
}

function doRebuild(): void {
  taskId = rebuild(container);
}

function openVsCode(): void {
  openInVsCode(container);
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-3" aria-label="Dev Container">
  <div class="flex items-center gap-2">
    <Pill label={container.state} tone={container.state === 'RUNNING' ? 'running' : 'neutral'} />
    <span class="text-sm text-[var(--pd-content-text)]">{project?.name ?? folder} · Dev Containers CLI 0.89.0 · podman-machine-default</span>
    <span class="grow"></span>
    <Button type="secondary" icon={faHammer} onclick={doRebuild} inProgress={rebuilding} disabled={rebuilding || !project}>Rebuild</Button>
    <Button icon={faCode} onclick={openVsCode}>Open in VS Code</Button>
  </div>

  {#if task && task.status !== 'success'}
    <TaskLog {taskId} label="Rebuild progress" />
  {/if}

  <div class="grid grid-cols-2 gap-3">
    <Card title="Configuration">
      <div class="space-y-3">
        <CopyField label="Configuration file" value={container.labels[CONFIG_LABEL] ?? ''} />
        <KeyValue
          labelWidth="w-36"
          rows={[
            ['Local folder', folder],
            ['Workspace folder', project?.json.workspaceFolder],
            ['Base image', project?.json.image],
            ['Image', container.image],
            ['remoteUser', project?.json.remoteUser],
            ['runArgs', (project?.json.runArgs ?? []).join(' ')],
            ['Mounts', (project?.json.mounts ?? []).join('\n')],
          ]} />
      </div>
    </Card>
    <div class="space-y-3">
      <Card title="Forwarded ports">
        <ul class="space-y-1" aria-label="Forwarded ports">
          {#each project?.json.forwardPorts ?? [] as port (port)}
            <li class="flex items-center gap-2">
              <code>localhost:{port}</code>
              <span class="text-sm opacity-80">→ {port}{port === 5005 ? ' (JDWP debug)' : port === 9990 ? ' (management)' : ' (http)'}</span>
            </li>
          {:else}
            <li class="text-sm">No forwarded ports.</li>
          {/each}
        </ul>
      </Card>
      <Card title="Lifecycle commands">
        <table class="w-full text-left text-sm" aria-label="Lifecycle commands">
          <tbody>
            {#each lifecycle as l (l.name)}
              <tr class="border-t first:border-t-0 border-[var(--pd-content-divider)]">
                <td class="py-1.5 pr-3 font-mono">{l.name}</td>
                <td class="py-1.5 pr-3 font-mono truncate max-w-0 w-1/2" title={l.command}>{l.command}</td>
                <td class="py-1.5 text-right"><Pill label={l.status} tone={l.status.startsWith('done') ? 'success' : 'neutral'} /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Card>
    </div>
  </div>

  <Card title="Features" subtitle="OCI artifacts resolved from GHCR">
    <table class="w-full text-left" aria-label="Features">
      <thead>
        <tr class="text-sm text-[var(--pd-table-body-text)]">
          <th class="py-1 font-normal">Feature</th>
          <th class="py-1 font-normal">Id</th>
          <th class="py-1 font-normal">Options</th>
          <th class="py-1 font-normal text-right">Version</th>
        </tr>
      </thead>
      <tbody>
        {#each features as [id, opts] (id)}
          <tr class="border-t border-[var(--pd-content-divider)]">
            <td class="py-1.5 font-medium text-[var(--pd-content-card-header-text)]">{featureShort(id)}</td>
            <td class="py-1.5 font-mono text-sm">{id}</td>
            <td class="py-1.5 text-sm">{options(opts)}</td>
            <td class="py-1.5 text-right tabular-nums">{versionOf(id)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>

  <Card title="devcontainer.metadata" subtitle="Merged image and feature metadata (container label)" inset>
    <pre class="max-h-56 overflow-auto text-xs font-mono">{metadata}</pre>
  </Card>
</div>
