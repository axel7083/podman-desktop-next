/**
 * redhat.openshift-virtualization (proposed) – VirtualMachines on clusters
 * serving kubevirt.io (P2), Start/Stop/Restart/Migrate (P4), serial Console
 * tab (P14) and "Run as VM on OpenShift" on bootc images (P14, P15).
 */
import { faArrowRightArrowLeft, faDesktop, faPlay, faRotateRight, faStop } from '@fortawesome/free-solid-svg-icons';

import { confirm } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { MockExtension, ResourceContext } from '#lib/ext/types.ts';
import { addKube, type ContainerImage, type KubeObject, later, runTask, shortImage, toast } from '#lib/world.svelte.ts';

import ConsoleTab from './components/ConsoleTab.svelte';
import VmsSection from './components/VmsSection.svelte';
import { hasCrd, setVm, VIRT_ID, vm, VMS } from './data.ts';

const isVm = (ctx: ResourceContext): boolean => 'kind' in ctx.resource && (ctx.resource as KubeObject).kind === 'VirtualMachine';
const status = (ctx: ResourceContext): string => String((ctx.resource as KubeObject).status?.printableStatus ?? '');

function startVm(ctx: ResourceContext): void {
  const o = ctx.resource as KubeObject;
  setVm(ctx.conn.id, o.metadata.uid, 'Starting');
  o.spec = { ...o.spec, runStrategy: 'Always' };
  later(2500, () => setVm(ctx.conn.id, o.metadata.uid, 'Running', { nodeName: 'worker-0.ocp-dev.acme.internal', ipAddress: '10.129.0.77' }));
  toast({ type: 'info', title: `Starting VM ${o.metadata.name}`, body: `virtctl start ${o.metadata.name} -n ${o.metadata.namespace}` });
}

function stopVm(ctx: ResourceContext): void {
  const o = ctx.resource as KubeObject;
  setVm(ctx.conn.id, o.metadata.uid, 'Stopping');
  o.spec = { ...o.spec, runStrategy: 'Halted' };
  later(2000, () => setVm(ctx.conn.id, o.metadata.uid, 'Stopped', { nodeName: undefined, ipAddress: undefined }));
}

function restartVm(ctx: ResourceContext): void {
  const o = ctx.resource as KubeObject;
  setVm(ctx.conn.id, o.metadata.uid, 'Stopping');
  later(1200, () => setVm(ctx.conn.id, o.metadata.uid, 'Starting'));
  later(3000, () => setVm(ctx.conn.id, o.metadata.uid, 'Running'));
}

function migrateVm(ctx: ResourceContext): void {
  const o = ctx.resource as KubeObject;
  if (o.metadata.name === 'rhel9-db-01') {
    toast({ type: 'error', title: `${o.metadata.name} cannot be live migrated`, body: 'LiveMigratable=False: PVC rhel9-db-01-rootdisk uses ReadWriteOnce access mode.' });
    return;
  }
  setVm(ctx.conn.id, o.metadata.uid, 'Migrating');
  later(3000, () => setVm(ctx.conn.id, o.metadata.uid, 'Running', { nodeName: 'worker-0.ocp-dev.acme.internal' }));
}

/** bootc image → qcow2 → containerDisk → VirtualMachine on the first cluster with OpenShift Virtualization. */
function runAsVm(ctx: ResourceContext): void {
  const image = ctx.resource as ContainerImage;
  const cluster = registry.activeConnections.find(c => c.status === 'started' && hasCrd(c.id, 'virtualmachines.kubevirt.io'));
  if (!cluster) {
    toast({ type: 'warning', title: 'No cluster with OpenShift Virtualization', body: 'Connect to ocp-dev first (oc login --web).', action: { label: 'Open ocp-dev', href: '/c/ocp-dev' } });
    return;
  }
  const ref = `${shortImage(image.name)}:${image.tag}`;
  const disk = `${shortImage(image.name)}-disk:${image.tag}`;
  const name = `${shortImage(image.name).split('/').pop()}-test`;
  confirm({
    title: 'Run as VM on OpenShift?',
    message: `Build a qcow2 disk from ${ref}, push it as containerDisk ${disk} and create VirtualMachine ${name} (u1.medium) in namespace payments on ${cluster.name}.`,
    buttonLabel: 'Run as VM',
    variant: 'primary',
  })
    .then(ok => {
      if (!ok) return;
      runTask({
        name: `Run ${ref} as VM on ${cluster.name}`,
        ext: VIRT_ID,
        steps: [
          { label: 'Building qcow2 with bootc-image-builder', ms: 2600, log: [`$ podman run --rm --privileged registry.redhat.io/rhel9/bootc-image-builder:latest --type qcow2 ${ref}`, 'Wrote disk.qcow2 (10 GiB, 1.4 GiB used)'] },
          { label: 'Wrapping as containerDisk', ms: 900, log: ['FROM scratch', 'ADD --chown=107:107 disk.qcow2 /disk/'] },
          { label: `Pushing ${disk}`, ms: 1600 },
          { label: `Creating VirtualMachine ${name}`, ms: 700, log: [`virtualmachine.kubevirt.io/${name} created`] },
        ],
        action: { label: `Open ${name}`, href: `/c/${cluster.id}/kube/VirtualMachine~payments~${name}/console` },
        onDone: () => {
          const obj = vm({ name, namespace: 'payments', printableStatus: 'Provisioning', runStrategy: 'Always', instancetype: 'u1.medium', preference: 'rhel.9', containerDisk: disk, created: new Date().toISOString() });
          addKube(cluster.id, [obj]);
          later(1500, () => setVm(cluster.id, obj.metadata.uid, 'Starting'));
          later(4000, () => setVm(cluster.id, obj.metadata.uid, 'Running', { nodeName: 'worker-0.ocp-dev.acme.internal', ipAddress: '10.129.0.93', guestOS: 'Red Hat Enterprise Linux 9.6 (Plow)' }));
        },
      });
    })
    .catch(console.error);
}

const extension: MockExtension = {
  id: VIRT_ID,
  displayName: 'OpenShift Virtualization',
  publisher: 'redhat',
  description: 'List and control VMs on your OpenShift clusters; run a bootc image as a VM on the cluster.',
  version: '0.1.0',
  icon: 'icons/redhat.openshift-virtualization.png',
  tags: ['openshift'],
  pApis: ['P2', 'P4', 'P14', 'P15'],
  contributes: {
    navSections: [
      {
        id: 'vms',
        label: 'Virtual machines',
        icon: 'icons/redhat.openshift-virtualization.png',
        when: conn => conn.status === 'started' && hasCrd(conn.id, 'virtualmachines.kubevirt.io'),
        component: VmsSection,
        counter: (w, conn) => (w.kube[conn.id] ?? []).filter(o => o.kind === 'VirtualMachine').length,
        order: 20,
      },
    ],
    tabs: [{ id: 'console', label: 'Console', target: 'kube-resource', when: isVm, component: ConsoleTab }],
    menus: [
      { id: 'vm-start', label: 'Start VM', icon: faPlay, target: 'kube-resource', placement: 'row', when: ctx => isVm(ctx) && status(ctx) === 'Stopped', run: startVm },
      { id: 'vm-stop', label: 'Stop VM', icon: faStop, target: 'kube-resource', placement: 'row', when: ctx => isVm(ctx) && ['Running', 'ErrImagePull', 'Migrating'].includes(status(ctx)), run: stopVm },
      { id: 'vm-restart', label: 'Restart VM', icon: faRotateRight, target: 'kube-resource', placement: 'kebab', when: ctx => isVm(ctx) && status(ctx) === 'Running', run: restartVm },
      { id: 'vm-migrate', label: 'Migrate', icon: faArrowRightArrowLeft, target: 'kube-resource', placement: 'kebab', when: ctx => isVm(ctx) && status(ctx) === 'Running', run: migrateVm },
      {
        id: 'bootc-run-as-vm',
        label: 'Run as VM on OpenShift',
        icon: faDesktop,
        target: 'image',
        placement: 'kebab',
        when: ctx => (ctx.resource as ContainerImage).labels?.['containers.bootc'] === '1',
        run: runAsVm,
      },
    ],
  },
  seed(): void {
    addKube('ocp-dev', VMS.map(vm));
  },
};

export default extension;
