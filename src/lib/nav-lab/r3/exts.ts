/**
 * P13: what is installed. "Vanilla" = the app with only its built-in
 * extensions (podman, docker, compose, kind, kubectl, registries); "All
 * extensions" = every extension of the dataset. Installing from a promotion
 * card or the catalog flips that extension on in lab state.
 */
import { CONNECTIONS, type LabConnection, type LabSection, type LabTool, TOOLS } from '../data.ts';
import { lab } from '../lab.svelte.ts';

export interface LabExtension {
  id: string;
  name: string;
  icon: string;
  description: string;
  builtin?: boolean;
}

const E = (id: string, name: string, icon: string, description: string, builtin = false): LabExtension => ({ id, name, icon: `icons/${icon}`, description, builtin });

export const EXTENSIONS: LabExtension[] = [
  E('podman', 'Podman', 'podman-desktop.podman.png', 'Podman engine and machines', true),
  E('docker', 'Docker', 'podman-desktop.docker.png', 'Docker engine', true),
  E('compose', 'Compose', 'podman-desktop.compose.png', 'Compose projects', true),
  E('kind', 'Kind', 'podman-desktop.kind.png', 'Kubernetes in containers', true),
  E('kubectl', 'kubectl CLI', 'podman-desktop.kubectl-cli.png', 'Kubernetes CLI', true),
  E('registries', 'Registries', 'podman-desktop.registries.png', 'Default registries', true),
  E('bootc', 'Bootable containers', 'redhat.bootc.png', 'Build bootable OS images from containers'),
  E('quadlet', 'Podman Quadlet', 'podman-desktop.quadlet.png', 'Run containers as systemd services'),
  E('ai-lab', 'AI Lab', 'redhat.ai-lab.png', 'Run models, recipes and playgrounds locally'),
  E('mcp', 'MCP servers', 'podman-desktop.mcp.png', 'Run and wire MCP servers'),
  E('kube-dashboard', 'Kubernetes dashboard', 'podman-desktop.kubernetes-dashboard.png', 'Workloads, events and metrics of a cluster'),
  E('helm', 'Helm', 'podman-desktop.helm.png', 'Charts, releases and revisions'),
  E('openshift-local', 'OpenShift Local', 'redhat.openshift-local.png', 'A local OpenShift cluster (CRC)'),
  E('sandbox', 'Developer Sandbox', 'redhat.redhat-sandbox.png', 'Free hosted OpenShift for 30 days'),
  E('minc', 'MicroShift in a container', 'minc-org.minc.png', 'Lightweight OpenShift in a container'),
  E('apple-container', 'Apple container', 'redhat.apple-container.png', 'Apple container engine (macOS 26)'),
  E('wslc', 'WSL containers', 'podman-desktop.wslc.png', 'WSL container engine'),
  E('rhel', 'RHEL', 'redhat.rhel-registration.png', 'RHEL registration and RHEL engines'),
  E('rhel-vms', 'RHEL VMs', 'redhat.rhel-vms.png', 'RHEL virtual machines'),
  E('insights', 'Lightspeed Insights', 'redhat.lightspeed-insights.png', 'Advisor recommendations for RHEL'),
  E('pipelines', 'OpenShift Pipelines & GitOps', 'redhat.openshift-pipelines-gitops.svg', 'Tekton pipelines'),
  E('argo', 'Argo CD', 'argo-cd.svg', 'GitOps applications'),
  E('virt', 'OpenShift Virtualization', 'redhat.openshift-virtualization.png', 'Virtual machines on OpenShift'),
  E('olm', 'Operators (OLM)', 'redhat.olm.png', 'Operator lifecycle'),
  E('skupper', 'Service Interconnect', 'redhat.service-interconnect.png', 'Service network'),
  E('rhoai', 'OpenShift AI', 'redhat.openshift-ai.png', 'Inference, workbenches, pipelines'),
  E('kafka', 'Streams for Apache Kafka', 'redhat.streams-kafka.svg', 'Kafka clusters and topics'),
  E('keycloak', 'Keycloak', 'redhat.keycloak.svg', 'Realms and clients'),
  E('aap', 'Ansible Automation Platform', 'redhat.aap.png', 'Job templates and inventories'),
  E('grype', 'Grype', 'podman-desktop.grype.png', 'Scan images for vulnerabilities'),
  E('layers-explorer', 'Layers explorer', 'podman-desktop.layers-explorer.png', 'Browse image layers'),
];

export function ext(id: string | undefined): LabExtension | undefined {
  return EXTENSIONS.find(e => e.id === id);
}

export function isInstalled(id: string | undefined): boolean {
  if (!id) return true;
  return lab.install === 'all' || !!ext(id)?.builtin || lab.installed.includes(id) || !ext(id);
}

export function installExt(id: string): void {
  if (!lab.installed.includes(id)) lab.installed = [...lab.installed, id];
}

/** Connections that only exist through an extension. */
const CONN_EXT: Record<string, string> = {
  'rhel-10': 'rhel',
  'wslc-default': 'wslc',
  'apple-container': 'apple-container',
  minc: 'minc',
  'openshift-local': 'openshift-local',
  'rhoai-dev': 'rhoai',
  sandbox: 'sandbox',
  'rhel10-dev': 'rhel-vms',
  'acme-kafka': 'kafka',
  'acme-keycloak': 'keycloak',
  'mcp-gateway': 'mcp',
  'aap-acme-prod': 'aap',
};

export function connVisible(c: LabConnection): boolean {
  return isInstalled(CONN_EXT[c.id]);
}

export function sectionVisible(s: LabSection): boolean {
  return isInstalled(s.ext?.id);
}

/** Extension pages: tool id → extension id (tools without an entry are extensions of their own id). */
export function toolVisible(t: LabTool): boolean {
  return lab.install === 'all' || lab.installed.includes(t.id);
}

export function visibleTools(): LabTool[] {
  return TOOLS.filter(toolVisible);
}

export function visibleConns(): LabConnection[] {
  return CONNECTIONS.filter(connVisible);
}

/** Promotion cards on a connection summary: related extensions per product. */
export function promotionsFor(c: LabConnection): LabExtension[] {
  const p = c.product.toLowerCase();
  let ids: string[];
  if (p.includes('podman')) ids = ['bootc', 'quadlet', 'ai-lab', 'mcp'];
  else if (p.includes('docker')) ids = ['ai-lab', 'mcp', 'grype'];
  else if (p.includes('openshift') || p.includes('sandbox') || p.includes('microshift')) ids = ['openshift-local', 'sandbox', 'helm', 'pipelines', 'kube-dashboard'];
  else if (c.group === 'Kubernetes') ids = ['kube-dashboard', 'helm', 'openshift-local', 'sandbox'];
  else ids = ['insights', 'aap'];
  return ids.map(ext).filter((e): e is LabExtension => !!e);
}
