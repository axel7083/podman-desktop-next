<script lang="ts">
/** OpenShell gateway › Agent workspaces (Kaiden sandboxes) + "Start agent workspace". */
import { faArrowUpRightFromSquare, faPlay, faPlus, faRobot, faStop } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, Input, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';

import Dialog from '#lib/components/Dialog.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, StatusCellData } from '#lib/table/types.ts';
import { humanAge } from '#lib/world.svelte.ts';

import ModelNameCell from '../../ai-lab/components/ui/ModelNameCell.svelte';
import { providerModelLabel, providers } from '../../ai-lab/shared.ts';
import { AGENTS, openInKaiden, setPhase, startWorkspace, type Workspace, workspaces } from '../shared.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const list = $derived(workspaces());
const all = $derived(providers());
let open = $state(false);
let name = $state('acme-support-cc-2');
let agent = $state('claude');
let providerId = $state('conn:maas-rhoai-dev');
const provider = $derived(all.find(p => p.id === providerId));
let model = $state('granite-3-3-8b-instruct');
let mcp = $state<string[]>(['kubernetes-mcp-server']);
let skill = $state(true);
const MCP_CHOICES = ['kubernetes-mcp-server', 'podman-mcp-server', 'github-mcp-server'];

$effect(() => {
  if (provider && !provider.models.includes(model)) model = provider.models[0] ?? '';
});

function phase(w: Workspace): string {
  return w.phase === 'Ready' ? 'RUNNING' : w.phase === 'Provisioning' ? 'UPDATING' : w.phase === 'Error' ? 'DEGRADED' : 'EXITED';
}

const columns = $derived([
  new TableColumn<Workspace, StatusCellData>('Status', { width: '70px', align: 'center', renderer: StatusCell, renderMapping: (w): StatusCellData => ({ status: phase(w), icon: faRobot }) }),
  new TableColumn<Workspace, { title: string; sub?: string; chips: { label: string; tone?: 'primary' | 'default' }[] }>('Name', {
    width: '2fr',
    renderer: ModelNameCell,
    renderMapping: (w) => ({ title: w.name, sub: `${w.phase} · project ${w.project}`, chips: [{ label: AGENTS.find(a => a.id === w.agent)?.name ?? w.agent, tone: 'primary' }] }),
  }),
  new TableColumn<Workspace, string>('Model', { width: '2fr', renderer: TableSimpleColumn, renderMapping: (w): string => `${w.model} · ${w.provider}` }),
  new TableColumn<Workspace, string>('MCP servers', { width: '1.6fr', renderer: TableSimpleColumn, renderMapping: (w): string => w.mcp.join(', ') || '–' }),
  new TableColumn<Workspace, string>('Skills', { renderer: TableSimpleColumn, renderMapping: (w): string => w.skills.join(', ') || '–' }),
  new TableColumn<Workspace, string>('Age', { renderer: TableSimpleColumn, renderMapping: (w): string => humanAge(w.created) }),
  new TableColumn<Workspace, ActionsCellData>('Actions', {
    align: 'right',
    width: '110px',
    renderer: ActionsCell,
    renderMapping: (w): ActionsCellData => ({
      buttons: [
        { title: 'Open in Kaiden', icon: faArrowUpRightFromSquare, enabled: w.phase === 'Ready', onClick: (): void => openInKaiden(w.name) },
        { title: 'Resume workspace', icon: faPlay, hidden: w.phase !== 'Stopped', onClick: (): void => setPhase(w, true) },
        { title: 'Stop workspace', icon: faStop, hidden: w.phase === 'Stopped', inProgress: w.phase === 'Provisioning', onClick: (): void => setPhase(w, false) },
      ],
      menu: [],
    }),
  }),
]);
const row = new TableRow<Workspace>({});

function show(): void {
  open = true;
}

function close(): void {
  open = false;
}

function toggleMcp(id: string, checked: boolean): void {
  mcp = checked ? [...mcp, id] : mcp.filter(m => m !== id);
}

function toggleSkill(checked: boolean): void {
  skill = checked;
}

function start(): void {
  startWorkspace({ name, agent, provider: provider?.label ?? providerId, model, mcp, skills: skill ? ['rag-eval'] : [] });
  open = false;
}
</script>

<NavPage title="Agent workspaces" searchEnabled={false}>
  {#snippet additionalActions()}<Button icon={faPlus} onclick={show}>Start agent workspace</Button>{/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if list.length}
        {#key columns}
          <Table kind="kaiden-workspaces" data={list} {columns} {row} defaultSortColumn="Name" key={(w: Workspace): string => w.id} label={(w: Workspace): string => w.name} />
        {/key}
      {:else}
        <EmptyScreen icon={faRobot} title="No agent workspace" message="Start a coding agent in a sandbox linked to your project." />
      {/if}
    </div>
  {/snippet}
</NavPage>

{#if open}
  <Dialog title="Start agent workspace" onclose={close}>
    {#snippet content()}
      <div class="flex flex-col gap-3 text-sm">
        <p>Project <span class="font-mono">~/src/acme-support-assistant</span> is mounted into an OpenShell sandbox on podman-machine-default.</p>
        <div class="grid grid-cols-2 gap-3">
          <label>Name <Input class="mt-1" aria-label="Workspace name" bind:value={name} /></label>
          <label>Agent <Dropdown class="mt-1" ariaLabel="Agent" bind:value={agent} options={AGENTS.map(a => ({ value: a.id, label: a.name }))} /></label>
          <label>Inference provider <Dropdown class="mt-1" ariaLabel="Inference provider" bind:value={providerId} options={all.map(p => ({ value: p.id, label: p.label }))} /></label>
          <label>Model <Dropdown class="mt-1" ariaLabel="Model" bind:value={model} options={(provider?.models ?? []).map(m => ({ value: m, label: providerModelLabel(provider, m) }))} /></label>
        </div>
        <div>MCP servers</div>
        <div class="flex gap-4">
          {#each MCP_CHOICES as m (m)}
            <Checkbox checked={mcp.includes(m)} onclick={toggleMcp.bind(undefined, m)} title={m}>{m}</Checkbox>
          {/each}
        </div>
        <div>Skills</div>
        <Checkbox checked={skill} onclick={toggleSkill} title="Skill rag-eval">Skill rag-eval (~/.agents/skills/rag-eval)</Checkbox>
      </div>
    {/snippet}
    {#snippet buttons()}
      <Button type="link" onclick={close}>Cancel</Button>
      <Button onclick={start}>Start workspace</Button>
    {/snippet}
  </Dialog>
{/if}
