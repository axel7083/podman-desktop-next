/** KubeVirt `VirtualMachine` (kubevirt.io/v1) objects with VMI status folded in. */
import { kube, type KubeObject, world } from '#lib/world.svelte.ts';

export const VIRT_ID = 'redhat.openshift-virtualization';

export const PRINTABLE_STATE: Record<string, string> = {
  Running: 'RUNNING',
  Starting: 'STARTING',
  Provisioning: 'STARTING',
  Migrating: 'UPDATING',
  Stopping: 'STARTING',
  Stopped: 'EXITED',
  ErrImagePull: 'DEGRADED',
  CrashLoopBackOff: 'DEGRADED',
  ErrorUnschedulable: 'DEGRADED',
};

export interface VmSeed {
  name: string;
  namespace: string;
  printableStatus: string;
  runStrategy: string;
  instancetype?: string;
  preference?: string;
  node?: string;
  ip?: string;
  guestOS?: string;
  containerDisk?: string;
  created: string;
}

export function vm(s: VmSeed): KubeObject {
  const o = kube(
    'kubevirt.io/v1',
    'VirtualMachine',
    s.name,
    s.namespace,
    {
      runStrategy: s.runStrategy,
      instancetype: s.instancetype ? { name: s.instancetype } : undefined,
      preference: s.preference ? { name: s.preference } : undefined,
      template: { spec: { volumes: [s.containerDisk ? { name: 'rootdisk', containerDisk: { image: s.containerDisk } } : { name: 'rootdisk', dataVolume: { name: `${s.name}-rootdisk` } }] } },
    },
    { state: PRINTABLE_STATE[s.printableStatus] ?? 'UNKNOWN', printableStatus: s.printableStatus, ready: s.printableStatus === 'Running', nodeName: s.node, ipAddress: s.ip, guestOS: s.guestOS },
  );
  o.metadata.creationTimestamp = s.created;
  return o;
}

export const VMS: VmSeed[] = [
  { name: 'rhel9-db-01', namespace: 'payments', printableStatus: 'Running', runStrategy: 'Always', instancetype: 'u1.large', preference: 'rhel.9', node: 'worker-1.ocp-dev.acme.internal', ip: '10.131.0.48', guestOS: 'Red Hat Enterprise Linux 9.6 (Plow)', created: '2026-07-14T11:03:22Z' },
  { name: 'win2022-build', namespace: 'ci', printableStatus: 'Stopped', runStrategy: 'Halted', instancetype: 'u1.xlarge', preference: 'windows.2k22', created: '2026-03-02T08:00:00Z' },
  { name: 'fedora-sandbox', namespace: 'jdoe', printableStatus: 'ErrImagePull', runStrategy: 'Always', containerDisk: 'quay.io/containerdisks/fedora:44', created: '2026-10-07T16:45:10Z' },
  { name: 'rhel10-app-02', namespace: 'payments', printableStatus: 'Migrating', runStrategy: 'Always', instancetype: 'u1.large', preference: 'rhel.10', node: 'worker-2.ocp-dev.acme.internal', ip: '10.128.2.17', guestOS: 'Red Hat Enterprise Linux 10.0 (Coughlan)', created: '2026-08-21T13:30:00Z' },
];

export function hasCrd(connId: string, name: string): boolean {
  return (world.kube[connId] ?? []).some(o => o.kind === 'CustomResourceDefinition' && o.metadata.name === name);
}

/** Update a VM in place (status + strategy). */
export function setVm(connId: string, uid: string, printableStatus: string, extra: Record<string, unknown> = {}): void {
  const o = world.kube[connId]?.find(x => x.metadata.uid === uid);
  if (!o) return;
  o.status = { ...o.status, printableStatus, state: PRINTABLE_STATE[printableStatus] ?? 'UNKNOWN', ready: printableStatus === 'Running', ...extra };
}
