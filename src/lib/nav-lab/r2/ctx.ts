/**
 * Round-2 helpers shared by P6–P11: today's PD kinds (no new concepts),
 * per-connection context colour (overlay H), scope filtering, omnibox search.
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

/* ------------------------------------------------------------------ */
/* Omnibox search (P11)                                                */
/* ------------------------------------------------------------------ */

export type OmniKind = 'connection' | 'kind' | 'resource' | 'command' | 'extension' | 'pair';

export interface OmniResult {
  kind: OmniKind;
  id: string;
  label: string;
  sub?: string;
  icon?: IconRef;
  connId?: string;
  kindId?: string;
  resource?: LabResource;
}

export const COMMANDS: { id: string; label: string; sub: string }[] = [
  { id: 'create-container', label: 'Create container…', sub: 'Run an image on the active engine' },
  { id: 'pull-image', label: 'Pull image…', sub: 'From a registry' },
  { id: 'toggle-panel', label: 'Toggle panel', sub: 'Terminals, logs (`)' },
  { id: 'theme', label: 'Switch theme', sub: 'Dark / light' },
  { id: 'start-machine', label: 'Start podman-machine-dev', sub: 'Podman machine' },
  { id: 'kube-context', label: 'Switch Kubernetes context…', sub: 'kubeconfig' },
  { id: 'colour', label: 'Toggle connection colours', sub: 'Overlay H' },
  { id: 'settings', label: 'Open Settings', sub: 'Preferences, proxies, registries' },
];

const SECTION_RANK = ['kpods', 'containers', 'deployments', 'pods', 'services', 'routes', 'images'];

/** Rank resource matches: workload kinds first, then interleave connections so same names on several clusters surface together. */
function rankResources(list: LabResource[]): LabResource[] {
  const rank = (r: LabResource): number => {
    const i = SECTION_RANK.indexOf(r.sectionId);
    return i < 0 ? 99 : i;
  };
  const by = new Map<string, LabResource[]>();
  for (const r of [...list].sort((a, b) => rank(a) - rank(b))) {
    const arr = by.get(r.connId) ?? [];
    arr.push(r);
    by.set(r.connId, arr);
  }
  const queues = [...by.values()].sort((a, b) => rank(a[0]) - rank(b[0]));
  const out: LabResource[] = [];
  while (queues.some(q => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!);
  return out;
}

function has(s: string, q: string): boolean {
  return s.toLowerCase().includes(q);
}

/** Prefixes: `@` connections, `>` commands, `#` extensions; `@conn text` filters inside a connection. */
export function omniSearch(raw: string): { groups: { title: string; items: OmniResult[] }[]; total: number } {
  const q = raw.trim().toLowerCase();
  const groups: { title: string; items: OmniResult[] }[] = [];
  const connRes = (c: LabConnection): OmniResult => ({ kind: 'connection', id: c.id, label: c.name, sub: `${c.product} · ${c.status}`, connId: c.id });
  const resRes = (r: LabResource): OmniResult => ({ kind: 'resource', id: r.id, label: r.name, sub: `${sectionMeta(r.sectionId)?.label ?? ''} · ${r.sub}`, connId: r.connId, resource: r, icon: sectionMeta(r.sectionId)?.icon });
  if (q.startsWith('>')) {
    const t = q.slice(1).trim();
    groups.push({ title: 'Commands', items: COMMANDS.filter(c => has(c.label, t)).map(c => ({ kind: 'command', id: c.id, label: c.label, sub: c.sub })) });
  } else if (q.startsWith('#')) {
    const t = q.slice(1).trim();
    groups.push({ title: 'Extension pages', items: TOOLS.filter(x => has(x.name, t) || has(x.description, t)).map(x => ({ kind: 'extension', id: x.id, label: x.name, sub: x.description, icon: x.icon })) });
  } else if (q.startsWith('@')) {
    const [head, ...rest] = q.slice(1).split(/\s+/);
    const text = rest.join(' ');
    const conns = CONNECTIONS.filter(c => has(c.name, head));
    if (text && conns.length) {
      const ids = conns.map(c => c.id);
      groups.push({ title: `In ${conns.length === 1 ? conns[0].name : `${conns.length} connections`}`, items: rankResources(RESOURCES.filter(r => ids.includes(r.connId) && has(r.name, text))).slice(0, 12).map(resRes) });
    } else {
      groups.push({ title: 'Connections', items: conns.map(connRes) });
      const pairs: OmniResult[] = [];
      for (const c of conns.slice(0, 3)) for (const k of kindsOf(c)) pairs.push({ kind: 'pair', id: `${c.id}|${k.id}`, label: `${c.name} › ${k.label}`, connId: c.id, kindId: k.id, icon: k.icon, sub: `${countFor(k.id, [c.id])} items` });
      groups.push({ title: 'Go to', items: pairs.slice(0, 8) });
    }
  } else if (q) {
    groups.push({ title: 'Kinds', items: PD_KINDS.filter(k => has(k.label, q)).map(k => ({ kind: 'kind', id: k.id, label: k.label, icon: k.icon, kindId: k.id, sub: `${countFor(k.id, undefined)} across all connections` })) });
    groups.push({ title: 'Connections', items: CONNECTIONS.filter(c => has(c.name, q) || has(c.product, q)).slice(0, 5).map(connRes) });
    groups.push({ title: 'Resources', items: rankResources(RESOURCES.filter(r => has(r.name, q))).slice(0, 9).map(resRes) });
    groups.push({ title: 'Extension pages', items: TOOLS.filter(x => has(x.name, q)).slice(0, 4).map(x => ({ kind: 'extension', id: x.id, label: x.name, sub: x.description, icon: x.icon })) });
    groups.push({ title: 'Commands', items: COMMANDS.filter(c => has(c.label, q)).slice(0, 3).map(c => ({ kind: 'command', id: c.id, label: c.label, sub: c.sub })) });
  } else {
    groups.push({ title: 'Recent', items: [RESOURCES.find(r => r.name === 'checkout-1b58'), RESOURCES.find(r => r.name === 'orders-api')].filter((r): r is LabResource => !!r).map(resRes) });
    groups.push({ title: 'Connections', items: RECENT_CONNS.map(id => conn(id)).filter((c): c is LabConnection => !!c).map(connRes) });
    groups.push({ title: 'Try', items: [
      { kind: 'command', id: 'hint-@', label: '@ocp-dev checkout', sub: '@ jumps to a connection' },
      { kind: 'command', id: 'hint->', label: '> create', sub: '> runs a command' },
      { kind: 'command', id: 'hint-#', label: '# ai lab', sub: '# opens an extension page' },
    ] });
  }
  const filtered = groups.filter(g => g.items.length);
  return { groups: filtered, total: filtered.reduce((a, g) => a + g.items.length, 0) };
}
