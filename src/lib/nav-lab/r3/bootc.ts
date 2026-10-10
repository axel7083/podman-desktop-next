/**
 * P13 bootc end-to-end actions (Bootable containers + RHEL VMs + OpenShift
 * Virtualization): build a disk image (bootc-image-builder task → Disk
 * images), run it in a local VM (macadam; new VM connection + console session), run
 * it as a VirtualMachine on OpenShift Virtualization (minc / OpenShift Local),
 * pull an example.
 */
import { CONNECTIONS, EXT, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { installExt } from './exts.ts';
import { type BootcImage, addConnection, addResource, type DiskImage, flows, runTask, sha } from './flows.svelte.ts';
import { live } from './live.svelte.ts';
import { TREE_PROVIDERS, treeRoot } from './trees.ts';

const ICON = 'icons/redhat.bootc.png';
export const BOOTC_CONN = 'podman-machine-default';

/** Tree node id of a bootc section (Images / Disk Images / Examples / Overview). */
export function bootcNode(label: string): string {
  const p = TREE_PROVIDERS.find(x => x.id === 'bootc');
  const root = p ? treeRoot(p, BOOTC_CONN) : undefined;
  return root?.children?.find(x => x.label === label)?.id ?? root?.id ?? '';
}

export function bootcTarget(label: string): LabTarget {
  return { kind: 'node', connId: BOOTC_CONN, nodeId: bootcNode(label) };
}

export const ref = (b: BootcImage): string => `${b.name}:${b.tag}`;

/** Builder image for a base (RHEL needs registry.redhat.io → Red Hat account). */
export function builderFor(base: string): string {
  return base === 'RHEL' ? 'registry.redhat.io/rhel10/bootc-image-builder:10.2' : 'quay.io/centos-bootc/bootc-image-builder:latest';
}

export interface BuildOpts {
  image: string;
  types: string[];
  arch: string;
  filesystem: string;
  folder: string;
  user: string;
  key: string;
}

const EXT_OF: Record<string, string> = { qcow2: 'qcow2', raw: 'raw', 'anaconda-iso': 'iso', iso: 'iso', ami: 'raw', vmdk: 'vmdk', vhd: 'vhd' };
const SIZE: Record<string, string> = { qcow2: '2.1 GB', raw: '10 GB', 'anaconda-iso': '1.4 GB', ami: '10 GB', vmdk: '2.3 GB', vhd: '10 GB' };

export function buildDisk(o: BuildOpts): void {
  const b = flows.bootc.find(x => ref(x) === o.image);
  const base = o.image.split('/').pop()?.replace(':', '-') ?? 'disk';
  const disks: DiskImage[] = o.types.map(t => ({ name: `${base}.${EXT_OF[t] ?? t}`, image: o.image, type: t, arch: o.arch, size: '—', built: 'building…', status: 'building', folder: `${o.folder}/${base}` }));
  flows.disks = [...disks, ...flows.disks.filter(d => !disks.some(n => n.name === d.name))];
  flows.tree++;
  runTask({
    title: `Build ${base}`,
    connId: BOOTC_CONN,
    icon: ICON,
    label: 'bootc-image-builder',
    target: bootcTarget('Disk Images'),
    cmd: `podman run --rm --privileged --pull=newer --security-opt label=type:unconfined_t -v ${o.folder}/${base}:/output -v ./config.toml:/config.toml:ro -v /var/lib/containers/storage:/var/lib/containers/storage ${builderFor(b?.base ?? 'Fedora')} ${o.types.map(t => `--type ${t}`).join(' ')} --target-arch ${o.arch} --rootfs ${o.filesystem} --use-librepo=True ${o.image}`,
    lines: [
      `Generating manifest manifest-${o.types.join('-')}.json`,
      `config.toml: user ${o.user} (wheel)${o.key ? `, key ${o.key}` : ''}`,
      'Building manifest-qcow2.json',
      'starting pipeline build: org.osbuild.rpm (1/12)',
      'pipeline ostree-deployment: org.osbuild.bootc.install-to-filesystem',
      `pipeline image: org.osbuild.mkfs.${o.filesystem}, org.osbuild.grub2`,
      ...o.types.map(t => `pipeline ${t}: org.osbuild.${t === 'anaconda-iso' ? 'xorrisofs' : 'qemu'} → ${o.folder}/${base}/${t}/disk.${EXT_OF[t] ?? t}`),
      `✔ Build complete: ${o.types.length} disk image${o.types.length > 1 ? 's' : ''} in ${o.folder}/${base}`,
    ],
    done: () => {
      flows.disks = flows.disks.map(d => (disks.some(n => n.name === d.name) ? { ...d, status: 'success', size: SIZE[d.type] ?? '2 GB', built: 'just now' } : d));
      flows.tree++;
    },
  });
}

/** Run a disk image in a new local VM (VM provider, macadam): VM connection under Other in the switcher + console session. */
export function bootInVm(d: DiskImage, o: { name: string; cpus: string; memory: string }): void {
  const id = o.name;
  runTask({
    title: `Boot ${id}`,
    connId: BOOTC_CONN,
    icon: 'icons/redhat.bootc.png',
    label: 'Run in a VM',
    target: bootcTarget('Disk Images'),
    cmd: `macadam init --name ${id} --cpus ${o.cpus} --memory ${Number(o.memory) * 1024} --username alice --ssh-identity-path ~/.ssh/id_ed25519 ${d.folder}/${d.type}/disk.${EXT_OF[d.type] ?? d.type}`,
    lines: ['Copying disk image to the VM storage…', `Machine "${id}" created (libkrun)`, `macadam start ${id}`, `Machine "${id}" started successfully`, `✔ ${id} is running · ssh alice@${id}`],
    done: () => {
      addConnection({
        id,
        name: id,
        group: 'VMs & services',
        product: 'Virtual machine',
        detail: `${d.image} · ${o.cpus} CPU · ${o.memory} GB · libkrun`,
        icon: 'icons/redhat.rhel-vms.png',
        status: 'running',
        color: '#ee0000',
        initials: 'VM',
        sections: [
          { id: 'overview', label: 'Overview', icon: 'icons/redhat.rhel-vms.png', count: 1 },
          { id: 'containers', label: 'Containers', icon: 'icons/podman-desktop.podman.png', count: 0 },
          { id: 'subscription', label: 'Subscription', icon: 'icons/redhat.rhel-registration.png', count: 1, ext: EXT.rhel },
        ],
      });
      addResource({ id: `${id}/overview/${id}`, name: id, connId: id, sectionId: 'overview', status: 'running', sub: d.image, age: '1 minute' });
      live.status[`conn:${id}`] = 'running';
      lab.addSession({
        id: `console-${id}`,
        kind: 'terminal',
        title: `${id} console`,
        label: 'serial console',
        connId: id,
        target: { kind: 'connection', connId: id },
        icon: 'icons/redhat.rhel-vms.png',
        lines: [
          '[    0.000000] Linux version 6.12.0-55.el10.x86_64 (mockbuild@x86-64-01.build.eng.rdu2.redhat.com)',
          '[    1.204411] systemd[1]: Detected virtualization kvm.',
          '[  OK  ] Reached target Basic System.',
          '[  OK  ] Started bootc-fetch-apply-updates.timer.',
          `[  OK  ] Booted ${d.image} (ostree deployment 0)`,
          '',
          'Red Hat Enterprise Linux 10.2 (Coughlan)',
          `Kernel 6.12.0-55.el10.x86_64 on ${o.name}`,
          '',
          `${id} login: alice`,
          `[alice@${id} ~]$ sudo bootc status | head -3`,
          'Booted image: ' + d.image,
          `        Digest: sha256:${sha(d.image, 16)}`,
          `[alice@${id} ~]$ `,
        ],
      });
    },
  });
}

/** Run a disk image as a VirtualMachine on OpenShift Virtualization (minc / OpenShift Local). */
export function runOnVirt(d: DiskImage, o: { connId: string; ns: string; name: string }): void {
  installExt('virt');
  const c = CONNECTIONS.find(x => x.id === o.connId);
  if (c && !c.sections.some(s => s.id === 'vms')) c.sections.push({ id: 'vms', label: 'Virtualization', icon: 'icons/redhat.openshift-virtualization.png', count: 0, ext: EXT.virt });
  live.status[`conn:${o.connId}`] = 'running';
  const target: LabTarget = { kind: 'resource', connId: o.connId, sectionId: 'vms', resId: `${o.connId}/vms/${o.name}` };
  runTask({
    title: `VM ${o.name}`,
    connId: o.connId,
    icon: 'icons/redhat.openshift-virtualization.png',
    label: 'OpenShift Virtualization',
    cmd: `virtctl image-upload dv ${o.name}-rootdisk -n ${o.ns} --size=20Gi --image-path=${d.folder}/${d.type}/disk.${EXT_OF[d.type] ?? d.type} --insecure`,
    lines: [
      `PVC ${o.ns}/${o.name}-rootdisk not found, creating DataVolume`,
      'Uploading data to https://cdi-uploadproxy-openshift-cnv.apps-crc.testing',
      ` ${d.size} / ${d.size} [==========================] 100.00%`,
      'Uploading data completed successfully, waiting for processing to complete',
      `$ oc apply -n ${o.ns} -f virtualmachine-${o.name}.yaml`,
      `virtualmachine.kubevirt.io/${o.name} created`,
      `$ virtctl start ${o.name} -n ${o.ns}`,
      `VM ${o.name} was scheduled to start`,
      `✔ VirtualMachine ${o.name} is Running on ${o.connId}`,
    ],
    done: () => {
      addResource({ id: target.resId!, name: o.name, connId: o.connId, sectionId: 'vms', status: 'running', sub: `${d.image} · 2 vCPU · 4 GiB`, age: '1 minute', ns: o.ns, cols: { status: 'Running', ns: o.ns, image: d.image } });
      flows.tree++;
      lab.addSession({
        id: `vmconsole-${o.name}`,
        kind: 'terminal',
        title: `${o.name} console`,
        label: 'virtctl console',
        connId: o.connId,
        target,
        icon: 'icons/redhat.openshift-virtualization.png',
        lines: [`$ virtctl console ${o.name} -n ${o.ns}`, 'Successfully connected to ' + o.name + ' console. The escape sequence is ^]', '', 'Red Hat Enterprise Linux 10.2 (Coughlan)', `${o.name} login: alice`, `[alice@${o.name} ~]$ `],
      });
    },
  });
}

/** Pull an example bootc image (task) and add it to bootc Images. */
export function pullExample(image: string, arch: string, base: BootcImage['base'], size: string): void {
  const [name, tag] = image.split(/:(?=[^:/]+$)/);
  runTask({
    title: `Pull ${name.split('/').pop()}`,
    connId: BOOTC_CONN,
    icon: ICON,
    target: bootcTarget('Images'),
    cmd: `podman pull --arch ${arch} ${image}`,
    lines: [`Trying to pull ${image}...`, 'Getting image source signatures', `Copying blob sha256:${sha(image)}…`, 'Writing manifest to image destination', `✔ Pulled ${image} (${size})`],
    done: () => {
      if (!flows.bootc.some(b => ref(b) === image)) flows.bootc = [...flows.bootc, { name, tag: tag ?? 'latest', base, version: tag ?? 'latest', size, lint: 'pass', created: 'just now' }];
      flows.tree++;
    },
  });
}
