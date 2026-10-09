/**
 * P13: extension tree providers. An extension contributes its own sub-tree to
 * a connection (root → children → grandchildren), rendered in the left tree;
 * clicking a node opens it in a tab (`{ kind: 'node', nodeId }`).
 */
import {
  faBolt,
  faBoxArchive,
  faClockRotateLeft,
  faComments,
  faCube,
  faFileLines,
  faMessage,
  faRobot,
  faServer,
} from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

export interface TreeNode {
  id: string;
  label: string;
  icon?: IconRef;
  status?: string;
  /** Dim text after the label. */
  detail?: string;
  children?: TreeNode[];
}

export interface TreeProvider {
  id: string;
  /** Extension providing the tree (see `r3/exts.ts`). */
  extId: string;
  label: string;
  /** Extension logo (root icon). */
  icon: string;
  /** Connections the tree is contributed to. */
  connIds: string[];
  /** Flat sections of the dataset the tree replaces in P13. */
  replaces: string[];
  build: (connId: string) => Raw[];
}

export type Raw = Omit<TreeNode, 'id' | 'children'> & { children?: Raw[] };

const MCP_SERVERS: [string, string[], string[], string[]][] = [
  ['github', ['list_issues', 'create_pull_request', 'get_file_contents', 'search_code'], ['repo://acme/orders'], ['review-pr']],
  ['kubernetes', ['pods_list', 'pods_log', 'resources_get', 'events_list'], ['kubeconfig://current'], []],
  ['podman', ['container_list', 'container_run', 'image_pull'], [], ['debug-container']],
  ['filesystem', ['read_file', 'write_file', 'list_directory'], ['file:///home/dev/orders'], []],
  ['postgres', ['query', 'list_tables'], ['postgres://orders-db/orders'], ['explain-query']],
];

const mcp = (): Raw[] =>
  MCP_SERVERS.map(([name, tools, resources, prompts], i) => ({
    label: name,
    icon: faServer,
    status: i === 3 ? 'stopped' : 'running',
    detail: `${tools.length} tools`,
    children: [
      { label: 'Tools', icon: faBolt, detail: String(tools.length), children: tools.map(t => ({ label: t, icon: faBolt })) },
      { label: 'Resources', icon: faFileLines, detail: String(resources.length), children: resources.map(r => ({ label: r, icon: faFileLines })) },
      { label: 'Prompts', icon: faMessage, detail: String(prompts.length), children: prompts.map(p => ({ label: p, icon: faMessage })) },
    ],
  }));

const HELM: [string, string, number][] = [
  ['kafka-ui', 'kafka-ui-0.7.6', 3],
  ['grafana', 'grafana-8.5.2', 2],
  ['postgres', 'postgresql-16.0.1', 4],
  ['keycloak', 'keycloak-24.1.0', 1],
];

const helm = (connId: string): Raw[] =>
  HELM.slice(0, connId === 'kind-dev' ? 2 : 4).map(([name, chart, revs]) => ({
    label: name,
    icon: faBoxArchive,
    status: 'running',
    detail: chart,
    children: Array.from({ length: revs }, (_, i) => ({
      label: `Revision ${revs - i}`,
      icon: faClockRotateLeft,
      detail: i === 0 ? 'deployed' : 'superseded',
    })),
  }));

const QUADLETS: [string, string][] = [
  ['orders.container', 'running'],
  ['orders-db.container', 'running'],
  ['orders.pod', 'running'],
  ['backup.container', 'stopped'],
  ['orders-data.volume', 'ready'],
  ['orders.network', 'ready'],
];

const quadlets = (): Raw[] =>
  QUADLETS.map(([name, status]) => ({
    label: name,
    icon: faFileLines,
    status,
    detail: `${name.split('.')[0]}.service`,
  }));

const aiLab = (): Raw[] => [
  {
    label: 'Models',
    icon: faCube,
    detail: '3',
    children: [
      { label: 'granite-3.3-8b-instruct', icon: faCube, detail: '4.9 GB' },
      { label: 'mistral-7b-instruct-v0.3', icon: faCube, detail: '4.1 GB' },
      { label: 'whisper-small', icon: faCube, detail: '466 MB' },
    ],
  },
  {
    label: 'Services',
    icon: faRobot,
    detail: '2',
    children: [
      { label: 'granite inference', icon: faRobot, status: 'running', detail: ':35000' },
      { label: 'whisper inference', icon: faRobot, status: 'stopped', detail: ':35001' },
    ],
  },
  {
    label: 'Playgrounds',
    icon: faComments,
    detail: '2',
    children: [
      { label: 'RAG over orders docs', icon: faComments, detail: 'granite' },
      { label: 'Prompt tuning', icon: faComments, detail: 'mistral' },
    ],
  },
];

export const TREE_PROVIDERS: TreeProvider[] = [
  { id: 'quadlets', extId: 'quadlet', label: 'Quadlets', icon: 'icons/podman-desktop.quadlet.png', connIds: ['podman-machine-default'], replaces: ['quadlets'], build: quadlets },
  { id: 'ai-lab', extId: 'ai-lab', label: 'AI Lab', icon: 'icons/redhat.ai-lab.png', connIds: ['podman-machine-default'], replaces: [], build: aiLab },
  { id: 'mcp', extId: 'mcp', label: 'MCP servers', icon: 'icons/podman-desktop.mcp.png', connIds: ['podman-machine-default', 'mcp-gateway'], replaces: ['mcpservers', 'mcptools'], build: mcp },
  { id: 'helm', extId: 'helm', label: 'Helm releases', icon: 'icons/podman-desktop.helm.png', connIds: ['kind-dev', 'openshift-local', 'ocp-dev', 'ocp-prod'], replaces: ['helm'], build: helm },
];

function withIds(prefix: string, raw: Raw[]): TreeNode[] {
  return raw.map(r => {
    const id = `${prefix}/${r.label}`;
    return { ...r, id, children: r.children ? withIds(id, r.children) : undefined };
  });
}

const cache = new Map<string, TreeNode>();

/** Root node of a provider for a connection (children have stable ids). */
export function treeRoot(p: TreeProvider, connId: string): TreeNode {
  const key = `${p.id}@${connId}`;
  let root = cache.get(key);
  if (!root) {
    const children = withIds(key, p.build(connId));
    root = { id: key, label: p.label, icon: p.icon, detail: String(children.length), children };
    cache.set(key, root);
  }
  return root;
}

export interface FoundNode {
  node: TreeNode;
  root: TreeNode;
  provider: TreeProvider;
  connId: string;
  /** Labels of the ancestors (root first). */
  path: string[];
}

export function findNode(id: string | undefined): FoundNode | undefined {
  if (!id) return undefined;
  const [key] = id.split('/');
  const [pid, connId] = key.split('@');
  const provider = TREE_PROVIDERS.find(p => p.id === pid);
  if (!provider || !connId) return undefined;
  const root = treeRoot(provider, connId);
  const walk = (n: TreeNode, path: string[]): FoundNode | undefined => {
    if (n.id === id) return { node: n, root, provider, connId, path };
    for (const ch of n.children ?? []) {
      const f = walk(ch, [...path, n.label]);
      if (f) return f;
    }
    return undefined;
  };
  return walk(root, []);
}
