/** bootc mock data, shaped like ext-bootc `BootcBuildInfo` (packages/shared/src/models/bootc.ts). */
import { type ContainerImage, world } from '#lib/world.svelte.ts';

export const BOOTC_EXT = 'redhat.bootc';

export type BuildType = 'qcow2' | 'ami' | 'raw' | 'vmdk' | 'anaconda-iso' | 'vhd' | 'gce';
export type BuildStatus = 'running' | 'creating' | 'success' | 'error' | 'lost' | 'deleting';

export interface BootcBuildInfo {
  id: string;
  image: string;
  tag: string;
  engineId: string;
  type: BuildType[];
  folder: string;
  arch: 'amd64' | 'arm64';
  filesystem?: 'xfs' | 'ext4';
  status: BuildStatus;
  timestamp: string;
  buildContainerId: string;
  error?: string;
  /** VM booted from this disk image. */
  vm?: string;
}

export const BUILDERS = [
  { value: 'registry.redhat.io/rhel10/bootc-image-builder:10.1', label: 'registry.redhat.io/rhel10/bootc-image-builder:10.1' },
  { value: 'registry.redhat.io/rhel9/bootc-image-builder:9.7', label: 'registry.redhat.io/rhel9/bootc-image-builder:9.7' },
  { value: 'quay.io/centos-bootc/bootc-image-builder:latest', label: 'quay.io/centos-bootc/bootc-image-builder:latest (CentOS)' },
];

export const BUILDS: BootcBuildInfo[] = [
  { id: 'rhel10-web-qcow2', image: 'quay.io/acme/rhel10-web', tag: '1.3', engineId: 'podman-machine-default', type: ['qcow2'], folder: 'C:\\Users\\alice\\bootc\\rhel10-web', arch: 'amd64', filesystem: 'xfs', status: 'success', timestamp: '2026-10-07T13:22:41Z', buildContainerId: 'registry.redhat.io/rhel10/bootc-image-builder:10.1' },
  { id: 'microshift-edge-raw', image: 'quay.io/acme/microshift-edge', tag: '4.22', engineId: 'podman-machine-default', type: ['raw'], folder: 'C:\\Users\\alice\\bootc\\microshift-edge', arch: 'arm64', status: 'error', timestamp: '2026-10-03T17:40:00Z', buildContainerId: 'registry.redhat.io/rhel9/bootc-image-builder:9.7', error: 'manifest unknown: arm64 variant not found' },
  { id: 'rhelai-ami', image: 'registry.redhat.io/rhelai3/bootc-cuda-rhel9', tag: '3.0', engineId: 'podman-machine-default', type: ['ami'], folder: 'C:\\Users\\alice\\bootc\\rhelai', arch: 'amd64', status: 'success', timestamp: '2026-09-21T10:00:00Z', buildContainerId: 'registry.redhat.io/rhel9/bootc-image-builder:9.7' },
];

export interface LintResult {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message?: string;
}

/** `bootc container lint` output for an image. */
export function lint(i: ContainerImage): LintResult[] {
  if (i.labels?.['bootc.lint'] === 'pass') return [{ name: 'var-log', status: 'pass' }, { name: 'kargs', status: 'pass' }];
  if (i.name.endsWith('rhel10-web')) {
    return [
      { name: 'var-log', status: 'warning', message: 'Found non-empty logfile: /var/log/dnf.rpm.log' },
      { name: 'kargs', status: 'fail', message: 'Parsing usr/lib/bootc/kargs.d/10-console.toml: invalid TOML' },
    ];
  }
  if (i.name.endsWith('edge-kiosk')) return [{ name: 'var-log', status: 'warning', message: 'Found non-empty logfile: /var/log/flightctl-agent.log' }];
  return [];
}

export const isBootc = (i: ContainerImage): boolean => i.labels?.['containers.bootc'] === '1';

export function builds(): BootcBuildInfo[] {
  return ((world.ext[BOOTC_EXT] as { builds?: BootcBuildInfo[] } | undefined)?.builds ?? []);
}

export function setBuilds(list: BootcBuildInfo[]): void {
  world.ext[BOOTC_EXT] ??= {};
  (world.ext[BOOTC_EXT] as { builds: BootcBuildInfo[] }).builds = list;
}
