/** P13 Kubernetes cluster context-menu items (namespace selection). */
import { faLayerGroup, faListCheck, faStar } from '@fortawesome/free-solid-svg-icons';

import type { LabConnection, LabTarget } from '../data.ts';
import type { MenuItem } from './live.svelte.ts';
import { allNs, kubeNs, namespacesOf, pinnedNs, selectedNs, setNs } from './kube-ns.svelte.ts';

/** Namespaces listed directly in the menu; the rest go through "Select namespaces…". */
const MAX = 6;

/**
 * Namespace items of a cluster right-click menu: All namespaces, pinned
 * namespaces first, then the others, and "Select namespaces…" (opens the
 * cluster Overview with its namespace picker open) when `onopen` is given.
 */
export function nsMenu(c: LabConnection, onopen?: (t: LabTarget, o: { preview?: boolean }) => void): MenuItem[] {
  const cur = allNs(c.id) ? [] : selectedNs(c.id);
  const pinned = pinnedNs(c.id);
  const all = namespacesOf(c.id);
  const list = [...pinned.filter(n => all.includes(n)), ...all.filter(n => !pinned.includes(n))].slice(0, MAX);
  return [
    { label: `${cur.length ? '' : '✓ '}All namespaces`, icon: faLayerGroup, run: (): void => setNs(c.id, ['*']), sep: true },
    ...list.map(n => ({ label: `${cur.includes(n) ? '✓ ' : ''}Namespace ${n}`, icon: pinned.includes(n) ? faStar : undefined, run: (): void => setNs(c.id, [n]) })),
    ...(onopen
      ? [
          {
            label: 'Select namespaces…',
            icon: faListCheck,
            run: (): void => {
              kubeNs.picker = c.id;
              onopen({ kind: 'connection', connId: c.id }, {});
            },
          },
        ]
      : []),
  ];
}
