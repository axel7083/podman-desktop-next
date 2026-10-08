/** Kaiden bridge: agent workspaces (OpenShell sandboxes on Podman) and agents. */
import { mkContainer } from '#lib/ext/helpers.ts';
import { runTask, toast, uid, world } from '#lib/world.svelte.ts';

import { ENGINE } from '../ai-lab/shared.ts';

export const KAIDEN = 'redhat.kaiden-bridge';
export const GROUP_LABEL = 'ai.openkaiden.sandbox';

export const AGENTS = [
  { id: 'claude', name: 'Claude Code', command: 'claude', baseImage: 'ghcr.io/openkaiden/openshell-image-claude:fd194d5', skills: '${HOME}/.claude/skills', tags: ['Cloud'] },
  { id: 'goose', name: 'Goose', command: 'goose', baseImage: 'ghcr.io/openkaiden/openshell-image-goose:3b71c0e', skills: '${HOME}/.agents/skills', tags: [] },
  { id: 'opencode', name: 'OpenCode', command: 'opencode', baseImage: 'ghcr.io/openkaiden/openshell-image-opencode:a0d42e9', skills: '${HOME}/.opencode/skills', tags: [] },
  { id: 'codex', name: 'Codex', command: 'codex', baseImage: 'ghcr.io/openkaiden/openshell-image-codex:5e1f7a2', skills: '${HOME}/.codex/skills', tags: ['Cloud'] },
  { id: 'cursor', name: 'Cursor', command: 'cursor', baseImage: 'ghcr.io/openkaiden/openshell-image-cursor:c81d0b4', skills: '~/.cursor/skills', tags: ['Cloud'] },
];

export interface Workspace {
  id: string;
  name: string;
  agent: string;
  model: string;
  provider: string;
  project: string;
  skills: string[];
  mcp: string[];
  phase: 'Provisioning' | 'Ready' | 'Stopped' | 'Error';
  containerId?: string;
  created: number;
}

export function workspaces(): Workspace[] {
  return ((world.ext[KAIDEN] as { workspaces?: Workspace[] } | undefined)?.workspaces ?? []) as Workspace[];
}

function sandbox(w: Workspace, upM = 60): ReturnType<typeof mkContainer> {
  const agent = AGENTS.find(a => a.id === w.agent);
  return mkContainer(ENGINE, {
    name: `openshell-${w.name}`,
    image: agent?.baseImage ?? '',
    labels: { [GROUP_LABEL]: 'openshell', 'ai.openkaiden.workspace': w.name, 'ai.openkaiden.agent': w.agent },
    command: agent?.command,
    upM,
    logs: ['sandbox phase Provisioning -> Ready', `inference.set provider=${w.provider} model=${w.model}`, `copying ${w.skills.length} skill(s) to ${agent?.skills}`],
  });
}

export function seedKaiden(): void {
  const gw = mkContainer(ENGINE, {
    name: 'openshell-gateway',
    image: 'ghcr.io/nvidia/openshell/gateway:0.0.71',
    ports: [[41871, 8443]],
    labels: { [GROUP_LABEL]: 'openshell', 'ai.openkaiden.openshell-podman-gateway.port': '41871' },
    upM: 240,
  });
  world.containers.push(gw);
  const list: Workspace[] = [
    { id: 'ws-7c41e2', name: 'acme-support-cc', agent: 'claude', model: 'granite-3-3-8b-instruct', provider: 'acme MaaS (rhoai-dev)', project: 'acme-support-assistant', skills: ['rag-eval'], mcp: ['kubernetes-mcp-server'], phase: 'Ready', created: Date.now() - 2 * 3600_000 },
    { id: 'ws-19ab03', name: 'openshell-goose-docs', agent: 'goose', model: 'llama-3-3-70b-instruct', provider: 'acme MaaS (rhoai-dev)', project: 'acme-support-assistant', skills: [], mcp: ['github-mcp-server', 'podman-mcp-server'], phase: 'Stopped', created: Date.now() - 18 * 3600_000 },
  ];
  for (const w of list) {
    const c = sandbox(w);
    if (w.phase !== 'Ready') c.state = 'EXITED';
    world.containers.push(c);
    w.containerId = c.id;
  }
  world.ext[KAIDEN] = { workspaces: list };
}

export interface StartOptions {
  name: string;
  agent: string;
  provider: string;
  model: string;
  mcp: string[];
  skills: string[];
}

export function startWorkspace(o: StartOptions): void {
  const agent = AGENTS.find(a => a.id === o.agent);
  const w: Workspace = { id: uid('ws'), name: o.name, agent: o.agent, model: o.model, provider: o.provider, project: 'acme-support-assistant', skills: o.skills, mcp: o.mcp, phase: 'Provisioning', created: Date.now() };
  workspaces().push(w);
  const ws = workspaces()[workspaces().length - 1];
  runTask({
    name: `Creating agent workspace ${o.name}`,
    ext: KAIDEN,
    steps: [
      { label: `Pulling ${agent?.baseImage}`, ms: 2200 },
      { label: 'Gateway ready on 127.0.0.1:41871', ms: 500 },
      { label: 'sandbox phase Provisioning → Ready', ms: 1800 },
      { label: `Copying ${o.skills.length} skill(s) to ${agent?.skills}`, ms: 400 },
      { label: `inference.set provider=${o.provider} model=${o.model}`, ms: 400 },
      ...(o.mcp.length ? [{ label: `Registering MCP servers: ${o.mcp.join(', ')}`, ms: 500 }] : []),
    ],
    action: { label: 'Open Kaiden sandboxes', href: '/c/podman-machine-default/containers' },
    onDone: () => {
      const c = sandbox(ws, 0);
      world.containers.push(c);
      ws.containerId = c.id;
      ws.phase = 'Ready';
    },
  });
}

export function setPhase(w: Workspace, running: boolean): void {
  const c = world.containers.find(x => x.id === w.containerId);
  w.phase = running ? 'Ready' : 'Stopped';
  if (c) c.state = running ? 'RUNNING' : 'EXITED';
}

export function openInKaiden(name: string): void {
  toast({ type: 'info', title: `Opening ${name} in Kaiden`, body: `kaiden://agent-workspaces/${name}` });
}
