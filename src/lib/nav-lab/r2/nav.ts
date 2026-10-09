/** Builds today's PD kinds navigation for a connection scope (round 2). */
import { CONNECTIONS, conn, type LabTarget, tool } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { connHasKind, contributedSections, ctxColor, kindOfSection, KUBE_CORE, PD_KINDS, rowsFor, sectionMeta } from './ctx.ts';
import type { NavEntry } from './KindsNav.svelte';

/**
 * `k:<kind>` kinds, `s:<section>` sections (Kubernetes children or contributed
 * engine/service sections). `scope` undefined = every connection.
 */
export function navEntries(scope: string[] | undefined, opts: { expandKube?: boolean; contributed?: boolean } = {}): NavEntry[] {
  const ids = scope ?? CONNECTIONS.map(c => c.id);
  const out: NavEntry[] = [];
  for (const k of PD_KINDS) {
    if (!ids.some(id => {
      const c = conn(id);
      return c && connHasKind(c, k.id);
    }) && !(k.id === 'kubernetes' && ids.some(id => conn(id)?.group === 'Kubernetes'))) continue;
    out.push({ id: `k:${k.id}`, label: k.label, icon: k.icon, count: rowsFor(k.id, undefined, scope).length });
    if (k.id === 'kubernetes' && opts.expandKube) {
      for (const sid of KUBE_CORE) {
        const m = sectionMeta(sid);
        if (m) out.push({ id: `s:${sid}`, label: m.label, icon: m.icon, count: rowsFor('kubernetes', sid, scope).length, child: true });
      }
      for (const s of contributedSections(ids.filter(id => conn(id)?.group === 'Kubernetes'))) {
        out.push({ id: `s:${s.id}`, label: s.label, icon: s.icon, ext: s.ext?.icon, count: rowsFor('kubernetes', s.id, scope).length, child: true });
      }
    }
  }
  if (opts.contributed) {
    for (const s of contributedSections(ids.filter(id => conn(id)?.group !== 'Kubernetes'))) {
      out.push({ id: `s:${s.id}`, label: s.label, icon: s.icon, ext: s.ext?.icon, count: rowsFor('x', s.id, scope).length });
    }
  }
  return out;
}

/** Nav id → home target (kind list). */
export function navTarget(id: string): LabTarget | undefined {
  if (id.startsWith('k:')) {
    const kindId = id.slice(2);
    return { kind: 'kind', kindId, sectionId: kindId === 'kubernetes' ? 'deployments' : undefined };
  }
  if (id.startsWith('s:')) {
    const sid = id.slice(2);
    return { kind: 'kind', kindId: PD_KINDS.some(k => k.id === 'kubernetes' && k.sections.includes(sid)) || isKubeSection(sid) ? 'kubernetes' : 'x', sectionId: sid };
  }
  if (id.startsWith('x:')) return { kind: 'tool', toolId: id.slice(2) };
  if (id === 'dashboard' || id === 'extensions' || id === 'settings' || id === 'accounts') return { kind: id };
  return undefined;
}

function isKubeSection(sid: string): boolean {
  return CONNECTIONS.some(c => c.group === 'Kubernetes' && c.sections.some(s => s.id === sid));
}

/** Target → nav id (selection highlight). */
export function navIdOf(t: LabTarget | undefined): string | undefined {
  if (!t) return undefined;
  if (t.kind === 'kind') {
    if (t.kindId === 'kubernetes') return t.sectionId ? `s:${t.sectionId}` : 'k:kubernetes';
    return t.sectionId ? `s:${t.sectionId}` : `k:${t.kindId}`;
  }
  if (t.kind === 'tool') return `x:${t.toolId}`;
  return t.kind;
}

export function favEntries(favs: string[]): NavEntry[] {
  return favs.map(id => tool(id)).filter(t => !!t).map(t => ({ id: `x:${t!.id}`, label: t!.name, icon: t!.icon }));
}

/** Overlay H tint for a scope (single connection with a colour). */
export function tintFor(scope: string[] | undefined): string | undefined {
  return lab.color && scope?.length === 1 ? ctxColor(scope[0]) : undefined;
}

/** A per-connection list target → round-2 kind target (scope carries the connection). */
export function listToKind(sectionId: string | undefined): LabTarget {
  const k = sectionId ? kindOfSection(sectionId) : undefined;
  if (!k) return { kind: 'kind', kindId: 'x', sectionId };
  return { kind: 'kind', kindId: k.id, sectionId: k.id === 'kubernetes' ? sectionId : undefined };
}
