/**
 * Scenario presets (plan §2). A scenario is a set of extension tags plus world
 * fixtures (handled by each extension's `seed` / `connections` reading the
 * ScenarioContext). Selecting several scenarios takes the union.
 */
import type { ScenarioContext, ScenarioId } from '#lib/ext/types.ts';

export interface Scenario {
  id: ScenarioId;
  label: string;
  persona: string;
  description: string;
  /** Representative extension icon for the picker. */
  icon: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'community',
    label: 'Community',
    persona: 'Baseline developer',
    description: 'Podman, Docker, Compose, Kind, Minikube, kubectl, registries, Quadlet, PostgreSQL, Grype.',
    icon: 'icons/podman-desktop.podman.png',
  },
  {
    id: 'rhel',
    label: 'RHEL customer',
    persona: 'Builds and runs on Red Hat Enterprise Linux',
    description: 'Red Hat account, RHEL VMs and Podman machine, bootc, RHEL Lightspeed, Image Builder, security checkers.',
    icon: 'icons/redhat.rhel-vms.png',
  },
  {
    id: 'openshift',
    label: 'OpenShift customer',
    persona: 'Deploys to OpenShift',
    description: 'OpenShift Local, Developer Sandbox, MINC + console add-on, OCM clusters, OpenShift CLI pack, OLM, Quay.',
    icon: 'icons/redhat.openshift-local.png',
  },
  {
    id: 'appdev',
    label: 'App developer',
    persona: 'Java and middleware',
    description: 'Quarkus Dev Services, Kafka + Apicurio, Keycloak, Debezium, MTA, Cryostat, Testcontainers.',
    icon: 'icons/podman-desktop.compose.png',
  },
  {
    id: 'ai',
    label: 'AI developer',
    persona: 'Local models and agents',
    description: 'AI Lab, RHAIIS, ModelCar, OpenShift AI, MaaS, MCP hub, skills.',
    icon: 'icons/redhat.ai-lab.png',
  },
  {
    id: 'platform',
    label: 'Platform engineer',
    persona: 'Supply chain and developer portals',
    description: 'RHADS pack: RHTAS, TPA, Conforma, preflight, Konflux, RHDH Local; local registry, Trivy, Helm.',
    icon: 'icons/redhat.rhads-pack.png',
  },
  {
    id: 'automation',
    label: 'Automation',
    persona: 'Ansible content creator',
    description: 'Ansible ADT, EE builder, navigator, Export as Ansible, EDA, AAP.',
    icon: 'icons/redhat.ansible.png',
  },
  {
    id: 'windows',
    label: 'Windows developer',
    persona: 'WSL-first workflow',
    description: 'WSL Containers engine, Podman machine on WSL, Docker contexts, engine capability matrix.',
    icon: 'icons/podman-desktop.wslc.png',
  },
];

export const ALL_SCENARIO_IDS: ScenarioId[] = SCENARIOS.map(s => s.id);

/** Parse `?scenario=openshift+rhel` (also accepts `,` and `everything`). */
export function parseScenarioParam(value: string | null): ScenarioId[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(/[\s+,]+/)
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.includes('everything') || parts.includes('all')) return [...ALL_SCENARIO_IDS];
  const ids = parts.filter((p): p is ScenarioId => (ALL_SCENARIO_IDS as string[]).includes(p));
  return ids.length ? ids : undefined;
}

/** Stable key of a scenario selection (used for persistence). */
export function scenarioKey(ids: readonly ScenarioId[]): string {
  if (ids.length === ALL_SCENARIO_IDS.length) return 'everything';
  return [...ids].sort().join('+') || 'none';
}

export function scenarioLabel(ids: readonly ScenarioId[]): string {
  if (ids.length === ALL_SCENARIO_IDS.length) return 'Everything';
  return ids.map(id => SCENARIOS.find(s => s.id === id)?.label ?? id).join(' + ') || 'None';
}

export function scenarioContext(ids: readonly ScenarioId[]): ScenarioContext {
  const set = new Set(ids);
  return { scenarios: set, has: (id: ScenarioId): boolean => set.has(id) };
}
