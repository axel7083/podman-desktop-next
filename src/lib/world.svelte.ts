/**
 * Simulated world: one `$state` model holding every resource the mock
 * extensions seed and the shell mutates through actions. Persisted to
 * localStorage per scenario key.
 */
import { browser } from '$app/env';

import type { ConnectionDef, ConnectionStatus } from '#lib/ext/types.ts';
import { ui } from '#lib/ui.svelte.ts';

/* ------------------------------------------------------------------ */
/* Resource types                                                      */
/* ------------------------------------------------------------------ */

export type ContainerState =
  | 'RUNNING'
  | 'EXITED'
  | 'CREATED'
  | 'PAUSED'
  | 'STARTING'
  | 'STOPPING'
  | 'RESTARTING'
  | 'DELETING';

export interface Port {
  host: number;
  container: number;
  protocol?: 'tcp' | 'udp';
}

export interface Container {
  id: string;
  name: string;
  /** Full image reference. */
  image: string;
  /** Owning connection id. */
  engineId: string;
  state: ContainerState;
  /** Epoch ms. */
  created: number;
  startedAt?: number;
  ports: Port[];
  labels: Record<string, string>;
  command?: string;
  env?: string[];
  podId?: string;
  /** Canned log lines (streamed by the Logs tab). */
  logs?: string[];
  /** Selection flag used by ui-svelte Table. */
  selected?: boolean;
}

export interface Pod {
  id: string;
  name: string;
  engineId: string;
  status: 'RUNNING' | 'EXITED' | 'DEGRADED' | 'CREATED';
  created: number;
  containerIds: string[];
  labels?: Record<string, string>;
  selected?: boolean;
}

export interface ContainerImage {
  id: string;
  /** Repository, e.g. `quay.io/podman/hello`. */
  name: string;
  tag: string;
  engineId: string;
  /** Bytes. */
  size: number;
  created: number;
  digest?: string;
  labels?: Record<string, string>;
  os?: string;
  arch?: string;
  /** Base OS release, used by checkers (e.g. "ubi9", "debian-12"). */
  base?: string;
  packages?: { name: string; version: string }[];
  layers?: { id: string; command: string; size: number }[];
  selected?: boolean;
}

export interface Volume {
  name: string;
  engineId: string;
  size: number;
  created: number;
  mountpoint: string;
  driver?: string;
  selected?: boolean;
}

export interface Network {
  id: string;
  name: string;
  engineId: string;
  driver: string;
  subnet?: string;
  created: number;
  selected?: boolean;
}

export interface Secret {
  id: string;
  name: string;
  engineId: string;
  created: number;
  driver?: string;
  selected?: boolean;
}

/** Generic Kubernetes object, stored per cluster (P4 list/watch any kind). */
export interface KubeObject {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    uid: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
  /** Selection flag used by ui-svelte Table. */
  selected?: boolean;
  /** Table key helper. */
  name?: string;
}

export interface TaskStep {
  label: string;
  /** Duration at 1× speed, in ms. */
  ms: number;
  /** Log lines appended when the step starts. */
  log?: string[];
}

export type TaskStatus = 'in-progress' | 'success' | 'failure' | 'canceled';

export interface Task {
  id: string;
  name: string;
  /** Contributing extension id, if any. */
  ext?: string;
  status: TaskStatus;
  /** 0–100 */
  progress: number;
  step?: string;
  started: number;
  ended?: number;
  logs: string[];
  error?: string;
  /** Link shown when done ("Open machine"). */
  action?: { label: string; href: string };
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  type: 'info' | 'success' | 'error' | 'warning';
  taskId?: string;
  action?: { label: string; href: string };
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'error' | 'warning';
  created: number;
  read: boolean;
}

export interface DynamicConnection extends ConnectionDef {
  ownerExt: string;
}

export interface WorldData {
  version: number;
  /** Extensions already seeded into this world. */
  seeded: string[];
  connStatus: Record<string, ConnectionStatus>;
  dynamicConnections: DynamicConnection[];
  deletedConnections: string[];
  containers: Container[];
  pods: Pod[];
  images: ContainerImage[];
  volumes: Volume[];
  networks: Network[];
  secrets: Secret[];
  /** Kubernetes objects keyed by connection id. */
  kube: Record<string, KubeObject[]>;
  /** Free-form extension data keyed by extension id (CRs, models, quadlets…). */
  ext: Record<string, Record<string, unknown>>;
  tasks: Task[];
  notifications: Notification[];
  /** providerId → signed in */
  accounts: Record<string, boolean>;
  /** `<conn>:<addon>` → state */
  addons: Record<string, 'installed' | 'installing'>;
  settings: Record<string, string | number | boolean>;
  currentKubeContext?: string;
}

export type World = WorldData;

const WORLD_VERSION = 1;

function emptyWorld(): WorldData {
  return {
    version: WORLD_VERSION,
    seeded: [],
    connStatus: {},
    dynamicConnections: [],
    deletedConnections: [],
    containers: [],
    pods: [],
    images: [],
    volumes: [],
    networks: [],
    secrets: [],
    kube: {},
    ext: {},
    tasks: [],
    notifications: [],
    accounts: {},
    addons: {},
    settings: {},
  };
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export const world: WorldData = $state(emptyWorld());

/** Toasts are transient (not persisted). */
export const toasts: Toast[] = $state([]);

let storageKey = '';

function storageKeyFor(scenarioKey: string): string {
  return `pdn.world.${scenarioKey}`;
}

/** Load the world of a scenario key (or start empty). */
export function loadWorld(scenarioKey: string): void {
  storageKey = storageKeyFor(scenarioKey);
  let data: WorldData | undefined;
  if (browser) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) data = JSON.parse(raw) as WorldData;
    } catch {
      data = undefined;
    }
  }
  if (data?.version !== WORLD_VERSION) data = emptyWorld();
  // interrupted tasks cannot resume after a reload
  for (const task of data.tasks) {
    if (task.status === 'in-progress') {
      task.status = 'canceled';
      task.error = 'Interrupted by reload';
    }
  }
  Object.assign(world, data);
}

export function clearWorld(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  Object.assign(world, emptyWorld());
  toasts.length = 0;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Persist the world (debounced). Called from a root effect in the layout. */
export function scheduleSave(): void {
  if (!browser || !storageKey) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(storageKey, JSON.stringify($state.snapshot(world)));
  }, 300);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let idCounter = 0;
/** Random-looking hex id, like engine ids. */
export function hexId(length = 64): string {
  let out = '';
  while (out.length < length) {
    out += Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0');
  }
  return out.slice(0, length);
}

export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** `Date.now()` minus a duration. */
export function ago({ d = 0, h = 0, m = 0, s = 0 }: { d?: number; h?: number; m?: number; s?: number }): number {
  return Date.now() - (((d * 24 + h) * 60 + m) * 60 + s) * 1000;
}

export function isoAgo(spec: { d?: number; h?: number; m?: number }): string {
  return new Date(ago(spec)).toISOString();
}

export const MB = 1024 * 1024;

export function humanSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['kB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1000;
    unit += 1;
  } while (value >= 1000 && unit < units.length - 1);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function humanAge(epochMs: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - epochMs) / 1000));
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} day${days > 1 ? 's' : ''}`;
  const months = Math.round(days / 30);
  return `${months} month${months > 1 ? 's' : ''}`;
}

export function shortImage(image: string): string {
  return image.replace(/^docker\.io\/(library\/)?/, '');
}

/** Lookup helpers. */
export function findContainer(id: string): Container | undefined {
  return world.containers.find(c => c.id === id || c.name === id);
}

export function kubeObjects(connId: string): KubeObject[] {
  return world.kube[connId] ?? [];
}

/** Add Kubernetes objects to a cluster. */
export function addKube(connId: string, objects: KubeObject[]): void {
  world.kube[connId] = [...(world.kube[connId] ?? []), ...objects];
}

/** Build a minimal KubeObject. */
export function kube(
  apiVersion: string,
  kind: string,
  name: string,
  namespace: string | undefined,
  spec: Record<string, unknown> = {},
  status: Record<string, unknown> = {},
  age: { d?: number; h?: number; m?: number } = { d: 2 },
  labels?: Record<string, string>,
): KubeObject {
  return {
    apiVersion,
    kind,
    name,
    metadata: { name, namespace, uid: crypto.randomUUID(), creationTimestamp: isoAgo(age), labels },
    spec,
    status,
  };
}

/** Free-form per-extension store. */
export function extData<T>(extId: string, key: string, fallback: T): T {
  world.ext[extId] ??= {};
  const store = world.ext[extId];
  if (!(key in store)) store[key] = fallback;
  return store[key] as T;
}

/* ------------------------------------------------------------------ */
/* Timers, toasts, notifications                                       */
/* ------------------------------------------------------------------ */

const timers = new Set<ReturnType<typeof setTimeout>>();

/** setTimeout scaled by the speed control. */
export function later(ms: number, fn: () => void): void {
  const timer = setTimeout(() => {
    timers.delete(timer);
    fn();
  }, ui.ms(ms));
  timers.add(timer);
}

export function toast(t: Omit<Toast, 'id'>, ttlMs = 5000): void {
  const id = uid('toast');
  toasts.push({ id, ...t });
  setTimeout(() => dismissToast(id), ttlMs);
}

export function dismissToast(id: string): void {
  const index = toasts.findIndex(t => t.id === id);
  if (index >= 0) toasts.splice(index, 1);
}

export function notify(n: Omit<Notification, 'id' | 'created' | 'read'>): void {
  world.notifications.unshift({ id: uid('notif'), created: Date.now(), read: false, ...n });
}

/* ------------------------------------------------------------------ */
/* Tasks (P15)                                                         */
/* ------------------------------------------------------------------ */

export interface RunTaskOptions {
  name: string;
  ext?: string;
  steps: TaskStep[];
  onDone?: (task: Task) => void;
  /** Link shown on the success toast / task row. */
  action?: { label: string; href: string };
  /** Fail at the given step index (for error-state demos). */
  failAt?: number;
  failMessage?: string;
}

/** Run a simulated long task with progress, logs and a completion toast. */
export function runTask(options: RunTaskOptions): string {
  const id = uid('task');
  world.tasks.unshift({
    id,
    name: options.name,
    ext: options.ext,
    status: 'in-progress',
    progress: 0,
    started: Date.now(),
    logs: [],
  });
  const total = options.steps.reduce((sum, s) => sum + s.ms, 0) || 1;
  let elapsedBefore = 0;

  const getTask = (): Task | undefined => world.tasks.find(t => t.id === id);

  const runStep = (index: number): void => {
    const task = getTask();
    if (!task || task.status !== 'in-progress') return;
    if (index >= options.steps.length) {
      task.status = 'success';
      task.progress = 100;
      task.step = undefined;
      task.ended = Date.now();
      task.action = options.action;
      toast({ type: 'success', title: `${options.name} completed`, taskId: id, action: options.action });
      options.onDone?.(task);
      scheduleSave();
      return;
    }
    const step = options.steps[index];
    task.step = step.label;
    task.logs.push(`▸ ${step.label}`, ...(step.log ?? []));
    if (options.failAt === index) {
      later(step.ms / 2, () => {
        const t = getTask();
        if (!t || t.status !== 'in-progress') return;
        t.status = 'failure';
        t.error = options.failMessage ?? 'Task failed';
        t.ended = Date.now();
        toast({ type: 'error', title: `${options.name} failed`, body: t.error, taskId: id });
      });
      return;
    }
    // progress ticks within the step
    const ticks = Math.max(1, Math.round(step.ms / 250));
    for (let i = 1; i <= ticks; i++) {
      later((step.ms / ticks) * i, () => {
        const t = getTask();
        if (!t || t.status !== 'in-progress') return;
        t.progress = Math.min(99, Math.round(((elapsedBefore + (step.ms / ticks) * i) / total) * 100));
        if (i === ticks) {
          elapsedBefore += step.ms;
          runStep(index + 1);
        }
      });
    }
  };
  toast({ type: 'info', title: `${options.name} started`, taskId: id }, 2500);
  runStep(0);
  return id;
}

export function cancelTask(id: string): void {
  const task = world.tasks.find(t => t.id === id);
  if (task?.status === 'in-progress') {
    task.status = 'canceled';
    task.ended = Date.now();
    toast({ type: 'warning', title: `${task.name} canceled` });
  }
}

export function clearCompletedTasks(): void {
  world.tasks = world.tasks.filter(t => t.status === 'in-progress');
}

/* ------------------------------------------------------------------ */
/* Container lifecycle                                                 */
/* ------------------------------------------------------------------ */

export function startContainer(id: string): void {
  const c = findContainer(id);
  if (!c || c.state === 'RUNNING') return;
  c.state = 'STARTING';
  later(900, () => {
    c.state = 'RUNNING';
    c.startedAt = Date.now();
    syncPodStatus(c.podId);
  });
}

export function stopContainer(id: string): void {
  const c = findContainer(id);
  if (!c || c.state !== 'RUNNING') return;
  c.state = 'STOPPING';
  later(1100, () => {
    c.state = 'EXITED';
    c.startedAt = undefined;
    syncPodStatus(c.podId);
  });
}

export function restartContainer(id: string): void {
  const c = findContainer(id);
  if (!c) return;
  c.state = 'RESTARTING';
  later(1500, () => {
    c.state = 'RUNNING';
    c.startedAt = Date.now();
    syncPodStatus(c.podId);
  });
}

export function deleteContainer(id: string): void {
  const c = findContainer(id);
  if (!c) return;
  c.state = 'DELETING';
  later(700, () => {
    world.containers = world.containers.filter(x => x.id !== c.id);
    if (c.podId) {
      const pod = world.pods.find(p => p.id === c.podId);
      if (pod) pod.containerIds = pod.containerIds.filter(cid => cid !== c.id);
    }
    toast({ type: 'success', title: `Container ${c.name} deleted` });
  });
}

function syncPodStatus(podId: string | undefined): void {
  if (!podId) return;
  const pod = world.pods.find(p => p.id === podId);
  if (!pod) return;
  const states = world.containers.filter(c => pod.containerIds.includes(c.id)).map(c => c.state);
  if (states.every(s => s === 'RUNNING')) pod.status = 'RUNNING';
  else if (states.some(s => s === 'RUNNING')) pod.status = 'DEGRADED';
  else pod.status = 'EXITED';
}

export function startPod(id: string): void {
  const pod = world.pods.find(p => p.id === id);
  pod?.containerIds.forEach(startContainer);
}

export function stopPod(id: string): void {
  const pod = world.pods.find(p => p.id === id);
  pod?.containerIds.forEach(stopContainer);
}

export function deletePod(id: string): void {
  const pod = world.pods.find(p => p.id === id);
  if (!pod) return;
  world.containers = world.containers.filter(c => !pod.containerIds.includes(c.id));
  world.pods = world.pods.filter(p => p.id !== id);
  toast({ type: 'success', title: `Pod ${pod.name} deleted` });
}

export function deleteImage(id: string): void {
  const image = world.images.find(i => i.id === id);
  world.images = world.images.filter(i => i.id !== id);
  if (image) toast({ type: 'success', title: `Image ${shortImage(image.name)}:${image.tag} deleted` });
}

export function deleteVolume(name: string): void {
  world.volumes = world.volumes.filter(v => v.name !== name);
  toast({ type: 'success', title: `Volume ${name.slice(0, 12)} deleted` });
}

/* ------------------------------------------------------------------ */
/* Connection lifecycle                                                */
/* ------------------------------------------------------------------ */

export function setConnectionStatus(id: string, status: ConnectionStatus): void {
  world.connStatus[id] = status;
}

/**
 * Extensions can replace the generic start of a connection they own, e.g.
 * "Connect" on an OCM cluster runs `oc login --web` as a task. Registered at
 * module load (keyed by connection id).
 */
export const startHandlers = new Map<string, (id: string, name: string) => void>();

export function startConnection(id: string, name: string): void {
  const handler = startHandlers.get(id);
  if (handler) {
    handler(id, name);
    return;
  }
  world.connStatus[id] = 'starting';
  later(2200, () => {
    world.connStatus[id] = 'started';
    toast({ type: 'success', title: `${name} started` });
  });
}

export function stopConnection(id: string, name: string): void {
  world.connStatus[id] = 'stopping';
  later(1600, () => {
    world.connStatus[id] = 'stopped';
    for (const c of world.containers) {
      if (c.engineId === id && c.state === 'RUNNING') c.state = 'EXITED';
    }
    toast({ type: 'info', title: `${name} stopped` });
  });
}

export function restartConnection(id: string, name: string): void {
  world.connStatus[id] = 'stopping';
  later(1200, () => startConnection(id, name));
}

export function deleteConnection(id: string, name: string): void {
  world.connStatus[id] = 'stopping';
  later(1200, () => {
    world.dynamicConnections = world.dynamicConnections.filter(c => c.id !== id);
    world.deletedConnections = [...world.deletedConnections, id];
    world.containers = world.containers.filter(c => c.engineId !== id);
    world.images = world.images.filter(c => c.engineId !== id);
    delete world.kube[id];
    toast({ type: 'success', title: `${name} deleted` });
  });
}

/** Restore a deleted static connection (used by Reset). */
export function addDynamicConnection(owner: string, def: ConnectionDef, status: ConnectionStatus = 'started'): void {
  world.dynamicConnections = [...world.dynamicConnections.filter(c => c.id !== def.id), { ...def, ownerExt: owner }];
  world.deletedConnections = world.deletedConnections.filter(d => d !== def.id);
  world.connStatus[def.id] = status;
}
