/**
 * Nav lab (throwaway): one shared fake dataset sized for scale, used by every
 * navigation proposal under `#/nav-lab`. Not wired to the real `world`.
 */
import {
  faBolt,
  faBoxArchive,
  faCircleNodes,
  faCodeBranch,
  faCubes,
  faDiagramProject,
  faGear,
  faKey,
  faLayerGroup,
  faListCheck,
  faNetworkWired,
  faPlay,
  faRobot,
  faServer,
  faShieldHalved,
  faTerminal,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';

import type { IconRef } from '#lib/ext/types.ts';
import ConfigMapSecretIcon from '#lib/images/ConfigMapSecretIcon.svelte';
import CronJobIcon from '#lib/images/CronJobIcon.svelte';
import DeploymentIcon from '#lib/images/DeploymentIcon.svelte';
import ImageIcon from '#lib/images/ImageIcon.svelte';
import IngressRouteIcon from '#lib/images/IngressRouteIcon.svelte';
import JobIcon from '#lib/images/JobIcon.svelte';
import NetworkIcon from '#lib/images/NetworkIcon.svelte';
import NodeIcon from '#lib/images/NodeIcon.svelte';
import PodIcon from '#lib/images/PodIcon.svelte';
import PVCIcon from '#lib/images/PVCIcon.svelte';
import ServiceIcon from '#lib/images/ServiceIcon.svelte';
import VolumeIcon from '#lib/images/VolumeIcon.svelte';

export type ConnStatus = 'running' | 'stopped' | 'error' | 'starting';
export type ConnGroup = 'Engines' | 'Kubernetes' | 'VMs & services';

export interface LabSection {
  id: string;
  label: string;
  icon: IconRef;
  /** Contributed by an extension (icon of that extension). */
  ext?: { name: string; icon: string };
  count: number;
}

export interface LabConnection {
  id: string;
  name: string;
  group: ConnGroup;
  /** Short product label (`Podman`, `OpenShift`…). */
  product: string;
  detail: string;
  icon: string;
  status: ConnStatus;
  /** Avatar colour for hotbar / tab groups (mockup palette). */
  color: string;
  initials: string;
  sections: LabSection[];
}

export interface LabResource {
  id: string;
  name: string;
  connId: string;
  sectionId: string;
  status: string;
  sub: string;
  age: string;
  /** Compose project / pod group. */
  group?: string;
}

export interface LabTool {
  id: string;
  name: string;
  icon: string;
  category: 'AI' | 'Build & ship' | 'Integration' | 'Security' | 'Platform';
  description: string;
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

const S = (id: string, label: string, icon: IconRef, count: number, ext?: LabSection['ext']): LabSection => ({
  id,
  label,
  icon,
  count,
  ext,
});

const EXT = {
  pipelines: { name: 'OpenShift Pipelines & GitOps', icon: 'icons/redhat.openshift-pipelines-gitops.svg' },
  argo: { name: 'Argo CD', icon: 'icons/argo-cd.svg' },
  virt: { name: 'OpenShift Virtualization', icon: 'icons/redhat.openshift-virtualization.png' },
  olm: { name: 'Operators (OLM)', icon: 'icons/redhat.olm.png' },
  skupper: { name: 'Service Interconnect', icon: 'icons/redhat.service-interconnect.png' },
  rhoai: { name: 'OpenShift AI', icon: 'icons/redhat.openshift-ai.png' },
  helm: { name: 'Helm', icon: 'icons/podman-desktop.helm.png' },
  compose: { name: 'Compose', icon: 'icons/podman-desktop.compose.png' },
  quadlet: { name: 'Podman Quadlet', icon: 'icons/podman-desktop.quadlet.png' },
  bootc: { name: 'Bootable containers', icon: 'icons/redhat.bootc.png' },
  rhel: { name: 'RHEL registration', icon: 'icons/redhat.rhel-registration.png' },
  insights: { name: 'Lightspeed Insights', icon: 'icons/redhat.lightspeed-insights.png' },
  kafka: { name: 'Streams for Apache Kafka', icon: 'icons/redhat.streams-kafka.svg' },
  keycloak: { name: 'Keycloak', icon: 'icons/redhat.keycloak.svg' },
  mcp: { name: 'MCP', icon: 'icons/podman-desktop.mcp.png' },
  aap: { name: 'Ansible Automation Platform', icon: 'icons/redhat.aap.png' },
};

function engineSections(c: number, i: number, p: number, extra: LabSection[] = []): LabSection[] {
  return [
    S('containers', 'Containers', ContainerIcon, c),
    S('pods', 'Pods', PodIcon, p),
    S('images', 'Images', ImageIcon, i),
    S('volumes', 'Volumes', VolumeIcon, Math.max(2, Math.round(c / 3))),
    S('networks', 'Networks', NetworkIcon, 3),
    ...extra,
  ];
}

function kubeSections(scale: number, extra: LabSection[] = []): LabSection[] {
  return [
    S('nodes', 'Nodes', NodeIcon, Math.max(1, Math.round(scale / 6))),
    S('kpods', 'Pods', PodIcon, scale * 2),
    S('deployments', 'Deployments', DeploymentIcon, scale),
    S('services', 'Services', ServiceIcon, scale),
    S('routes', 'Ingresses & Routes', IngressRouteIcon, Math.round(scale / 2)),
    S('pvcs', 'Persistent volume claims', PVCIcon, Math.round(scale / 3)),
    S('config', 'ConfigMaps & Secrets', ConfigMapSecretIcon, scale * 2),
    S('jobs', 'Jobs', JobIcon, 4),
    S('cronjobs', 'CronJobs', CronJobIcon, 2),
    ...extra,
  ];
}

const OPENSHIFT_EXTRA = (s: number): LabSection[] => [
  S('pipelines', 'Pipelines', faCodeBranch, s, EXT.pipelines),
  S('gitops', 'GitOps', faCodeBranch, Math.round(s / 2), EXT.argo),
  S('vms', 'Virtual machines', faServer, 3, EXT.virt),
  S('operators', 'Operators', faCubes, 9, EXT.olm),
  S('servicenet', 'Service network', faCircleNodes, 2, EXT.skupper),
  S('helm', 'Helm releases', faBoxArchive, 4, EXT.helm),
];

/* ------------------------------------------------------------------ */
/* Connections (18)                                                    */
/* ------------------------------------------------------------------ */

export const CONNECTIONS: LabConnection[] = [
  {
    id: 'podman-machine-default',
    name: 'podman-machine-default',
    group: 'Engines',
    product: 'Podman',
    detail: 'Podman 5.6 · rootless · 4 CPU · 8 GB',
    icon: 'icons/podman-desktop.podman.png',
    status: 'running',
    color: '#8b5cf6',
    initials: 'PM',
    sections: engineSections(30, 20, 3, [
      S('compose', 'Compose', faLayerGroup, 2, EXT.compose),
      S('quadlets', 'Quadlets', faListCheck, 5, EXT.quadlet),
      S('bootc', 'Bootable images', faServer, 2, EXT.bootc),
    ]),
  },
  {
    id: 'podman-machine-dev',
    name: 'podman-machine-dev',
    group: 'Engines',
    product: 'Podman',
    detail: 'Podman 5.6 · rootful',
    icon: 'icons/podman-desktop.podman.png',
    status: 'stopped',
    color: '#6d48bf',
    initials: 'PD',
    sections: engineSections(6, 9, 0),
  },
  {
    id: 'rhel-10',
    name: 'rhel-10',
    group: 'Engines',
    product: 'RHEL Podman (WSL)',
    detail: 'RHEL 10.0 · WSL · subscribed',
    icon: 'icons/redhat.rhel-registration.png',
    status: 'running',
    color: '#e5421d',
    initials: 'R10',
    sections: engineSections(8, 7, 1, [S('subscription', 'Subscription', faKey, 1, EXT.rhel)]),
  },
  {
    id: 'wslc-default',
    name: 'wslc-default',
    group: 'Engines',
    product: 'WSL containers',
    detail: 'wslc 0.4 · preview',
    icon: 'icons/podman-desktop.wslc.png',
    status: 'error',
    color: '#2f88c8',
    initials: 'WC',
    sections: engineSections(2, 3, 0),
  },
  {
    id: 'desktop-linux',
    name: 'desktop-linux',
    group: 'Engines',
    product: 'Docker',
    detail: 'Docker Desktop 4.47',
    icon: 'icons/podman-desktop.docker.png',
    status: 'running',
    color: '#206ca9',
    initials: 'DD',
    sections: engineSections(7, 12, 0, [S('compose', 'Compose', faLayerGroup, 1, EXT.compose)]),
  },
  {
    id: 'apple-container',
    name: 'apple-container',
    group: 'Engines',
    product: 'Apple container',
    detail: 'container 0.6 · macOS 26',
    icon: 'icons/redhat.apple-container.png',
    status: 'stopped',
    color: '#757575',
    initials: 'AC',
    sections: engineSections(0, 4, 0),
  },
  {
    id: 'kind-dev',
    name: 'kind-dev',
    group: 'Kubernetes',
    product: 'Kind',
    detail: 'Kubernetes 1.34 · on podman-machine-default',
    icon: 'icons/podman-desktop.kind.png',
    status: 'running',
    color: '#3c8d47',
    initials: 'KD',
    sections: kubeSections(6, [S('helm', 'Helm releases', faBoxArchive, 2, EXT.helm)]),
  },
  {
    id: 'minc',
    name: 'minc',
    group: 'Kubernetes',
    product: 'MicroShift in a container',
    detail: 'MicroShift 4.20',
    icon: 'icons/minc-org.minc.png',
    status: 'stopped',
    color: '#64ad6c',
    initials: 'MC',
    sections: kubeSections(3),
  },
  {
    id: 'openshift-local',
    name: 'openshift-local',
    group: 'Kubernetes',
    product: 'OpenShift Local',
    detail: 'OpenShift 4.20 · CRC',
    icon: 'icons/redhat.openshift-local.png',
    status: 'running',
    color: '#c13414',
    initials: 'OL',
    sections: kubeSections(8, OPENSHIFT_EXTRA(4)),
  },
  {
    id: 'ocp-dev',
    name: 'ocp-dev',
    group: 'Kubernetes',
    product: 'OpenShift',
    detail: 'OpenShift 4.20 · api.dev.acme.com · ns checkout',
    icon: 'icons/redhat.openshift-cluster-manager.svg',
    status: 'running',
    color: '#f0561d',
    initials: 'OD',
    sections: kubeSections(14, OPENSHIFT_EXTRA(12)),
  },
  {
    id: 'ocp-prod',
    name: 'ocp-prod',
    group: 'Kubernetes',
    product: 'OpenShift',
    detail: 'OpenShift 4.19 · api.prod.acme.com · read-only',
    icon: 'icons/redhat.openshift-cluster-manager.svg',
    status: 'running',
    color: '#9f2f15',
    initials: 'OP',
    sections: kubeSections(22, OPENSHIFT_EXTRA(20)),
  },
  {
    id: 'rhoai-dev',
    name: 'rhoai-dev',
    group: 'Kubernetes',
    product: 'OpenShift AI',
    detail: 'RHOAI 3.0 on ocp-dev',
    icon: 'icons/redhat.openshift-ai.png',
    status: 'starting',
    color: '#d97706',
    initials: 'AI',
    sections: kubeSections(5, [
      S('inference', 'Inference services', faRobot, 3, EXT.rhoai),
      S('workbenches', 'Workbenches', faTerminal, 2, EXT.rhoai),
      S('dspipelines', 'Data science pipelines', faDiagramProject, 4, EXT.rhoai),
    ]),
  },
  {
    id: 'sandbox',
    name: 'sandbox',
    group: 'Kubernetes',
    product: 'Developer Sandbox',
    detail: 'OpenShift 4.20 · expires in 21 days',
    icon: 'icons/redhat.redhat-sandbox.png',
    status: 'error',
    color: '#b1380b',
    initials: 'SB',
    sections: kubeSections(4),
  },
  {
    id: 'rhel10-dev',
    name: 'rhel10-dev',
    group: 'VMs & services',
    product: 'RHEL VM',
    detail: 'RHEL 10.0 · 4 CPU · 8 GB · libkrun',
    icon: 'icons/redhat.rhel-vms.png',
    status: 'running',
    color: '#ee0000',
    initials: 'RV',
    sections: [
      S('overview', 'Overview', faServer, 1),
      S('containers', 'Containers', ContainerIcon, 4),
      S('subscription', 'Subscription', faKey, 1, EXT.rhel),
      S('advisor', 'Advisor', faShieldHalved, 7, EXT.insights),
    ],
  },
  {
    id: 'acme-kafka',
    name: 'acme-kafka',
    group: 'VMs & services',
    product: 'Kafka cluster',
    detail: 'Streams for Apache Kafka 3.0 · on ocp-dev',
    icon: 'icons/redhat.streams-kafka.svg',
    status: 'running',
    color: '#a2a3a2',
    initials: 'KF',
    sections: [
      S('topics', 'Topics', faListCheck, 12, EXT.kafka),
      S('groups', 'Consumer groups', faUsers, 5, EXT.kafka),
      S('kusers', 'Users', faKey, 3, EXT.kafka),
    ],
  },
  {
    id: 'acme-keycloak',
    name: 'acme-keycloak',
    group: 'VMs & services',
    product: 'Keycloak',
    detail: 'Keycloak 26 · realm acme',
    icon: 'icons/redhat.keycloak.svg',
    status: 'stopped',
    color: '#51a2da',
    initials: 'KC',
    sections: [
      S('realms', 'Realms', faLayerGroup, 2, EXT.keycloak),
      S('clients', 'Clients', faKey, 9, EXT.keycloak),
    ],
  },
  {
    id: 'mcp-gateway',
    name: 'mcp-gateway',
    group: 'VMs & services',
    product: 'MCP gateway',
    detail: '8 servers · 64 tools',
    icon: 'icons/podman-desktop.mcp.png',
    status: 'running',
    color: '#ad46ff',
    initials: 'MG',
    sections: [
      S('mcpservers', 'Servers', faServer, 8, EXT.mcp),
      S('mcptools', 'Tools', faBolt, 64, EXT.mcp),
    ],
  },
  {
    id: 'aap-acme-prod',
    name: 'acme-prod (AAP)',
    group: 'VMs & services',
    product: 'Ansible Automation Platform',
    detail: 'AAP 2.6 · controller.acme.com',
    icon: 'icons/redhat.aap.png',
    status: 'running',
    color: '#c8c8c8',
    initials: 'AA',
    sections: [
      S('jobtemplates', 'Job templates', faPlay, 14, EXT.aap),
      S('inventories', 'Inventories', faServer, 5, EXT.aap),
      S('aapjobs', 'Jobs', faListCheck, 31, EXT.aap),
    ],
  },
];

export const CONN_GROUPS: ConnGroup[] = ['Engines', 'Kubernetes', 'VMs & services'];

export function conn(id: string | undefined): LabConnection | undefined {
  return CONNECTIONS.find(c => c.id === id);
}

export function section(c: LabConnection | undefined, id: string | undefined): LabSection | undefined {
  return c?.sections.find(s => s.id === id);
}

/* ------------------------------------------------------------------ */
/* Tools (28)                                                          */
/* ------------------------------------------------------------------ */

const T = (id: string, name: string, icon: string, category: LabTool['category'], description: string): LabTool => ({
  id,
  name,
  icon: `icons/${icon}`,
  category,
  description,
});

export const TOOLS: LabTool[] = [
  T('ai-lab', 'AI Lab', 'redhat.ai-lab.png', 'AI', 'Recipes, models, playgrounds'),
  T('mcp', 'MCP servers', 'podman-desktop.mcp.png', 'AI', 'Run and wire MCP servers'),
  T('lightspeed', 'Lightspeed', 'redhat.rhel-lightspeed.png', 'AI', 'Ask about RHEL and OpenShift'),
  T('ai-inference', 'AI Inference Server', 'redhat.ai-inference-server.png', 'AI', 'vLLM serving'),
  T('modelcar', 'ModelCar', 'redhat.modelcar.png', 'AI', 'Package models as OCI'),
  T('maas', 'Models as a service', 'redhat.maas.png', 'AI', 'Remote model endpoints'),
  T('mta', 'MTA', 'redhat.mta.svg', 'Build & ship', 'Migration toolkit for applications'),
  T('image-builder', 'Image Builder', 'redhat.image-builder.png', 'Build & ship', 'Build RHEL images'),
  T('bootc', 'Bootable containers', 'redhat.bootc.png', 'Build & ship', 'bootc disk images'),
  T('konflux', 'Konflux', 'redhat.konflux.png', 'Build & ship', 'Secure supply chain CI'),
  T('quarkus', 'Quarkus', 'redhat.quarkus.png', 'Build & ship', 'Dev services'),
  T('helm', 'Helm', 'podman-desktop.helm.png', 'Build & ship', 'Charts and releases'),
  T('kreate', 'Kreate', 'podman-desktop.kreate.png', 'Build & ship', 'Generate Kubernetes YAML'),
  T('devcontainers', 'Dev containers', 'podman-desktop.devcontainers.png', 'Build & ship', 'Open a dev container'),
  T('ansible', 'Ansible', 'redhat.ansible.png', 'Integration', 'Playbooks and execution envs'),
  T('kaoto', 'Kaoto', 'redhat.kaoto.svg', 'Integration', 'Camel integrations designer'),
  T('rhdh', 'Developer Hub', 'redhat.rhdh-local.png', 'Integration', 'Backstage local'),
  T('services', 'Services catalog', 'redhat.redhat-pack.png', 'Integration', 'Kafka, Keycloak, Postgres…'),
  T('apicurio', 'Apicurio Registry', 'redhat.apicurio-registry.svg', 'Integration', 'Schemas and APIs'),
  T('debezium', 'Debezium', 'redhat.debezium.png', 'Integration', 'Change data capture'),
  T('quay', 'Quay', 'redhat.quay.png', 'Security', 'Registry and scans'),
  T('tpa', 'Trusted Profile Analyzer', 'redhat.trusted-profile-analyzer.png', 'Security', 'SBOM and VEX'),
  T('tas', 'Trusted Artifact Signer', 'redhat.trusted-artifact-signer.png', 'Security', 'Sign and verify'),
  T('conforma', 'Conforma', 'redhat.conforma.png', 'Security', 'Policy checks'),
  T('grype', 'Grype', 'podman-desktop.grype.png', 'Security', 'Vulnerability scanner'),
  T('cryostat', 'Cryostat', 'redhat.cryostat.svg', 'Platform', 'JFR for containers'),
  T('edge', 'Edge Manager', 'redhat.edge-manager.svg', 'Platform', 'Fleets of devices'),
  T('satellite', 'Satellite', 'redhat.satellite.svg', 'Platform', 'Content and hosts'),
];

export const TOOL_CATEGORIES: LabTool['category'][] = ['AI', 'Build & ship', 'Integration', 'Security', 'Platform'];

export function tool(id: string | undefined): LabTool | undefined {
  return TOOLS.find(t => t.id === id);
}

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

const AGES = ['2 minutes', '14 minutes', '1 hour', '3 hours', '5 hours', '1 day', '2 days', '6 days', '3 weeks'];

const R = (connId: string, sectionId: string, name: string, status: string, sub: string, i: number, group?: string): LabResource => ({
  id: `${connId}/${sectionId}/${name}`,
  name,
  connId,
  sectionId,
  status,
  sub,
  age: AGES[i % AGES.length],
  group,
});

const PODMAN_CONTAINERS: [string, string, string, string?][] = [
  ['orders-api', 'quay.io/acme/orders-api:1.4', 'running', 'orders-stack'],
  ['orders-db', 'registry.redhat.io/rhel10/postgresql-16', 'running', 'orders-stack'],
  ['orders-cache', 'docker.io/valkey/valkey:8', 'running', 'orders-stack'],
  ['orders-worker', 'quay.io/acme/orders-worker:1.4', 'exited', 'orders-stack'],
  ['orders-ui', 'quay.io/acme/orders-ui:1.4', 'running', 'orders-stack'],
  ['frontend-web', 'quay.io/acme/frontend:2.1', 'running', 'frontend-pod'],
  ['frontend-proxy', 'registry.redhat.io/ubi10/nginx-126', 'running', 'frontend-pod'],
  ['frontend-infra', 'localhost/podman-pause:5.6', 'running', 'frontend-pod'],
  ['keycloak-dev', 'quay.io/keycloak/keycloak:26.4', 'running', 'auth-stack'],
  ['keycloak-db', 'registry.redhat.io/rhel10/postgresql-16', 'running', 'auth-stack'],
  ['kafka-0', 'quay.io/strimzi/kafka:0.48', 'running'],
  ['ai-lab-granite', 'quay.io/ai-lab/llamacpp-python:latest', 'running'],
  ['ai-lab-chatbot', 'quay.io/ai-lab/chatbot:1.2', 'running'],
  ['mcp-github', 'ghcr.io/github/github-mcp-server:0.9', 'running'],
  ['mcp-kubernetes', 'quay.io/containers/kubernetes-mcp-server:0.3', 'running'],
  ['postgres-test', 'docker.io/library/postgres:17', 'exited'],
  ['redis-session', 'docker.io/library/redis:8', 'running'],
  ['grafana', 'docker.io/grafana/grafana:12.2', 'running'],
  ['prometheus', 'quay.io/prometheus/prometheus:3.6', 'running'],
  ['jaeger', 'docker.io/jaegertracing/jaeger:2.11', 'stopped'],
  ['mailpit', 'docker.io/axllent/mailpit:1.27', 'running'],
  ['minio', 'quay.io/minio/minio:latest', 'running'],
  ['ubi-shell', 'registry.redhat.io/ubi10/ubi:latest', 'exited'],
  ['hello-quarkus', 'quay.io/acme/hello-quarkus:dev', 'running'],
  ['mta-analyzer', 'quay.io/konveyor/kantra:7.3', 'exited'],
  ['testcontainers-ryuk', 'docker.io/testcontainers/ryuk:0.13', 'running'],
  ['devcontainer-orders', 'mcr.microsoft.com/devcontainers/java:21', 'running'],
  ['buildah-worker', 'quay.io/buildah/stable:latest', 'exited'],
  ['trivy-scan', 'docker.io/aquasec/trivy:0.67', 'exited'],
  ['skopeo-sync', 'quay.io/skopeo/stable:latest', 'paused'],
];

const PODMAN_IMAGES = [
  'quay.io/acme/orders-api:1.4',
  'quay.io/acme/orders-worker:1.4',
  'quay.io/acme/orders-ui:1.4',
  'quay.io/acme/frontend:2.1',
  'quay.io/acme/hello-quarkus:dev',
  'registry.redhat.io/ubi10/ubi:latest',
  'registry.redhat.io/ubi10/nginx-126:latest',
  'registry.redhat.io/rhel10/postgresql-16:latest',
  'registry.redhat.io/rhel10/rhel-bootc:10.0',
  'quay.io/keycloak/keycloak:26.4',
  'quay.io/strimzi/kafka:0.48',
  'quay.io/ai-lab/llamacpp-python:latest',
  'quay.io/ai-lab/chatbot:1.2',
  'ghcr.io/github/github-mcp-server:0.9',
  'docker.io/valkey/valkey:8',
  'docker.io/library/postgres:17',
  'docker.io/library/redis:8',
  'docker.io/grafana/grafana:12.2',
  'quay.io/prometheus/prometheus:3.6',
  'quay.io/konveyor/kantra:7.3',
];

const NAMES = [
  'checkout',
  'payments',
  'catalog',
  'orders',
  'inventory',
  'shipping',
  'gateway',
  'auth',
  'search',
  'notifications',
  'reviews',
  'recommendations',
  'cart',
  'pricing',
  'ledger',
  'reports',
  'audit',
  'web',
  'mobile-bff',
  'analytics',
  'billing',
  'fraud',
];

const SPECIFIC: Record<string, string[]> = {
  topics: ['orders.created', 'orders.paid', 'orders.shipped', 'payments.authorized', 'payments.failed', 'inventory.reserved', 'inventory.released', 'customers.cdc', 'audit.log', 'notifications.email', 'dlq.orders', 'connect-offsets'],
  groups: ['orders-worker', 'payments-svc', 'inventory-svc', 'audit-sink', 'debezium-connect'],
  kusers: ['orders-app', 'payments-app', 'admin'],
  realms: ['acme', 'master'],
  clients: ['orders-ui', 'orders-api', 'payments', 'admin-cli', 'grafana', 'rhdh', 'quay', 'argocd', 'kafka-ui'],
  mcpservers: ['github', 'kubernetes', 'podman', 'filesystem', 'postgres', 'jira', 'slack', 'quay'],
  jobtemplates: ['Patch RHEL fleet', 'Deploy orders', 'Rotate certs', 'Backup postgres', 'Provision VM', 'Harden SSH', 'Register to Satellite', 'Restart kafka', 'Scale workers', 'Sync users', 'Compliance scan', 'Collect sos', 'Update bootc', 'Rollback orders'],
  inventories: ['rhel-fleet', 'edge-devices', 'ocp-nodes', 'db-hosts', 'lab'],
  inference: ['granite-3-8b', 'mistral-7b-instruct', 'llama-guard-3'],
  workbenches: ['fraud-notebook', 'rag-eval'],
  dspipelines: ['train-fraud', 'eval-rag', 'nightly-retrain', 'data-prep'],
  vms: ['fedora-ci', 'rhel9-legacy', 'windows-build'],
  pipelines: ['build-orders', 'build-payments', 'build-catalog', 'deploy-dev', 'promote-prod', 'scan-images', 'build-ui', 'e2e', 'nightly', 'release', 'docs', 'lint', 'bench', 'canary', 'cleanup', 'sbom', 'sign', 'mirror', 'helm-pkg', 'perf'],
  operators: ['OpenShift GitOps', 'OpenShift Pipelines', 'Streams for Apache Kafka', 'Red Hat build of Keycloak', 'OpenShift Virtualization', 'OpenShift AI', 'Service Interconnect', 'Cryostat', 'AMQ Broker'],
  advisor: ['CVE-2026-1234 openssl', 'Insecure SSH config', 'Kernel update available', 'SELinux permissive', 'Low disk on /var', 'NTP drift', 'Stale subscription'],
  overview: ['rhel10-dev'],
  subscription: ['RHEL for Developers'],
  helm: ['kafka-ui', 'grafana', 'postgres', 'keycloak'],
};

function statusFor(sectionId: string, i: number): string {
  if (['topics', 'groups', 'kusers', 'realms', 'clients', 'inventories', 'config', 'routes', 'services', 'networks', 'volumes', 'images', 'pvcs'].includes(sectionId)) return 'ready';
  if (i % 9 === 4) return 'degraded';
  if (i % 7 === 5) return 'stopped';
  return 'running';
}

function subFor(sectionId: string, connId: string, name: string, i: number): string {
  switch (sectionId) {
    case 'kpods':
      return `${(i % 3) + 1}/${(i % 3) + 1} ready · node ${connId}-worker-${i % 3}`;
    case 'deployments':
      return `${(i % 4) + 1} replicas`;
    case 'services':
      return `ClusterIP 172.30.${i}.${10 + i}`;
    case 'topics':
      return `${(i % 6) + 3} partitions · ${(i * 1771) % 99999} msgs`;
    case 'inference':
      return 'vLLM · 1 GPU · /v1/completions';
    case 'pipelines':
      return `last run ${AGES[i % AGES.length]} ago`;
    case 'mcptools':
      return `${NAMES[i % NAMES.length]} server`;
    default:
      return `${name}.${connId}`;
  }
}

function build(): LabResource[] {
  const out: LabResource[] = [];
  for (const c of CONNECTIONS) {
    for (const s of c.sections) {
      if (c.id === 'podman-machine-default' && s.id === 'containers') {
        PODMAN_CONTAINERS.forEach(([name, image, status, group], i) => out.push(R(c.id, s.id, name, status, image, i, group)));
        continue;
      }
      if (c.id === 'podman-machine-default' && s.id === 'images') {
        PODMAN_IMAGES.forEach((name, i) => out.push(R(c.id, s.id, name, 'ready', `${(i * 37) % 900 + 80} MB`, i)));
        continue;
      }
      const specific = SPECIFIC[s.id];
      for (let i = 0; i < s.count; i++) {
        let name: string;
        if (specific) name = specific[i % specific.length] + (i >= specific.length ? `-${Math.floor(i / specific.length) + 1}` : '');
        else if (s.id === 'containers') name = `${NAMES[(i + c.name.length) % NAMES.length]}-${i + 1}`;
        else if (s.id === 'images') name = `quay.io/acme/${NAMES[(i + c.name.length) % NAMES.length]}:${(i % 4) + 1}.0`;
        else if (s.id === 'kpods') name = `${NAMES[Math.floor(i / 2) % NAMES.length]}-${(7000 + i * 131).toString(16)}`;
        else if (s.id === 'nodes') name = i === 0 ? `${c.id}-control-plane` : `${c.id}-worker-${i}`;
        else if (s.id === 'mcptools') name = `${['list', 'get', 'create', 'delete'][i % 4]}_${NAMES[i % NAMES.length]}`;
        else name = NAMES[i % NAMES.length] + (i >= NAMES.length ? `-${i}` : '');
        out.push(R(c.id, s.id, name, statusFor(s.id, i), subFor(s.id, c.id, name, i), i));
      }
    }
  }
  return out;
}

export const RESOURCES: LabResource[] = build();

export function resourcesOf(connId: string, sectionId: string): LabResource[] {
  return RESOURCES.filter(r => r.connId === connId && r.sectionId === sectionId);
}

export function resource(id: string | undefined): LabResource | undefined {
  return RESOURCES.find(r => r.id === id);
}

/* ------------------------------------------------------------------ */
/* Kinds (P4) — resource kinds across connections                      */
/* ------------------------------------------------------------------ */

export interface LabKind {
  id: string;
  label: string;
  icon: IconRef;
  /** Section ids this kind aggregates across connections. */
  sections: string[];
  group: 'main' | 'platform';
}

export const KINDS: LabKind[] = [
  { id: 'containers', label: 'Containers', icon: ContainerIcon, sections: ['containers'], group: 'main' },
  { id: 'pods', label: 'Pods', icon: PodIcon, sections: ['pods', 'kpods'], group: 'main' },
  { id: 'images', label: 'Images', icon: ImageIcon, sections: ['images'], group: 'main' },
  { id: 'volumes', label: 'Volumes', icon: VolumeIcon, sections: ['volumes', 'pvcs'], group: 'main' },
  { id: 'networks', label: 'Networks', icon: NetworkIcon, sections: ['networks'], group: 'main' },
  { id: 'kubernetes', label: 'Kubernetes', icon: DeploymentIcon, sections: ['deployments', 'services', 'routes', 'config', 'jobs', 'cronjobs', 'nodes', 'pipelines', 'gitops', 'operators', 'servicenet', 'helm'], group: 'main' },
  { id: 'vms', label: 'VMs', icon: faServer, sections: ['vms', 'overview'], group: 'platform' },
  { id: 'services', label: 'Services', icon: faNetworkWired, sections: ['topics', 'groups', 'kusers', 'realms', 'clients', 'mcpservers', 'mcptools', 'jobtemplates', 'inventories', 'aapjobs'], group: 'platform' },
  { id: 'models', label: 'Models', icon: faRobot, sections: ['inference', 'workbenches'], group: 'platform' },
  { id: 'workflows', label: 'Workflows', icon: faDiagramProject, sections: ['dspipelines', 'pipelines'], group: 'platform' },
];

export function connectionsForKind(k: LabKind): LabConnection[] {
  return CONNECTIONS.filter(c => c.sections.some(s => k.sections.includes(s.id)));
}

/* ------------------------------------------------------------------ */
/* Workflows (P1 activity)                                             */
/* ------------------------------------------------------------------ */

export const WORKFLOWS = [
  { id: 'wf-build', name: 'Build, scan and push orders-api', icon: 'icons/redhat.konflux.png', steps: 5 },
  { id: 'wf-deploy', name: 'Deploy compose stack to ocp-dev', icon: 'icons/redhat.openshift-cluster-manager.svg', steps: 4 },
  { id: 'wf-model', name: 'Serve granite on rhoai-dev', icon: 'icons/redhat.openshift-ai.png', steps: 3 },
  { id: 'wf-bootc', name: 'Build RHEL bootc image for edge', icon: 'icons/redhat.bootc.png', steps: 6 },
  { id: 'wf-migrate', name: 'Analyse legacy app with MTA', icon: 'icons/redhat.mta.svg', steps: 4 },
  { id: 'wf-patch', name: 'Patch RHEL fleet with AAP', icon: 'icons/redhat.aap.png', steps: 3 },
];

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export type TargetKind = 'list' | 'resource' | 'tool' | 'settings' | 'dashboard' | 'extensions' | 'accounts' | 'connection' | 'kind' | 'tools' | 'workflow';

export interface LabTarget {
  kind: TargetKind;
  connId?: string;
  sectionId?: string;
  resId?: string;
  toolId?: string;
  kindId?: string;
  workflowId?: string;
}

export function targetKey(t: LabTarget): string {
  return [t.kind, t.connId, t.sectionId, t.resId, t.toolId, t.kindId, t.workflowId].filter(Boolean).join('|');
}

/** Resource target by name, or by index in its list. */
function res(connId: string, sectionId: string, key: string | number): LabTarget {
  const list = resourcesOf(connId, sectionId);
  const r = typeof key === 'number' ? list[key] : (list.find(x => x.name === key) ?? list[0]);
  return { kind: 'resource', connId, sectionId, resId: r?.id };
}

/** 16 pre-opened tabs across 8 connections + tools + Settings. */
export const MANY_TABS: LabTarget[] = [
  res('podman-machine-default', 'containers', 'orders-api'),
  res('podman-machine-default', 'containers', 'frontend-web'),
  res('podman-machine-default', 'images', 'quay.io/acme/orders-api:1.4'),
  res('rhel-10', 'containers', 0),
  res('desktop-linux', 'containers', 2),
  res('ocp-dev', 'kpods', 'checkout-1b58'),
  res('ocp-dev', 'deployments', 'checkout'),
  res('ocp-dev', 'pipelines', 'build-orders'),
  res('ocp-prod', 'kpods', 2),
  res('ocp-dev', 'vms', 'fedora-ci'),
  res('rhoai-dev', 'inference', 'granite-3-8b'),
  res('acme-kafka', 'topics', 'orders.created'),
  { kind: 'connection', connId: 'rhel10-dev' },
  { kind: 'tool', toolId: 'ai-lab' },
  { kind: 'tool', toolId: 'mta' },
  { kind: 'settings' },
];

export const FEW_TABS: LabTarget[] = [MANY_TABS[0], MANY_TABS[5], MANY_TABS[13]];

/* ------------------------------------------------------------------ */
/* Bottom panel sessions                                               */
/* ------------------------------------------------------------------ */

export interface PanelSession {
  id: string;
  kind: 'terminal' | 'logs' | 'yaml';
  title: string;
  connId: string;
  lines: string[];
}

export const PANEL_SESSIONS: PanelSession[] = [
  {
    id: 't1',
    kind: 'terminal',
    title: 'orders-api',
    connId: 'podman-machine-default',
    lines: ['sh-5.2$ curl -s localhost:8080/q/health | jq .status', '"UP"', 'sh-5.2$ ls /deployments', 'app  lib  quarkus  quarkus-run.jar', 'sh-5.2$ '],
  },
  {
    id: 't2',
    kind: 'terminal',
    title: 'oc rsh checkout-1b58',
    connId: 'ocp-dev',
    lines: ['~ $ oc rsh -n checkout checkout-1b58', 'sh-5.1$ env | grep KAFKA', 'KAFKA_BOOTSTRAP=acme-kafka-bootstrap:9092', 'sh-5.1$ '],
  },
  {
    id: 't3',
    kind: 'terminal',
    title: 'ssh rhel10-dev',
    connId: 'rhel10-dev',
    lines: ['[dev@rhel10-dev ~]$ sudo dnf check-update --security | head -3', 'openssl.x86_64      1:3.5.1-4.el10_0   rhel-10-baseos', 'kernel.x86_64       6.12.0-55.el10     rhel-10-baseos', '[dev@rhel10-dev ~]$ '],
  },
  {
    id: 't4',
    kind: 'terminal',
    title: 'kubectl · kind-dev',
    connId: 'kind-dev',
    lines: ['$ kubectl get pods -A | head -4', 'NAMESPACE     NAME                                READY   STATUS    AGE', 'kube-system   coredns-7db6d8ff4d-2xk9p            1/1     Running   2d', 'kube-system   etcd-kind-dev-control-plane         1/1     Running   2d', '$ '],
  },
  {
    id: 'l1',
    kind: 'logs',
    title: 'orders-api logs',
    connId: 'podman-machine-default',
    lines: ['2026-10-09 09:12:01 INFO  [io.quarkus] orders-api 1.4 started in 0.912s', '2026-10-09 09:12:01 INFO  [io.quarkus] Profile prod activated', '2026-10-09 09:14:22 INFO  [orders] POST /orders 201 (14 ms)', '2026-10-09 09:14:23 WARN  [kafka] Producer retrying, broker not available', '2026-10-09 09:14:24 INFO  [kafka] Producer connected to acme-kafka'],
  },
  {
    id: 'l2',
    kind: 'logs',
    title: 'checkout-1b58 logs',
    connId: 'ocp-dev',
    lines: ['{"level":"info","msg":"listening","port":8080}', '{"level":"info","msg":"GET /cart 200","ms":9}', '{"level":"error","msg":"payments timeout","ms":5000}', '{"level":"info","msg":"retry ok","ms":220}'],
  },
];

export const YAML_SESSION: PanelSession = {
  id: 'y1',
  kind: 'yaml',
  title: 'Edit deployment/checkout',
  connId: 'ocp-dev',
  lines: ['apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: checkout', '  namespace: checkout', 'spec:', '  replicas: 3', '  template:', '    spec:', '      containers:', '        - name: checkout', '          image: quay.io/acme/checkout:2.3'],
};

export const STATUS_DOT: Record<string, string> = {
  running: 'bg-[var(--pd-status-running)]',
  ready: 'bg-[var(--pd-status-running)]',
  stopped: 'bg-[var(--pd-status-stopped)]',
  exited: 'bg-[var(--pd-status-exited)]',
  paused: 'bg-[var(--pd-status-paused)]',
  degraded: 'bg-[var(--pd-status-degraded)]',
  error: 'bg-[var(--pd-status-dead)]',
  starting: 'bg-[var(--pd-status-starting)]',
};

/** Fallback icon used for tab of a settings/extension page. */
export const GEAR = faGear;
