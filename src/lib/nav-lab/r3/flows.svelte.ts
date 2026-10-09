/**
 * P13 cross-extension flows (Red Hat products working together): the modal
 * host state, scripted tasks in the bottom panel, connections / resources
 * added at runtime, the Red Hat account, image provenance (built → scanned →
 * signed → pushed → deployed), bootc disk images, the AI chain, local
 * OpenShift add-ons. Every flow ends in an existing P13 surface: the
 * connection switcher, the tree, a tab, a bottom-panel session.
 */
import type { IconRef } from '#lib/ext/types.ts';

import { CONNECTIONS, type LabConnection, type LabResource, type LabTarget, RESOURCES } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { live } from './live.svelte.ts';

export type ModalKind =
  | 'rh-signin'
  | 'add-connection'
  | 'rhel-machine'
  | 'build-disk'
  | 'boot-vm'
  | 'run-virt'
  | 'push-quay'
  | 'deploy'
  | 'serve-vllm'
  | 'modelcar'
  | 'deploy-rhoai';

export interface RhAccount {
  name: string;
  email: string;
  org: string;
  account: string;
}

export interface ChainEvent {
  step: 'built' | 'scanned' | 'signed' | 'pushed' | 'deployed';
  title: string;
  detail: string;
  at: string;
  target?: LabTarget;
  href?: string;
}

export interface DiskImage {
  name: string;
  image: string;
  type: string;
  arch: string;
  size: string;
  built: string;
  status: 'building' | 'success' | 'error';
  folder: string;
}

export interface BootcImage {
  name: string;
  tag: string;
  base: 'RHEL' | 'Fedora' | 'CentOS Stream';
  version: string;
  size: string;
  /** `bootc container lint` result. */
  lint: 'pass' | 'warn' | 'fail';
  created: string;
}

export interface ActivationKey {
  name: string;
  role: string;
  sla: string;
  usage: string;
  usedBy: string[];
}

class Flows {
  modal = $state<{ kind: ModalKind; data?: Record<string, string> } | undefined>(undefined);
  account = $state<RhAccount | undefined>(undefined);
  /** Connections registered with an activation key at runtime (connId → key). */
  registered = $state<Record<string, string>>({});
  /** Bumped when a connection is added (reactivity for `labConns()`). */
  conns = $state(0);
  /** Connection to make current (picked up by P13). */
  select = $state<string | undefined>(undefined);
  /** Bumped when an extension tree changes (AI Lab services, VMs…). */
  tree = $state(0);
  /** Provenance timeline per image name. */
  chain = $state<Record<string, ChainEvent[]>>({});
  disks = $state<DiskImage[]>([
    { name: 'orders-os-v3.qcow2', image: 'quay.io/acme/orders-os:v3', type: 'qcow2', arch: 'amd64', size: '2.1 GB', built: '2 hours ago', status: 'success', folder: '~/bootc/output/orders-os-v3' },
    { name: 'orders-os-v3.iso', image: 'quay.io/acme/orders-os:v3', type: 'anaconda-iso', arch: 'arm64', size: '1.4 GB', built: '1 day ago', status: 'success', folder: '~/bootc/output/orders-os-v3' },
    { name: 'edge-kiosk-2.1.raw', image: 'quay.io/acme/edge-kiosk:2.1', type: 'raw', arch: 'amd64', size: '10 GB', built: '6 days ago', status: 'success', folder: '~/bootc/output/edge-kiosk' },
  ]);
  /** bootc images on podman-machine-default (pulled examples are added). */
  bootc = $state<BootcImage[]>([
    { name: 'quay.io/acme/orders-os', tag: 'v3', base: 'RHEL', version: '10.2', size: '1.9 GB', lint: 'pass', created: '2 hours ago' },
    { name: 'quay.io/acme/edge-kiosk', tag: '2.1', base: 'CentOS Stream', version: '10', size: '1.7 GB', lint: 'warn', created: '6 days ago' },
    { name: 'quay.io/fedora/fedora-bootc', tag: '42', base: 'Fedora', version: '42', size: '1.6 GB', lint: 'pass', created: '3 days ago' },
    { name: 'registry.redhat.io/rhel10/rhel-bootc', tag: '10.2', base: 'RHEL', version: '10.2', size: '1.8 GB', lint: 'pass', created: '2 weeks ago' },
    { name: 'quay.io/acme/microshift-edge', tag: '4.20', base: 'RHEL', version: '9.8', size: '2.6 GB', lint: 'fail', created: '3 weeks ago' },
  ]);
  /** OpenShift Console add-on per cluster. */
  console = $state<Record<string, 'installing' | 'installed'>>({});
  /** Operators installed at runtime per cluster. */
  operators = $state<Record<string, string[]>>({});
  /** Generic per-flow states (`ai:served`, `ai:modelcar`, `rhoai:granite`…). */
  state = $state<Record<string, string>>({});
}

export const flows = new Flows();

export function openModal(kind: ModalKind, data?: Record<string, string>): void {
  flows.modal = { kind, data };
}

export function closeModal(): void {
  flows.modal = undefined;
}

let seq = 0;

/**
 * Scripted task in the bottom panel: the command, then `lines` streamed two
 * at a time; `done` runs when the last line is printed.
 */
export function runTask(o: { title: string; connId: string; cmd: string; lines: string[]; icon?: IconRef; target?: LabTarget; label?: string; done?: () => void }): void {
  lab.addSession({
    id: `task-${++seq}-${Date.now()}`,
    kind: 'logs',
    title: o.title,
    label: o.label ?? 'task output',
    connId: o.connId,
    lines: [`$ ${o.cmd}`],
    script: [...o.lines],
    stream: true,
    target: o.target,
    icon: o.icon,
    ondone: o.done,
  });
}

/** Add a connection at runtime (RHEL Podman machine, RHEL VM…), optionally make it current. */
export function addConnection(c: LabConnection, select = true): void {
  if (!CONNECTIONS.some(x => x.id === c.id)) CONNECTIONS.push(c);
  flows.conns++;
  if (select) flows.select = c.id;
}

/** Add a resource at runtime (deployment, VM, inference service, image…); visible through `live.added`. */
export function addResource(r: LabResource): void {
  const i = RESOURCES.findIndex(x => x.id === r.id);
  if (i >= 0) RESOURCES.splice(i, 1, r);
  else RESOURCES.push(r);
  live.deleted = live.deleted.filter(x => x !== r.id);
  if (!live.added.includes(r.id)) live.added = [...live.added, r.id];
}

/** Provenance timeline of an image (by name). */
export function chainOf(image: string): ChainEvent[] {
  return flows.chain[image] ?? [];
}

/** Record a provenance step (replaces the previous event of the same step, except deployments). */
export function addChain(image: string, ev: ChainEvent): void {
  const cur = flows.chain[image] ?? [];
  flows.chain[image] = ev.step === 'deployed' ? [...cur, ev] : [...cur.filter(x => x.step !== ev.step), ev];
}

export function signIn(): void {
  flows.account = { name: 'Alice Dev', email: 'alice.dev@acme-corp.com', org: '19830412', account: '6301142' };
  // The Developer Sandbox connection signs in with the same Red Hat SSO session.
  live.status['conn:sandbox'] = 'running';
}

export function signOut(): void {
  flows.account = undefined;
}

/** RHSM activation keys of the signed-in org (console.redhat.com/api/rhsm/v2/activation_keys). */
export const ACTIVATION_KEYS: ActivationKey[] = [
  { name: 'podman-desktop', role: 'Red Hat Enterprise Linux Workstation', sla: 'Self-Support', usage: 'Development/Test', usedBy: ['rhel-10', 'rhel10-dev'] },
  { name: 'ci-runners', role: 'Red Hat Enterprise Linux Server', sla: 'Standard', usage: 'Production', usedBy: [] },
  { name: 'edge-lab', role: 'Red Hat Enterprise Linux Server', sla: 'Self-Support', usage: 'Development/Test', usedBy: [] },
  { name: 'satellite-dc1', role: 'Red Hat Enterprise Linux Server', sla: 'Premium', usage: 'Production', usedBy: [] },
];

/** Subscriptions of the signed-in org. */
export const SUBSCRIPTIONS: [string, string, string, string, string][] = [
  ['Red Hat Developer Subscription for Individuals', 'RH00798', '5 of 16', '2027-03-02', 'Active'],
  ['Red Hat Enterprise Linux Server, Standard', 'RH00003', '41 of 50', '2026-10-31', 'Expiring soon'],
];

/** A fake sha256 prefix for task output. */
export function sha(s: string, n = 12): string {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ((h * 2654435761) >>> 0).toString(16).padEnd(8, '0').repeat(8).slice(0, n);
}
