/**
 * OpenShift CLI pack: tool catalogue (versions are Oct 2026 estimates, see the
 * dossier) and the install/update helpers other OpenShift extensions call
 * (e.g. OCM "Connect" needs a recent `oc`). Installed versions live in
 * `world.settings['cli.redhat.openshift-cli-pack.<name>']` – the same key the
 * core Settings › CLI Tools page reads.
 */
import { runTask, world } from '#lib/world.svelte.ts';

export const CLI_PACK_ID = 'redhat.openshift-cli-pack';
export const BIN_DIR = '~/.local/share/containers/podman-desktop/extensions-storage/redhat.openshift-cli-pack/bin';

export interface PackTool {
  name: string;
  displayName: string;
  description: string;
  /** Initially installed version (undefined = not installed). */
  installed?: string;
  latest: string;
  source: string;
  /** Recommended for OpenShift developers (installed by "Install recommended"). */
  recommended: boolean;
  /** Also listed in Settings › CLI Tools. */
  featured: boolean;
}

export const TOOLS: PackTool[] = [
  { name: 'oc', displayName: 'OpenShift CLI', description: 'Create and manage OpenShift applications and clusters; supports oc login --web.', installed: '4.20.12', latest: '4.22.3', source: 'mirror.openshift.com', recommended: true, featured: true },
  { name: 'rosa', displayName: 'ROSA CLI', description: 'Create and manage Red Hat OpenShift Service on AWS clusters.', installed: '1.2.57', latest: '1.2.59', source: 'developers.redhat.com', recommended: true, featured: true },
  { name: 'ocm', displayName: 'OCM CLI', description: 'OpenShift Cluster Manager command-line client.', installed: '1.0.9', latest: '1.0.9', source: 'github.com/openshift-online/ocm-cli', recommended: false, featured: false },
  { name: 'tkn', displayName: 'Tekton CLI', description: 'Run and inspect OpenShift Pipelines (Tekton) PipelineRuns.', installed: '0.43.0', latest: '0.43.0', source: 'developers.redhat.com', recommended: true, featured: true },
  { name: 'roxctl', displayName: 'ACS CLI', description: 'Red Hat Advanced Cluster Security command-line client (image check, policies).', installed: '4.9.2', latest: '4.10.0', source: 'Central /api/cli/download', recommended: true, featured: true },
  { name: 'virtctl', displayName: 'KubeVirt CLI', description: 'Start, stop, migrate and open consoles of OpenShift Virtualization VMs.', latest: '1.7.1', source: 'github.com/kubevirt/kubevirt', recommended: true, featured: true },
  { name: 'kn', displayName: 'Knative CLI', description: 'Manage OpenShift Serverless services and functions.', latest: '1.38.0', source: 'developers.redhat.com', recommended: true, featured: true },
  { name: 'openshift-install', displayName: 'OpenShift installer', description: 'Install self-managed OpenShift clusters.', latest: '4.22.3', source: 'mirror.openshift.com', recommended: false, featured: false },
  { name: 'opm', displayName: 'Operator package manager', description: 'Build and manage operator catalogs (file-based catalogs).', latest: '1.62.0', source: 'mirror.openshift.com', recommended: false, featured: false },
  { name: 'operator-sdk', displayName: 'Operator SDK', description: 'Build, test and bundle Kubernetes operators.', installed: '1.41.1', latest: '1.42.0', source: 'github.com/operator-framework', recommended: false, featured: false },
  { name: 'oc-mirror', displayName: 'oc-mirror', description: 'Mirror OpenShift release and operator content for disconnected installs.', latest: '4.22.3', source: 'mirror.openshift.com', recommended: false, featured: false },
  { name: 'shp', displayName: 'Shipwright CLI', description: 'Build container images on OpenShift with Builds for Red Hat OpenShift.', latest: '0.17.0', source: 'github.com/shipwright-io/cli', recommended: false, featured: false },
];

function key(name: string): string {
  return `cli.${CLI_PACK_ID}.${name}`;
}

/** Installed version of a pack tool ('' / undefined = not installed). */
export function installedVersion(name: string): string | undefined {
  const value = world.settings[key(name)];
  if (value !== undefined) return String(value) || undefined;
  return TOOLS.find(t => t.name === name)?.installed;
}

export function isBusy(name: string): boolean {
  return world.tasks.some(t => t.status === 'in-progress' && t.ext === CLI_PACK_ID && t.name.includes(` ${name} `));
}

/** Parse "4.20.12" → [4, 20, 12]. */
export function parseVersion(v: string): number[] {
  return v.split(/[.-]/).map(n => Number.parseInt(n, 10) || 0);
}

/** Minor versions `client` is behind `server` (same major). */
export function minorsBehind(client: string, server: string): number {
  const [cMaj, cMin] = parseVersion(client);
  const [sMaj, sMin] = parseVersion(server);
  return cMaj === sMaj ? sMin - cMin : 0;
}

/** Install or update a tool as a task (P15/P17). */
export function installTool(name: string, onDone?: () => void): string | undefined {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) return undefined;
  const current = installedVersion(name);
  return runTask({
    name: `${current ? 'Update' : 'Install'} ${name} ${current ? `${current} → ` : ''}${tool.latest}`,
    ext: CLI_PACK_ID,
    steps: [
      { label: `Downloading ${name} ${tool.latest} from ${tool.source}`, ms: 1600, log: [`GET https://${tool.source}/…/${name}-linux-amd64.tar.gz`] },
      { label: 'Verifying sha256 checksum', ms: 400 },
      { label: `Installing to ${BIN_DIR}/${name}`, ms: 500, log: [`${name} ${tool.latest} is on PATH`] },
    ],
    action: { label: 'Open CLI tools', href: '/settings/openshift-cli' },
    onDone: () => {
      world.settings[key(name)] = tool.latest;
      onDone?.();
    },
  });
}
