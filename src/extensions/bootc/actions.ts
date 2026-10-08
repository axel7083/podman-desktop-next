/** bootc actions: build disk image, fix lint, boot in a RHEL VM. */
import { mkImage } from '#lib/ext/helpers.ts';
import { addDynamicConnection, type ContainerImage, later, runTask, toast, world } from '#lib/world.svelte.ts';

import { BOOTC_EXT, type BootcBuildInfo, builds, type BuildType, setBuilds } from './data.ts';

export function buildDiskImage(i: ContainerImage, types: BuildType[], arch: 'amd64' | 'arm64', builder: string, user: string): void {
  const short = i.name.split('/').pop() ?? i.name;
  const id = `${short}-${types.join('-')}-${Date.now().toString(36)}`;
  const info: BootcBuildInfo = { id, image: i.name, tag: i.tag, engineId: i.engineId, type: types, folder: `C:\\Users\\alice\\bootc\\${short}`, arch, filesystem: 'xfs', status: 'creating', timestamp: new Date().toISOString(), buildContainerId: builder };
  setBuilds([info, ...builds()]);
  const update = (status: BootcBuildInfo['status']): void => setBuilds(builds().map(b => (b.id === id ? { ...b, status } : b)));
  later(1500, () => update('running'));
  runTask({
    name: `Build ${types.join(' + ')} from ${short}:${i.tag}`,
    ext: BOOTC_EXT,
    steps: [
      { label: `Pull ${builder}`, ms: 1500, log: ['Using registry.redhat.io credentials (service account podman-desktop)'] },
      { label: 'org.osbuild.rpm / org.osbuild.ostree.deploy', ms: 3500, log: [`Building manifest-${types[0]}.json`, 'Pipeline build: org.osbuild.rpm', 'Pipeline image: org.osbuild.bootc.install-to-filesystem', user ? `Adding user ${user} (wheel) with SSH key` : ''] },
      { label: `org.osbuild.qemu (${types.join(', ')})`, ms: 2500, log: [`Writing ${info.folder}\\${types[0] === 'anaconda-iso' ? 'bootiso\\install.iso' : `${types[0]}\\disk.${types[0]}`}`] },
    ],
    onDone: () => update('success'),
    action: { label: 'Open disk images', href: `/c/${i.engineId}/bootc` },
  });
}

export function fixLint(i: ContainerImage): void {
  const tag = i.tag === '1.4' ? '1.5' : `${i.tag}.1`;
  runTask({
    name: `Fix bootc lint and rebuild ${i.name.split('/').pop()}:${tag}`,
    ext: BOOTC_EXT,
    steps: [
      { label: 'Fix usr/lib/bootc/kargs.d/10-console.toml', ms: 700, log: ['- kargs = ["console=ttyS0,115200n8"', '+ kargs = ["console=ttyS0,115200n8"]'] },
      { label: 'RUN rm -rf /var/log/dnf* && bootc container lint', ms: 900, log: ['Checks passed: 9', 'Warnings: 0'] },
      { label: `podman build -t ${i.name}:${tag} .`, ms: 2400 },
    ],
    onDone: () => world.images.push(mkImage(i.engineId, { name: i.name, tag, sizeMB: Math.round(i.size / 1048576) - 3, ageD: 0, base: i.base, labels: { ...i.labels, 'bootc.lint': 'pass' } })),
    action: { label: 'Open images', href: `/c/${i.engineId}/images` },
  });
}

export function bootInVm(b: BootcBuildInfo, agent: boolean): void {
  const short = b.image.split('/').pop() ?? 'bootc';
  const name = `${short}-vm`;
  runTask({
    name: `Boot ${short}:${b.tag} in a RHEL VM`,
    ext: BOOTC_EXT,
    steps: [
      { label: `macadam init ${b.folder}\\qcow2\\disk.qcow2`, ms: 1500 },
      { label: `macadam start ${name}`, ms: 1800, log: ['bootc status: booted ' + b.image + ':' + b.tag, ...(agent ? ['flightctl-agent: requesting enrollment at https://api.edge-manager.acme.corp'] : [])] },
    ],
    onDone: () => {
      addDynamicConnection(
        'redhat.rhel-vms',
        {
          id: name,
          name,
          kind: 'vm',
          providerId: 'rhel-vms',
          providerName: 'RHEL VMs',
          hint: 'bootc',
          hintTooltip: `Booted from ${b.image}:${b.tag}`,
          initialStatus: 'started',
          endpoint: 'ssh://core@localhost:50240',
          version: b.image.includes('rhel10') ? '10.1' : '9.7',
          details: { Image: `${b.image}:${b.tag}`, Disk: `${b.folder}\\qcow2\\disk.qcow2`, 'Managed by': 'macadam 0.3.0' },
          capabilities: ['rhel', `rhel:${b.image.includes('rhel10') ? '10.1' : '9.7'}`, 'ssh', 'bootc', ...(agent ? ['flightctl-agent'] : [])],
        },
        'started',
      );
      setBuilds(builds().map(x => (x.id === b.id ? { ...x, vm: name } : x)));
      if (agent) toast({ type: 'info', title: 'New enrollment request', body: `${name} asked to join Red Hat Edge Manager`, action: { label: 'Review', href: '/c/edge-manager/enrollment-requests' } });
    },
    action: { label: `Open ${name}`, href: `/c/${name}` },
  });
}
