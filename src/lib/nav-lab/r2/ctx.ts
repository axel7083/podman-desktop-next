/**
 * Round-2 helpers shared by P6–P14: today's PD kinds (no new concepts),
 * per-connection context colour (overlay H), scope filtering.
 */
import { faPuzzlePiece, faUser } from '@fortawesome/free-solid-svg-icons';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';

import type { IconRef } from '#lib/ext/types.ts';
import DashboardIcon from '#lib/images/DashboardIcon.svelte';
import DeploymentIcon from '#lib/images/DeploymentIcon.svelte';
import ImageIcon from '#lib/images/ImageIcon.svelte';
import NetworkIcon from '#lib/images/NetworkIcon.svelte';
import PodIcon from '#lib/images/PodIcon.svelte';
import SettingsIcon from '#lib/images/SettingsIcon.svelte';
import VolumeIcon from '#lib/images/VolumeIcon.svelte';

import { CONNECTIONS, conn, type LabConnection, type LabResource, type LabSection, RESOURCES, TOOLS } from '../data.ts';

/* ------------------------------------------------------------------ */
/* Overlay H: context colour                                           */
/* ------------------------------------------------------------------ */

/** User-assigned connection colours (local engines neutral, prod red). */
export const CTX_COLOR: Record<string, string | undefined> = {
  'kind-dev': '#22c55e',
  minc: '#14b8a6',
  'openshift-local': '#3b82f6',
  'ocp-dev': '#f59e0b',
  'ocp-prod': '#ef4444',
  'rhoai-dev': '#a855f7',
  sandbox: '#06b6d4',
  'rhel10-dev': '#64748b',
  'acme-kafka': '#84cc16',
  'acme-keycloak': '#0ea5e9',
  'mcp-gateway': '#d946ef',
  'aap-acme-prod': '#dc2626',
};

export const CTX_LABEL: Record<string, string> = { 'ocp-prod': 'PROD', 'aap-acme-prod': 'PROD' };

export function ctxColor(id: string | undefined): string | undefined {
  return id ? CTX_COLOR[id] : undefined;
}

/** Remote clusters / services (not on this machine): opt-in in aggregated lists (P8). */
export const REMOTE = ['ocp-dev', 'ocp-prod', 'rhoai-dev', 'sandbox', 'rhel10-dev', 'acme-kafka', 'acme-keycloak', 'mcp-gateway', 'aap-acme-prod'];

/* ------------------------------------------------------------------ */
/* Kinds: today's PD navigation                                        */
/* ------------------------------------------------------------------ */

export interface PdKind {
  id: string;
  label: string;
  icon: IconRef;
  /** Section ids (from the dataset) aggregated by this kind. */
  sections: string[];
}

export const PD_KINDS: PdKind[] = [
  { id: 'containers', label: 'Containers', icon: ContainerIcon, sections: ['containers'] },
  { id: 'pods', label: 'Pods', icon: PodIcon, sections: ['pods', 'kpods'] },
  { id: 'images', label: 'Images', icon: ImageIcon, sections: ['images'] },
  { id: 'volumes', label: 'Volumes', icon: VolumeIcon, sections: ['volumes', 'pvcs'] },
  { id: 'networks', label: 'Networks', icon: NetworkIcon, sections: ['networks'] },
  { id: 'kubernetes', label: 'Kubernetes', icon: DeploymentIcon, sections: ['nodes', 'deployments', 'services', 'routes', 'config', 'jobs', 'cronjobs'] },
];

export const KUBE_CORE = ['nodes', 'deployments', 'services', 'routes', 'config', 'jobs', 'cronjobs'];

export const DASHBOARD_ICON = DashboardIcon;
export const SETTINGS_ICON = SettingsIcon;
export const EXTENSIONS_ICON = faPuzzlePiece;
export const ACCOUNTS_ICON = faUser;

export function pdKind(id: string | undefined): PdKind | undefined {
  return PD_KINDS.find(k => k.id === id);
}

/** Kind that owns a section (contributed k8s sections fold into Kubernetes). */
export function kindOfSection(sectionId: string): PdKind | undefined {
  return PD_KINDS.find(k => k.sections.includes(sectionId)) ?? (CONNECTIONS.some(c => c.group === 'Kubernetes' && c.sections.some(s => s.id === sectionId && s.ext)) ? pdKind('kubernetes') : undefined);
}

export function sectionMeta(sectionId: string): LabSection | undefined {
  for (const c of CONNECTIONS) {
    const s = c.sections.find(x => x.id === sectionId);
    if (s) return s;
  }
  return undefined;
}

/** Extension-contributed sections provided by the scoped connections (deduplicated). */
export function contributedSections(scope: string[]): (LabSection & { conns: string[] })[] {
  const out = new Map<string, LabSection & { conns: string[] }>();
  for (const id of scope) {
    const c = conn(id);
    for (const s of c?.sections ?? []) {
      if (!s.ext) continue;
      const e = out.get(s.id);
      if (e) e.conns.push(id);
      else out.set(s.id, { ...s, conns: [id] });
    }
  }
  return [...out.values()];
}

export function rowsFor(kindId: string, sectionId: string | undefined, scope: string[] | undefined): LabResource[] {
  const k = pdKind(kindId);
  const secs = sectionId ? [sectionId] : (k?.sections ?? []);
  return RESOURCES.filter(r => secs.includes(r.sectionId) && (!scope || scope.includes(r.connId)));
}

export function countFor(kindId: string, scope: string[] | undefined): number {
  return rowsFor(kindId, undefined, scope).length;
}

/** Does this connection provide this kind? */
export function connHasKind(c: LabConnection, kindId: string): boolean {
  const k = pdKind(kindId);
  return !!k && c.sections.some(s => k.sections.includes(s.id));
}

/** Kinds a connection provides (for "connection › Kind" shortcuts). */
export function kindsOf(c: LabConnection): PdKind[] {
  return PD_KINDS.filter(k => connHasKind(c, k.id));
}

/** Default kind to land on for a connection (engines: Containers, clusters: Pods). */
export function defaultKind(c: LabConnection | undefined): string {
  if (!c) return 'containers';
  if (connHasKind(c, 'containers')) return 'containers';
  if (connHasKind(c, 'pods')) return 'pods';
  return kindsOf(c)[0]?.id ?? 'containers';
}

export const RUNNING = CONNECTIONS.filter(c => c.status === 'running' || c.status === 'starting').map(c => c.id);
export const ENGINES = CONNECTIONS.filter(c => c.group === 'Engines').map(c => c.id);

export const RECENT_CONNS = ['ocp-dev', 'podman-machine-default', 'kind-dev', 'ocp-prod'];
export const PINNED_CONNS = ['ocp-dev', 'podman-machine-default'];

/** Short scope label for chips. */
export function scopeLabel(scope: string[]): string {
  if (scope.length === 0) return 'Nothing selected';
  if (scope.length === 1) return conn(scope[0])?.name ?? '?';
  if (scope.length === ENGINES.length && ENGINES.every(e => scope.includes(e))) return 'All engines';
  if (scope.length === CONNECTIONS.length) return 'All connections';
  if (RUNNING.length === scope.length && RUNNING.every(e => scope.includes(e))) return 'All running';
  const groups = new Set(scope.map(id => conn(id)?.group));
  const g = [...groups][0];
  if (groups.size === 1 && g) {
    const all = CONNECTIONS.filter(c => c.group === g).map(c => c.id);
    if (all.every(x => scope.includes(x))) return `All ${g === 'VMs & services' ? 'VMs & services' : g.toLowerCase()}`;
  }
  return `${scope.length} connections`;
}
