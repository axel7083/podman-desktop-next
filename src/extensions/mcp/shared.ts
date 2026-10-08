import { mkContainer } from '#lib/ext/helpers.ts';
import { runTask, toast, uid, world } from '#lib/world.svelte.ts';

import { ENGINE } from '../ai-lab/shared.ts';
import { CLIENTS, type InstalledServer, type McpPackage, type McpServerEntry, REGISTRY, shortName } from './data.ts';

export const MCP = 'podman-desktop.mcp';
export const GROUP_LABEL = 'io.modelcontextprotocol.gateway';
export const TOOL = '/tools/mcp';

export interface McpState {
  installed: InstalledServer[];
}

export function mcp(): McpState {
  return (world.ext[MCP] as unknown as McpState | undefined) ?? { installed: [] };
}

export function entry(name: string): McpServerEntry | undefined {
  return REGISTRY.find(e => e.name === name);
}

export function seedMcp(): void {
  const gw = mkContainer(ENGINE, {
    name: 'mcp-gateway',
    image: 'docker.io/docker/mcp-gateway:v2',
    ports: [[8811, 8811]],
    labels: { [GROUP_LABEL]: 'mcp-gateway' },
    command: 'mcp-gateway --transport streaming --port 8811',
    upM: 180,
  });
  world.containers.push(gw);
  const state: McpState = {
    installed: [
      { id: 'mcp-podman', name: 'io.github.manusa/podman-mcp-server', entry: 'io.github.manusa/podman-mcp-server', kind: 'process', endpoint: 'podman-mcp-server@0.0.15', status: 'running', clients: ['cursor', 'kaiden'] },
      { id: 'mcp-github', name: 'io.github.github/github-mcp-server', entry: 'io.github.github/github-mcp-server', kind: 'remote', endpoint: 'https://api.githubcopilot.com/mcp/', status: 'running', clients: ['vscode'] },
    ],
  };
  world.ext[MCP] = state as unknown as Record<string, unknown>;
}

export function install(e: McpServerEntry, pkg: McpPackage, opts: { kubeconfig: boolean; readOnly: boolean }, onDone?: (id: string) => void): void {
  const id = uid('mcp');
  const isOci = pkg.registryType === 'oci';
  const port = 8080 + mcp().installed.filter(s => s.kind === 'container').length;
  const endpoint = isOci ? (pkg.url ?? `http://localhost:${port}/mcp`) : pkg.identifier;
  runTask({
    name: `Starting ${shortName(e.name)}`,
    ext: MCP,
    steps: isOci
      ? [
          { label: `podman pull ${pkg.identifier}`, ms: 1600 },
          {
            label: `podman run -d -p ${port}:8080${opts.kubeconfig ? ' -v ~/.kube/config:/kubeconfig:ro -e KUBECONFIG=/kubeconfig' : ''} ${pkg.identifier}${opts.readOnly ? ' --read-only' : ''}`,
            ms: 900,
          },
          { label: 'initialize ok, protocolVersion 2025-11-25', ms: 500 },
          { label: `tools/list → ${e.totalTools} tools`, ms: 400 },
        ]
      : [
          { label: `npx -y ${pkg.identifier}`, ms: 1400 },
          { label: 'initialize ok (stdio)', ms: 400 },
          { label: `tools/list → ${e.totalTools} tools`, ms: 300 },
        ],
    action: { label: 'Open server', href: `${TOOL}?server=${id}` },
    onDone: () => {
      let containerId: string | undefined;
      if (isOci) {
        const c = mkContainer(ENGINE, {
          name: shortName(e.name),
          image: pkg.identifier,
          ports: [[port, 8080]],
          labels: { [GROUP_LABEL]: 'mcp-gateway', 'io.modelcontextprotocol.server': e.name },
          command: `--port 8080${opts.readOnly ? ' --read-only' : ''}`,
          upM: 0,
          logs: ['I1008 08:10:33 server.go:118] Starting kubernetes-mcp-server v0.0.67', 'I1008 08:10:33 http.go:61] Streamable HTTP server listening on :8080/mcp'],
        });
        world.containers.push(c);
        containerId = c.id;
      }
      (world.ext[MCP] as unknown as McpState).installed.push({ id, name: e.name, entry: e.name, kind: isOci ? 'container' : 'process', endpoint, status: 'running', clients: [], containerId });
      onDone?.(id);
    },
  });
}

export function addToClient(serverId: string, client: string): void {
  const s = mcp().installed.find(x => x.id === serverId);
  const c = CLIENTS.find(x => x.id === client);
  if (!s || !c) return;
  runTask({
    name: `Updating ${c.file.split('/').pop()} for ${c.label}`,
    ext: MCP,
    steps: [{ label: `Writing ${c.file}`, ms: 700 }],
    onDone: () => {
      if (!s.clients.includes(client)) s.clients.push(client);
      toast({ type: 'success', title: `${shortName(s.name)} added to ${c.label}` });
    },
  });
}

export function removeServer(id: string): void {
  const st = world.ext[MCP] as unknown as McpState;
  const s = st.installed.find(x => x.id === id);
  if (!s) return;
  st.installed = st.installed.filter(x => x.id !== id);
  if (s.containerId) world.containers = world.containers.filter(c => c.id !== s.containerId);
  toast({ type: 'success', title: `MCP server ${shortName(s.name)} removed` });
}
