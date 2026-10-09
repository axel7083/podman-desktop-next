/**
 * P13 live state: fake status changes (start / stop toggle the dot in the tree
 * and the tab), deleted resources, the context menu and resource actions
 * (terminal / logs sessions in the bottom panel).
 */
import {
  faAlignLeft,
  faCode,
  faMagnifyingGlassChart,
  faPlay,
  faRotateRight,
  faStop,
  faTerminal,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

import { type ConnStatus, type LabConnection, type LabResource, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { ext, isInstalled } from './exts.ts';

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

export function openTerminal(r: LabResource): void {
  lab.addSession({ id: `term-${++seq}`, kind: 'terminal', title: r.name, connId: r.connId, lines: terminalLines(r) });
}

export function openConnTerminal(c: LabConnection): void {
  const lines = c.group === 'Kubernetes' ? [`$ kubectl config use-context ${c.id}`, `Switched to context "${c.id}".`, '$ '] : [`$ podman machine ssh ${c.id}`, `[core@${c.id} ~]$ `];
  lab.addSession({ id: `term-${++seq}`, kind: 'terminal', title: c.name, connId: c.id, lines });
}

export function showLogs(r: LabResource): void {
  lab.addSession({ id: `logs-${++seq}`, kind: 'logs', title: `${r.name} logs`, connId: r.connId, lines: Array.from({ length: 6 }, (_, i) => logLine(r.name, i)), stream: true });
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
  if (sectionId === 'images' && isInstalled('layers-explorer') && lab.install === 'all') out.push({ id: 'layers', label: 'Layers', extId: 'layers-explorer' });
  if ((sectionId === 'images' || sectionId === 'containers') && isInstalled('grype') && lab.install === 'all') out.push({ id: 'vulns', label: 'Vulnerabilities', extId: 'grype' });
  return out;
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
  if (can.terminal(r.sectionId)) items.push({ label: 'Open terminal', icon: faTerminal, disabled: !up, run: () => openTerminal(r), sep: items.length > 0 });
  if (can.logs(r.sectionId)) items.push({ label: 'Show logs', icon: faAlignLeft, run: () => showLogs(r), sep: !can.terminal(r.sectionId) && items.length > 0 });
  items.push({ label: 'Inspect', icon: faCode, run: () => inspectRes(r, onopen), sep: !can.terminal(r.sectionId) && !can.logs(r.sectionId) && items.length > 0 });
  const extra: MenuItem[] = [];
  if ((r.sectionId === 'images' || r.sectionId === 'containers') && isInstalled('grype') && lab.install === 'all')
    extra.push({ label: 'Scan with Grype', icon: ext('grype')?.icon, run: () => onopen({ kind: 'tool', toolId: 'grype' }, {}) });
  if (r.sectionId === 'images' && isInstalled('bootc')) extra.push({ label: 'Build disk image', icon: ext('bootc')?.icon, run: () => onopen({ kind: 'tool', toolId: 'bootc' }, {}) });
  if (r.sectionId === 'containers' && isInstalled('quadlet')) extra.push({ label: 'Generate Quadlet', icon: ext('quadlet')?.icon, run: () => lab.openCreate(`Quadlet for ${r.name}`) });
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
