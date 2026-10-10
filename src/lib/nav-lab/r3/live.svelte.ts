/**
 * P13 live state: fake status changes (start / stop toggle the dot in the tree
 * and the tab), deleted resources, the context menu and resource actions
 * (terminal / logs sessions in the bottom panel).
 */
import {
  faAlignLeft,
  faArrowUp,
  faClockRotateLeft,
  faCode,
  faDownload,
  faKeyboard,
  faPenToSquare,
  faMagnifyingGlassChart,
  faPlay,
  faRotateRight,
  faStop,
  faTerminal,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn, type ConnStatus, type LabConnection, type LabResource, type LabTarget, section as findSection } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { ext, installExt, isInstalled } from './exts.ts';
import { grypeGate } from './chain.ts';
import { komposeTarget } from './kompose.svelte.ts';
import { addChain, flows, openModal } from './flows.svelte.ts';
import { altFor, HB_CONN, hbNodeId } from './hb-data.ts';

export interface MenuItem {
  label: string;
  icon?: IconRef;
  run?: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Separator before this item. */
  sep?: boolean;
}

class Live {
  /** Status overrides (`resId` or `conn:<id>`). */
  status = $state<Record<string, string>>({});
  deleted = $state<string[]>([]);
  /** Resources added at runtime (pulled / rebuilt images), already pushed to RESOURCES. */
  added = $state<string[]>([]);
  menu = $state<{ x: number; y: number; items: MenuItem[] } | undefined>(undefined);
  /** Requested view for a resource tab (Inspect from a menu, Logs…). */
  view = $state<Record<string, string>>({});
  /** Set by P13: close the tabs of a deleted resource. */
  ondelete: ((resId: string) => void) | undefined;
}

export const live = new Live();

export function resStatus(r: LabResource): string {
  return live.status[r.id] ?? r.status;
}

export function connStatus(c: LabConnection | undefined): ConnStatus {
  return (live.status[`conn:${c?.id}`] as ConnStatus | undefined) ?? c?.status ?? 'stopped';
}

export function isUp(status: string): boolean {
  return ['running', 'degraded', 'starting', 'paused', 'ready'].includes(status);
}

export function openMenu(e: MouseEvent, items: MenuItem[]): void {
  e.preventDefault();
  e.stopPropagation();
  live.menu = { x: Math.min(e.clientX, window.innerWidth - 230), y: Math.min(e.clientY, window.innerHeight - items.length * 28 - 16), items };
}

/* ------------------------------------------------------------------ */
/* Capabilities                                                        */
/* ------------------------------------------------------------------ */

const STARTABLE = ['containers', 'pods', 'vms', 'overview', 'workbenches', 'inference'];
const TERMINAL = ['containers', 'pods', 'kpods', 'vms', 'overview', 'workbenches'];
const LOGS = ['containers', 'pods', 'kpods', 'deployments', 'services', 'jobs', 'cronjobs', 'aapjobs', 'pipelines', 'dspipelines', 'inference'];

export const can = {
  start: (sectionId: string): boolean => STARTABLE.includes(sectionId),
  terminal: (sectionId: string): boolean => TERMINAL.includes(sectionId),
  logs: (sectionId: string): boolean => LOGS.includes(sectionId),
};

/* ------------------------------------------------------------------ */
/* Fake data                                                           */
/* ------------------------------------------------------------------ */

const LOG_LINES = [
  'INFO  [http] GET /health 200 (2 ms)',
  'INFO  [orders] POST /orders 201 (14 ms)',
  'DEBUG [db] pool size=10 active=3 idle=7',
  'INFO  [http] GET /orders?page=2 200 (9 ms)',
  'WARN  [kafka] Producer retrying, broker not available',
  'INFO  [kafka] Producer connected',
  'INFO  [cache] hit ratio 0.93',
  'ERROR [payments] timeout after 5000 ms, retrying',
  'INFO  [payments] retry ok (220 ms)',
];

export function logLine(name: string, i: number): string {
  const s = 10 + (i % 50);
  return `2026-10-09 09:${String(12 + Math.floor(i / 50)).padStart(2, '0')}:${String(s).padStart(2, '0')} ${LOG_LINES[(i + name.length) % LOG_LINES.length].replace('orders', name.split(/[-.]/)[0])}`;
}

function terminalLines(r: LabResource): string[] {
  if (r.sectionId === 'kpods') return [`$ kubectl exec -it ${r.name} -- sh`, '~ $ '];
  if (r.sectionId === 'vms' || r.sectionId === 'overview') return [`$ ssh dev@${r.name}`, `[dev@${r.name} ~]$ `];
  return [`$ podman exec -it ${r.name} sh`, 'sh-5.2$ '];
}

let seq = 0;

/** Source of a panel session: the resource tab target and its kind icon. */
export function sourceOf(r: LabResource): { target: LabTarget; icon: IconRef | undefined } {
  const sec = findSection(findConn(r.connId), r.sectionId);
  return { target: { kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, icon: sec?.ext?.icon ?? sec?.icon };
}

export function openTerminal(r: LabResource): void {
  lab.addSession({ id: `term-${++seq}`, kind: 'terminal', title: r.name, label: 'terminal', connId: r.connId, lines: terminalLines(r), ...sourceOf(r) });
}

/** Containers created with `-t` get an extra "Attach TTY" action. */
export function hasTty(r: LabResource): boolean {
  let h = 7;
  for (const ch of r.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return r.sectionId === 'containers' && h % 3 === 0;
}

export function openTty(r: LabResource): void {
  lab.addSession({ id: `tty-${++seq}`, kind: 'terminal', title: `${r.name} (tty)`, label: 'tty', connId: r.connId, lines: [`$ podman attach ${r.name}`, '/ # '], ...sourceOf(r) });
}

/** Quadlet unit logs (journalctl) in the bottom panel. */
export function showJournal(unit: string, service: string, connId: string, src?: { target: LabTarget; icon?: IconRef }): void {
  const lines = [
    `-- journalctl --user -u ${service} -f --`,
    `Oct 09 09:12:00 fedora systemd[1012]: Starting ${service} - ${unit}...`,
    `Oct 09 09:12:01 fedora podman[4410]: ${unit.split('.')[0]} 2026-10-09 09:12:01 INFO started`,
    `Oct 09 09:12:01 fedora systemd[1012]: Started ${service} - ${unit}.`,
  ];
  lab.addSession({ id: `journal-${connId}-${unit}`, kind: 'logs', title: service, label: 'journalctl', connId, lines, stream: true, ...src });
}

export function openConnTerminal(c: LabConnection): void {
  const lines = c.group === 'Kubernetes' ? [`$ kubectl config use-context ${c.id}`, `Switched to context "${c.id}".`, '$ '] : [`$ podman machine ssh ${c.id}`, `[core@${c.id} ~]$ `];
  lab.addSession({ id: `term-${++seq}`, kind: 'terminal', title: c.name, label: 'terminal', connId: c.id, lines, target: { kind: 'connection', connId: c.id }, icon: c.icon });
}

export function showLogs(r: LabResource): void {
  const cmd = ['kpods', 'deployments', 'services', 'jobs', 'cronjobs'].includes(r.sectionId) ? 'kubectl logs -f' : 'podman logs -f';
  lab.addSession({ id: `logs-${r.id}`, kind: 'logs', title: r.name, label: cmd, connId: r.connId, lines: Array.from({ length: 8 }, (_, i) => logLine(r.name, i)), stream: true, ...sourceOf(r) });
}

/** Aggregated logs of a compose project / pod (all its containers). */
export function showGroupLogs(name: string, connId: string, members: LabResource[], target?: LabTarget, icon?: IconRef): void {
  const lines = Array.from({ length: 10 }, (_, i) => `${members[i % Math.max(1, members.length)]?.name ?? name} | ${logLine(name, i)}`);
  lab.addSession({ id: `logs-group-${connId}-${name}`, kind: 'logs', title: name, label: 'podman compose logs -f', connId, lines, stream: true, target, icon });
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function setStatus(key: string, value: string, settle?: string): void {
  live.status[key] = value;
  if (settle) setTimeout(() => (live.status[key] = settle), 700);
}

export function startRes(r: LabResource): void {
  setStatus(r.id, 'starting', 'running');
}

export function stopRes(r: LabResource): void {
  setStatus(r.id, r.sectionId === 'containers' ? 'exited' : 'stopped');
}

export function restartRes(r: LabResource): void {
  setStatus(r.id, 'starting', 'running');
}

export function deleteRes(r: LabResource): void {
  live.deleted = [...live.deleted, r.id];
  live.ondelete?.(r.id);
}

export function toggleConn(c: LabConnection): void {
  const k = `conn:${c.id}`;
  if (isUp(connStatus(c))) setStatus(k, 'stopped');
  else setStatus(k, 'starting', 'running');
}

export function inspectRes(r: LabResource, onopen: (t: LabTarget, o: { preview?: boolean }) => void): void {
  live.view[r.id] = 'inspect';
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

/** Views contributed by extensions to a resource tab (when installed). */
export function extViews(sectionId: string): { id: string; label: string; extId: string }[] {
  const out: { id: string; label: string; extId: string }[] = [];
  return out;
}

/** Grype scan of an image (or a container's image) in its own tab. */
export function scanRes(r: LabResource, onopen: (t: LabTarget, o: { preview?: boolean }) => void): void {
  const target: LabTarget = { kind: 'scan', connId: r.connId, resId: r.id };
  if (r.sectionId === 'images' && isInstalled('grype')) addChain(r.name, { step: 'scanned', title: 'Scanned', detail: `Grype · ${grypeGate(r.name)[1]}`, at: 'just now', target });
  onopen(target, {});
}

/** Layers explorer of an image in its own "Layers · <image>" tab (promotion when not installed). */
export function exploreLayers(r: LabResource, onopen: (t: LabTarget, o: { preview?: boolean }) => void): void {
  onopen({ kind: 'layers', connId: r.connId, resId: r.id }, {});
}

function showView(r: LabResource, view: string, onopen: (t: LabTarget, o: { preview?: boolean }) => void): void {
  live.view[r.id] = view;
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

/** Image ⋮ menu (today's PD ImageActions + contributed items). */
export function imageMenu(r: LabResource, onopen: (t: LabTarget, o: { preview?: boolean }) => void): MenuItem[] {
  const items: MenuItem[] = [
    { label: 'Push Image', icon: faArrowUp, run: () => lab.openCreate(`Push ${r.name}`) },
    { label: 'Edit Image', icon: faPenToSquare, run: () => lab.openCreate(`Edit ${r.name}`) },
    { label: 'Show History', icon: faClockRotateLeft, run: () => showView(r, 'history', onopen) },
    { label: 'Save Image', icon: faDownload, run: () => lab.openCreate(`Save ${r.name}`) },
    { label: 'Push image to Kind cluster', icon: ext('kind')?.icon, run: () => lab.openCreate(`Push ${r.name} to kind-dev`) },
  ];
  items.push({ label: isInstalled('layers-explorer') ? 'Explore layers' : 'Explore layers (install Layers explorer)', icon: ext('layers-explorer')?.icon, run: () => exploreLayers(r, onopen), sep: true });
  items.push({ label: isInstalled('grype') ? 'Scan vulnerabilities' : 'Scan vulnerabilities (install Grype)', icon: ext('grype')?.icon, run: () => scanRes(r, onopen) });
  if (altFor(r.name) && r.connId === HB_CONN)
    items.push({
      label: isInstalled('hummingbird') ? 'Find hardened alternative' : 'Find hardened alternative (install Hummingbird)',
      icon: ext('hummingbird')?.icon,
      run: () => {
        installExt('hummingbird');
        onopen({ kind: 'node', connId: r.connId, nodeId: hbNodeId(r.connId, 'Alternatives', r.name) }, {});
      },
    });
  items.push({ label: 'Check image', icon: 'icons/redhat.openshift-checker.png', run: () => showView(r, 'check', onopen) });
  items.push({ label: isInstalled('quay') ? 'Push to Quay' : 'Push to Quay (install Quay)', icon: 'icons/redhat.quay.png', run: () => openModal('push-quay', { resId: r.id }), sep: true });
  items.push({ label: 'Deploy to…', icon: 'icons/redhat.openshift-local.png', run: () => openModal('deploy', { resId: r.id }) });
  const known = flows.bootc.some(b => r.name === `${b.name}:${b.tag}`);
  if ((known || r.name.includes('bootc')) && isInstalled('bootc') && findConn(r.connId)?.caps.bootc)
    items.push({
      label: 'Build disk image',
      icon: ext('bootc')?.icon,
      run: () => {
        const [name, tag] = r.name.split(/:(?=[^:/]+$)/);
        if (!known) flows.bootc = [...flows.bootc, { name, tag: tag ?? 'latest', base: r.name.includes('redhat') ? 'RHEL' : 'Fedora', version: tag ?? 'latest', size: '1.8 GB', lint: 'pass', created: r.age }];
        openModal('build-disk', { image: r.name });
      },
    });
  return items;
}

/** Full action list for a resource (context menu, ⋮). */
export function resActions(r: LabResource, onopen: (t: LabTarget, o: { preview?: boolean }) => void): MenuItem[] {
  const st = resStatus(r);
  const up = isUp(st);
  const items: MenuItem[] = [];
  if (can.start(r.sectionId)) {
    items.push({ label: 'Start', icon: faPlay, disabled: up, run: () => startRes(r) });
    items.push({ label: 'Stop', icon: faStop, disabled: !up, run: () => stopRes(r) });
    items.push({ label: 'Restart', icon: faRotateRight, disabled: !up, run: () => restartRes(r) });
  }
  if (can.logs(r.sectionId)) items.push({ label: 'See logs', icon: faAlignLeft, run: () => showLogs(r), sep: items.length > 0 });
  if (can.terminal(r.sectionId)) items.push({ label: 'Open terminal', icon: faTerminal, disabled: !up, run: () => openTerminal(r), sep: !can.logs(r.sectionId) && items.length > 0 });
  if (hasTty(r)) items.push({ label: 'Attach TTY', icon: faKeyboard, disabled: !up, run: () => openTty(r) });
  items.push({ label: 'Inspect', icon: faCode, run: () => inspectRes(r, onopen), sep: !can.terminal(r.sectionId) && !can.logs(r.sectionId) && items.length > 0 });
  const extra: MenuItem[] = [];
  if (r.sectionId === 'images') extra.push(...imageMenu(r, onopen).map(x => ({ ...x, sep: false })));
  if (r.sectionId === 'containers') extra.push({ label: isInstalled('grype') ? "Scan the container's image" : "Scan the container's image (install Grype)", icon: ext('grype')?.icon, run: () => scanRes(r, onopen) });
  if (['compose', 'pods', 'containers', 'quadlets'].includes(r.sectionId))
    extra.push({ label: isInstalled('kompose') ? 'Convert to Kubernetes' : 'Convert to Kubernetes (install Kompose)', icon: ext('kompose')?.icon, run: () => onopen(komposeTarget([r]), {}) });
  if (r.sectionId === 'containers' && isInstalled('quadlet') && findConn(r.connId)?.caps.quadlets) extra.push({ label: 'Generate Quadlet', icon: ext('quadlet')?.icon, run: () => lab.openCreate(`Quadlet for ${r.name}`) });
  if (['kpods', 'deployments', 'services'].includes(r.sectionId) && isInstalled('kube-dashboard') && lab.install === 'all')
    extra.push({ label: 'Open in Kubernetes dashboard', icon: ext('kube-dashboard')?.icon, run: () => inspectRes(r, onopen) });
  if (extra.length) items.push(...extra.map((x, i) => ({ ...x, sep: i === 0 })));
  items.push({ label: 'Delete', icon: faTrash, danger: true, run: () => deleteRes(r), sep: true });
  return items;
}

export function connActions(c: LabConnection, onopen: (t: LabTarget, o: { preview?: boolean }) => void): MenuItem[] {
  const up = isUp(connStatus(c));
  return [
    { label: up ? 'Stop' : 'Start', icon: up ? faStop : faPlay, run: () => toggleConn(c) },
    { label: 'Restart', icon: faRotateRight, disabled: !up, run: () => setStatus(`conn:${c.id}`, 'starting', 'running') },
    { label: 'Open terminal', icon: faTerminal, disabled: !up, run: () => openConnTerminal(c), sep: true },
    { label: 'Inspect', icon: faMagnifyingGlassChart, run: () => onopen({ kind: 'connection', connId: c.id }, {}) },
  ];
}
