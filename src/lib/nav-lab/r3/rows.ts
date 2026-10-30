/** P13 table rows shared by the resource lists and the Views results. */
import { faPlay, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

import { conn, KUBE_KINDS, type LabResource, type LabTarget, section } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import { containerInfo, hash, imageInfo, usedByCount } from './details.ts';
import { kubeActs, kubeMenu, liveCols, rowStatus } from './kube-details.svelte.ts';
import { can, deleteRes, imageMenu, isUp, resActions, resStatus, startRes, stopRes } from './live.svelte.ts';

type Open = (t: LabTarget, opts: { preview?: boolean }) => void;

function upper(st: string): string {
  return st === 'ready' ? 'RUNNING' : st === 'error' ? 'DEGRADED' : st.toUpperCase();
}

/** Leading dot only for images / volumes in use (rule B7), with its tooltip. */
function usedDot(r: LabResource): { status: string; dotTitle?: string } {
  const n = usedByCount(r);
  return n ? { status: 'RUNNING', dotTitle: `In use by ${n} container${n > 1 ? 's' : ''}` } : { status: '' };
}

function openers(r: LabResource, onopen: Open): Pick<LabRow, 'open' | 'pin'> {
  const target: LabTarget = { kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id };
  return { open: (): void => onopen(target, { preview: true }), pin: (): void => onopen(target, { preview: false }) };
}

/** Row of an engine resource (containers, images, volumes…) and platform lists. */
export function engineRow(r: LabResource, icon: IconRef, onopen: Open): LabRow {
  const st = resStatus(r);
  const up = isUp(st);
  const startStop = can.start(r.sectionId)
    ? [up ? { title: 'Stop', icon: faStop, run: (): void => stopRes(r) } : { title: 'Start', icon: faPlay, run: (): void => startRes(r) }]
    : [];
  const del = { title: 'Delete', icon: faTrash, danger: true, run: (): void => deleteRes(r) };
  if (r.sectionId === 'images') {
    const im = imageInfo(r);
    const [repo, tag] = r.name.split(/:(?=[^:/]+$)/);
    return {
      name: r.id,
      r,
      ...usedDot(r),
      icon,
      title: repo,
      shortId: (hash(r.name) * 2654435761).toString(16).slice(0, 12).padEnd(12, '0'),
      sub: [tag ?? 'latest'],
      cols: { age: r.age, size: im.size, arch: im.arch },
      ...openers(r, onopen),
      buttons: [{ title: 'Run Image', icon: faPlay, run: (): void => lab.openCreate(`Run ${r.name}`) }, del],
      menu: () => imageMenu(r, onopen),
    };
  }
  if (r.sectionId === 'containers') {
    const ci = containerInfo(r);
    return {
      name: r.id,
      r,
      status: upper(st),
      icon,
      title: r.name,
      sub: [st.toUpperCase(), ci.ports.length ? `PORT${ci.ports.length > 1 ? 'S' : ''} ${ci.ports.join(', ')}` : ''].filter(Boolean),
      cols: { image: ci.image, uptime: up ? r.age : '', age: r.age },
      ...openers(r, onopen),
      buttons: [...startStop, del],
      menu: () => resActions(r, onopen),
    };
  }
  return {
    name: r.id,
    r,
    ...(r.sectionId === 'volumes' ? usedDot(r) : { status: upper(st) }),
    icon,
    title: r.name,
    sub: [r.sub],
    cols: { age: r.age },
    ...openers(r, onopen),
    buttons: [...startStop, del],
    menu: () => resActions(r, onopen),
  };
}

/** Row of a Kubernetes object. */
export function kubeRow(r: LabResource, icon: IconRef, onopen: Open): LabRow {
  return {
    name: r.id,
    r,
    status: rowStatus(resStatus(r)),
    icon,
    title: r.name,
    sub: [],
    cols: { ...liveCols(r), ns: r.ns ?? '', age: r.age },
    ...openers(r, onopen),
    buttons: kubeActs(r, onopen)
      .filter(a => a.row)
      .map(a => ({ title: a.label, icon: a.icon, run: a.run, danger: a.danger, enabled: !a.disabled })),
    menu: () => kubeMenu(r, onopen),
  };
}

/** Row of any resource, whichever list it comes from. */
export function resourceRow(r: LabResource, onopen: Open): LabRow {
  const c = conn(r.connId);
  const s = section(c, r.sectionId);
  const icon = s?.ext?.icon ?? s?.icon ?? '';
  return c?.group === 'Kubernetes' && KUBE_KINDS.includes(r.sectionId) ? kubeRow(r, icon, onopen) : engineRow(r, icon, onopen);
}
