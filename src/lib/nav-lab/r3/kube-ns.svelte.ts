/**
 * P13 Kubernetes namespace selection, remembered per cluster: selected
 * namespaces ('*' = all namespaces) and pinned favourites.
 */
import { type LabResource, RESOURCES } from '../data.ts';
import { isSystemNs, kubeHomeNs } from './kube-data.ts';
import { live } from './live.svelte.ts';

class KubeNs {
  /** Selected namespaces per cluster; `['*']` = all namespaces. */
  sel = $state<Record<string, string[]>>({});
  /** Pinned (favourite) namespaces per cluster. */
  pinned = $state<Record<string, string[]>>({});
  /** Cluster whose namespace picker should open ("Select namespaces…" from a menu). */
  picker = $state<string | undefined>(undefined);
}

export const kubeNs = new KubeNs();

/** Namespaces of a cluster (from its Namespaces resources): app namespaces first, then platform ones. */
export function namespacesOf(connId: string): string[] {
  void live.added;
  const all = RESOURCES.filter(r => r.connId === connId && r.sectionId === 'namespaces' && !live.deleted.includes(r.id)).map(r => r.name);
  return [...all.filter(n => !isSystemNs(n)).sort(), ...all.filter(isSystemNs).sort()];
}

/** Default selection of a cluster: the developer namespace, else the first app namespace. */
function defaultNs(connId: string): string[] {
  const all = namespacesOf(connId);
  const home = kubeHomeNs(connId);
  return [home && all.includes(home) ? home : (all[0] ?? 'default')];
}

export function selectedNs(connId: string): string[] {
  return kubeNs.sel[connId] ?? defaultNs(connId);
}

export function allNs(connId: string): boolean {
  return selectedNs(connId).includes('*');
}

export function setNs(connId: string, ns: string[]): void {
  kubeNs.sel[connId] = ns.length ? ns : ['*'];
}

/**
 * Add / remove one namespace. From "All namespaces" every namespace counts as
 * checked, so unchecking one keeps all the others; checking the last missing
 * one goes back to "All namespaces".
 */
export function toggleNs(connId: string, ns: string): void {
  const every = namespacesOf(connId);
  const cur = allNs(connId) ? every : selectedNs(connId);
  const next = cur.includes(ns) ? cur.filter(x => x !== ns) : [...cur, ns];
  setNs(connId, every.length > 0 && every.every(n => next.includes(n)) ? ['*'] : next);
}

/** Pinned namespaces (default: the developer namespace). */
export function pinnedNs(connId: string): string[] {
  const home = kubeHomeNs(connId);
  return kubeNs.pinned[connId] ?? (home ? [home] : []);
}

export function togglePin(connId: string, ns: string): void {
  const cur = pinnedNs(connId);
  kubeNs.pinned[connId] = cur.includes(ns) ? cur.filter(x => x !== ns) : [...cur, ns];
}

/** Short label of the selection: "All namespaces", "orders", "3 namespaces". */
export function nsLabel(connId: string): string {
  const s = selectedNs(connId);
  if (s.includes('*')) return 'All namespaces';
  return s.length > 1 ? `${s.length} namespaces` : s[0];
}

/** True when a resource is visible with the cluster's namespace selection (cluster-scoped kinds always are). */
export function inNs(r: LabResource): boolean {
  if (!r.ns) return true;
  const s = selectedNs(r.connId);
  return s.includes('*') || s.includes(r.ns);
}

/** Show a Namespace column (more than one namespace selected). */
export function multiNs(connId: string): boolean {
  const s = selectedNs(connId);
  return s.includes('*') || s.length > 1;
}
