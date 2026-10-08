/**
 * podman-desktop.mcp (proposed) – MCP hub: an "MCP gateway" service
 * connection (P8), an "MCP servers" tool (P3: registry catalog, install as
 * container task, tools, "Add to client" with config diff), a container
 * grouper (P10) and an MCPServer section under clusters with the CRD (P2/P4).
 */
import { faPlug } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionView, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import McpTool from './components/McpTool.svelte';
import RhoaiMcp from './components/RhoaiMcp.svelte';
import { GROUP_LABEL, MCP, mcp, seedMcp, TOOL } from './shared.ts';

const icon = 'icons/podman-desktop.mcp.png';

const extension: MockExtension = {
  id: MCP,
  displayName: 'MCP Servers',
  publisher: 'podman-desktop',
  description: 'Browse the official MCP registry, run MCP servers as Podman containers or local processes and wire them into Claude Code, Cursor, VS Code and Kaiden.',
  version: '0.1.0',
  icon,
  dependsOn: ['podman-desktop.podman'],
  tags: ['ai'],
  pApis: ['P2', 'P3', 'P4', 'P8', 'P10', 'P15'],
  contributes: {
    connections: [
      {
        id: 'mcp-gateway',
        name: 'MCP gateway',
        kind: 'service',
        providerId: 'mcp',
        providerName: 'MCP',
        initialStatus: 'started',
        endpoint: 'http://localhost:8811/mcp',
        version: 'docker/mcp-gateway v2',
        details: { Transport: 'streamable-http', Image: 'docker.io/docker/mcp-gateway:v2', 'Runs on': 'podman-machine-default' },
        capabilities: ['mcp'],
      },
    ],
    tools: [{ id: 'mcp', label: 'MCP servers', icon, description: 'MCP registry, installed servers and clients', component: McpTool, badge: (): number | undefined => mcp().installed.length || undefined }],
    navSections: [
      { id: 'rhoai-mcp', label: 'MCP servers', icon, when: (c: ConnectionView): boolean => !!c.capabilities?.includes('kube.crd:mcpservers'), component: RhoaiMcp, order: 30, counter: (w, c): number => (w.kube[c.id] ?? []).filter(o => o.kind === 'MCPServer').length },
    ],
    groupers: [{ id: 'mcp-gateway', label: GROUP_LABEL, typeName: 'MCP', icon }],
    commands: [
      { id: 'mcp.registry', title: 'Search the MCP registry', category: 'MCP', icon: faPlug, run: (): void => navigate(`${TOOL}?tab=registry`) },
      { id: 'mcp.installed', title: 'Open installed MCP servers', category: 'MCP', run: (): void => navigate(TOOL) },
    ],
    settings: [
      {
        id: 'mcp',
        title: 'MCP',
        properties: [
          { id: 'mcp.registries', title: 'MCP registries', type: 'string', default: 'https://registry.modelcontextprotocol.io' },
          { id: 'mcp.defaultPackage', title: 'Preferred package type', type: 'enum', default: 'oci', enum: ['oci', 'npm', 'pypi'] },
        ],
      },
    ],
  },
  seed(): void {
    seedMcp();
  },
};

export default extension;
