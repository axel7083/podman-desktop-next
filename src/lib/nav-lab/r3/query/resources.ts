/** P13 Views: what a query can see. */
import { faBorderAll } from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

import { conn, type LabConnection, type LabResource, RESOURCES, section } from '../../data.ts';
import { labConns } from '../../r2/simple.ts';
import { sectionVisible } from '../exts.ts';
import { KIND } from '../kube-details.svelte.ts';
import { connStatus, isUp, live } from '../live.svelte.ts';

/** Sections merged under one type across engines and clusters. */
const TYPE_BY_SECTION: Record<string, [string, string]> = {
  containers: ['container', 'Container'],
  pods: ['pod', 'Pod'],
  kpods: ['pod', 'Pod'],
  images: ['image', 'Image'],
  volumes: ['volume', 'Volume'],
  pvcs: ['volume', 'Volume'],
  networks: ['network', 'Network'],
  compose: ['compose', 'Compose'],
};

/** Types listed first in the autocomplete. */
export const CORE_TYPES = ['container', 'pod', 'image', 'volume', 'network', 'compose', 'deployment', 'service'];

export interface ResourceKind {
  id: string;
  label: string;
  icon: IconRef;
}

const kinds = new Map<string, ResourceKind>();

export function kindOf(r: LabResource): ResourceKind {
  const key = `${r.connId}/${r.sectionId}`;
  let kind = kinds.get(key);
  if (!kind) {
    kind = computeKind(r);
    kinds.set(key, kind);
  }
  return kind;
}

function computeKind(r: LabResource): ResourceKind {
  const s = section(conn(r.connId), r.sectionId);
  const icon = s?.ext?.icon ?? s?.icon ?? faBorderAll;
  const known = TYPE_BY_SECTION[r.sectionId];
  if (known) return { id: known[0], label: known[1], icon };
  const kube = KIND[r.sectionId]?.[0];
  if (kube) return { id: kube.toLowerCase(), label: kube, icon };
  const label = (s?.label ?? r.sectionId).replace(/s$/, '');
  return { id: label.toLowerCase().replaceAll(' ', '-'), label, icon };
}

/** Visible connections a query can reach: a stopped engine or cluster cannot be listed. */
export function searchedConns(): { reachable: LabConnection[]; unreachable: LabConnection[] } {
  const all = labConns();
  const reachable = all.filter(c => isUp(connStatus(c)));
  return { reachable, unreachable: all.filter(c => !reachable.includes(c)) };
}

/** Every visible, reachable, non-deleted resource, across connections. */
export function allResources(): LabResource[] {
  void live.added;
  const conns = new Map(searchedConns().reachable.map(c => [c.id, c]));
  // Generated names can repeat within a section (MCP tools): one row per id.
  const seen = new Set<string>();
  return RESOURCES.filter(r => {
    const c = conns.get(r.connId);
    const s = c && section(c, r.sectionId);
    if (!s || !sectionVisible(s) || live.deleted.includes(r.id) || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
