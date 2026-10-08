/** Official MCP registry entries (server.json shape), tool lists and client config formats. */
export interface McpPackage {
  registryType: 'oci' | 'npm' | 'pypi';
  identifier: string;
  transport: 'stdio' | 'streamable-http';
  url?: string;
  env?: { name: string; isSecret?: boolean; isRequired?: boolean }[];
}

export interface McpServerEntry {
  name: string;
  title: string;
  description: string;
  version: string;
  publishedAt: string;
  repository: string;
  publisher: string;
  packages: McpPackage[];
  remote?: string;
  tools: { name: string; description: string }[];
  totalTools: number;
}

const k8sTools = [
  ['configuration_view', 'Get the current Kubernetes configuration content as a kubeconfig YAML'],
  ['namespaces_list', 'List all the Kubernetes namespaces in the current cluster'],
  ['projects_list', 'List all the OpenShift projects in the current cluster'],
  ['events_list', 'List all the Kubernetes events in the current cluster from all namespaces'],
  ['pods_list', 'List all the Kubernetes pods in the current cluster from all namespaces'],
  ['pods_list_in_namespace', 'List all the Kubernetes pods in the specified namespace'],
  ['pods_get', 'Get a Kubernetes Pod in the current or provided namespace with the provided name'],
  ['pods_log', 'Get the logs of a Kubernetes Pod in the current or provided namespace'],
  ['pods_exec', 'Execute a command in a Kubernetes Pod'],
  ['pods_run', 'Run a Kubernetes Pod with the provided container image'],
  ['pods_delete', 'Delete a Kubernetes Pod in the current or provided namespace'],
  ['pods_top', 'List the resource consumption (CPU and memory) of pods'],
  ['resources_list', 'List Kubernetes resources and objects by apiVersion and kind'],
  ['resources_get', 'Get a Kubernetes resource by apiVersion, kind, namespace and name'],
  ['resources_create_or_update', 'Create or update a Kubernetes resource from a YAML or JSON representation'],
  ['resources_delete', 'Delete a Kubernetes resource by apiVersion, kind, namespace and name'],
  ['resources_scale', 'Get or update the scale of a Kubernetes resource'],
  ['helm_install', 'Install a Helm chart in the current or provided namespace'],
  ['helm_list', 'List all the Helm releases in the current or provided namespace'],
  ['helm_uninstall', 'Uninstall a Helm release'],
  ['nodes_top', 'List the resource consumption of nodes'],
  ['nodes_log', 'Get logs from a Kubernetes node (kubelet)'],
].map(([name, description]) => ({ name, description }));

const podmanTools = [
  ['container_list', 'Prints out information about the running Podman or Docker containers'],
  ['container_inspect', 'Displays the low-level information and configuration of a container'],
  ['container_logs', 'Displays the logs of a Podman or Docker container'],
  ['container_run', 'Runs a container image with the provided ports and environment'],
  ['container_stop', 'Stops a running container'],
  ['container_remove', 'Removes a container'],
  ['image_list', 'List the container images available in the local machine'],
  ['image_pull', 'Copies (pulls) a container image from a registry'],
  ['image_push', 'Pushes a container image to a registry'],
  ['image_build', 'Build a container image from a Containerfile'],
  ['image_remove', 'Removes a container image'],
  ['network_list', 'List all the available networks'],
  ['volume_list', 'List all the available volumes'],
].map(([name, description]) => ({ name, description }));

export const REGISTRY: McpServerEntry[] = [
  {
    name: 'io.github.containers/kubernetes-mcp-server',
    title: 'Kubernetes MCP Server',
    description: 'A Model Context Protocol (MCP) server for Kubernetes and OpenShift',
    version: '0.0.67',
    publishedAt: '2026-09-18',
    repository: 'https://github.com/containers/kubernetes-mcp-server',
    publisher: 'containers',
    packages: [
      { registryType: 'oci', identifier: 'quay.io/containers/kubernetes_mcp_server:v0.0.67', transport: 'streamable-http', url: 'http://localhost:8080/mcp' },
      { registryType: 'npm', identifier: 'kubernetes-mcp-server@0.0.67', transport: 'stdio' },
    ],
    tools: k8sTools,
    totalTools: 22,
  },
  {
    name: 'io.github.manusa/podman-mcp-server',
    title: 'Podman MCP Server',
    description: 'MCP server for Podman and Docker',
    version: '0.0.15',
    publishedAt: '2026-08-02',
    repository: 'https://github.com/manusa/podman-mcp-server',
    publisher: 'manusa',
    packages: [{ registryType: 'npm', identifier: 'podman-mcp-server@0.0.15', transport: 'stdio' }],
    tools: podmanTools,
    totalTools: 13,
  },
  {
    name: 'io.github.github/github-mcp-server',
    title: 'GitHub MCP Server',
    description: "GitHub's official MCP Server: issues, pull requests, code search, Actions",
    version: '0.26.1',
    publishedAt: '2026-09-30',
    repository: 'https://github.com/github/github-mcp-server',
    publisher: 'github',
    remote: 'https://api.githubcopilot.com/mcp/',
    packages: [{ registryType: 'oci', identifier: 'ghcr.io/github/github-mcp-server:0.26.1', transport: 'stdio', env: [{ name: 'GITHUB_PERSONAL_ACCESS_TOKEN', isSecret: true, isRequired: true }] }],
    tools: ['get_issue', 'create_pull_request', 'search_code', 'list_workflow_runs', 'get_file_contents', 'create_issue'].map(n => ({ name: n, description: `GitHub ${n.replace(/_/g, ' ')}` })),
    totalTools: 51,
  },
  {
    name: 'io.github.modelcontextprotocol/server-filesystem',
    title: 'Filesystem',
    description: 'Secure file operations with configurable access controls',
    version: '2026.7.1',
    publishedAt: '2026-07-01',
    repository: 'https://github.com/modelcontextprotocol/servers',
    publisher: 'modelcontextprotocol',
    packages: [{ registryType: 'npm', identifier: '@modelcontextprotocol/server-filesystem', transport: 'stdio' }],
    tools: ['read_text_file', 'write_file', 'edit_file', 'list_directory', 'search_files', 'get_file_info'].map(n => ({ name: n, description: n.replace(/_/g, ' ') })),
    totalTools: 13,
  },
  {
    name: 'com.redhat/lightspeed-mcp',
    title: 'Red Hat Lightspeed MCP',
    description: 'Query Red Hat Lightspeed (Insights) advisor, vulnerability and inventory data',
    version: '0.3.0',
    publishedAt: '2026-09-04',
    repository: 'https://github.com/RedHatInsights/insights-mcp',
    publisher: 'Red Hat',
    packages: [{ registryType: 'oci', identifier: 'ghcr.io/redhatinsights/red-hat-lightspeed-mcp:latest', transport: 'stdio', env: [{ name: 'LIGHTSPEED_CLIENT_ID', isRequired: true }, { name: 'LIGHTSPEED_CLIENT_SECRET', isRequired: true, isSecret: true }] }],
    tools: ['advisor_recommendations', 'vulnerability_cves', 'inventory_hosts', 'image_builder_compose'].map(n => ({ name: n, description: n.replace(/_/g, ' ') })),
    totalTools: 19,
  },
  {
    name: 'io.github.ansible/aap-mcp-server',
    title: 'Ansible Automation Platform MCP',
    description: 'Launch job templates, inspect inventories and jobs on Ansible Automation Platform',
    version: '0.2.1',
    publishedAt: '2026-08-21',
    repository: 'https://github.com/ansible/aap-mcp-server',
    publisher: 'Red Hat',
    packages: [{ registryType: 'oci', identifier: 'quay.io/ansible/aap-mcp-server:0.2.1', transport: 'streamable-http', url: 'http://localhost:3000/mcp', env: [{ name: 'AAP_TOKEN', isRequired: true, isSecret: true }] }],
    tools: ['job_templates_list', 'job_launch', 'jobs_get', 'inventories_list'].map(n => ({ name: n, description: n.replace(/_/g, ' ') })),
    totalTools: 16,
  },
];

export interface InstalledServer {
  id: string;
  name: string;
  entry: string;
  kind: 'container' | 'process' | 'remote';
  endpoint: string;
  status: 'running' | 'stopped';
  clients: string[];
  containerId?: string;
  readOnly?: boolean;
}

export const CLIENTS = [
  { id: 'claude-code', label: 'Claude Code', file: '~/src/acme-support-assistant/.mcp.json' },
  { id: 'vscode', label: 'VS Code', file: '~/src/acme-support-assistant/.vscode/mcp.json' },
  { id: 'cursor', label: 'Cursor', file: '~/.cursor/mcp.json' },
  { id: 'kaiden', label: 'Kaiden (acme-support-cc)', file: 'kaiden workspace configuration' },
];

export function shortName(name: string): string {
  return name.split('/').pop() ?? name;
}

/** Client config snippet with `+` lines for the server being added. */
export function clientConfig(client: string, s: InstalledServer): string {
  const key = shortName(s.name).replace(/-mcp-server$|^server-/, '').replace(/-mcp$/, '');
  const http = s.kind !== 'process';
  if (client === 'vscode') {
    return [
      ' {',
      '   "servers": {',
      '     "github": { "type": "http", "url": "https://api.githubcopilot.com/mcp/" },',
      `+    "${key}": ${http ? `{ "type": "http", "url": "${s.endpoint}" }` : `{ "type": "stdio", "command": "npx", "args": ["-y", "${s.endpoint}"] }`}`,
      '   }',
      ' }',
    ].join('\n');
  }
  if (client === 'claude-code') {
    return [
      `$ claude mcp add ${http ? `--transport http ${key} ${s.endpoint}` : `${key} -- npx -y ${s.endpoint}`} -s project`,
      '',
      ' {',
      '   "mcpServers": {',
      `+    "${key}": ${http ? `{ "type": "http", "url": "${s.endpoint}" }` : `{ "command": "npx", "args": ["-y", "${s.endpoint}"] }`}`,
      '   }',
      ' }',
    ].join('\n');
  }
  return [' {', '   "mcpServers": {', `+    "${key}": ${http ? `{ "url": "${s.endpoint}" }` : `{ "command": "npx", "args": ["-y", "${s.endpoint}"] }`}`, '   }', ' }'].join('\n');
}
