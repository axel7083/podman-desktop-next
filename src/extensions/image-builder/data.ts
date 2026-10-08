/**
 * Image Builder mock data, shaped like
 * https://console.redhat.com/api/image-builder/v1/openapi.json
 * (BlueprintItem, ComposesResponseItem, ComposeStatus).
 */
import { world } from '#lib/world.svelte.ts';

export const IB_EXT = 'redhat.image-builder';

export type ImageType = 'wsl' | 'guest-image' | 'image-installer' | 'vsphere-ova' | 'vhd' | 'ami' | 'oci';
export type ComposeState = 'pending' | 'building' | 'uploading' | 'registering' | 'success' | 'failure';

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  version: number;
  distribution: 'rhel-9' | 'rhel-10';
  last_modified_at: string;
  image_requests: { architecture: 'x86_64' | 'aarch64'; image_type: ImageType }[];
  customizations: {
    packages?: string[];
    custom_repositories?: { id: string; name: string; baseurl: string[] }[];
    subscription?: { organization: number; 'activation-key': string; insights: boolean; rhc: boolean };
    openscap?: { profile_id: string; profile_name: string };
    users?: { name: string; ssh_key: string; groups: string[] }[];
  };
}

export interface Compose {
  id: string;
  blueprint: string;
  blueprint_version: number;
  image_type: ImageType;
  created_at: string;
  image_status: { status: ComposeState; upload_status?: { type: 'aws.s3'; status: 'success'; options: { url: string } }; error?: { reason: string; details: string } };
  /** Local download path once downloaded. */
  downloaded?: string;
  /** ui-svelte Table selection flag. */
  selected?: boolean;
}

export const IMAGE_TYPES: Record<ImageType, string> = {
  wsl: 'WSL (.tar.gz)',
  'guest-image': 'Virtualization – guest image (.qcow2)',
  'image-installer': 'Bare metal – installer (.iso)',
  'vsphere-ova': 'VMware vSphere (.ova)',
  vhd: 'Hyper-V / Azure (.vhd)',
  ami: 'Amazon Web Services (AMI)',
  oci: 'Oracle Cloud (.qcow2)',
};

export const EXT: Record<ImageType, string> = { wsl: 'wsl.tar.gz', 'guest-image': 'disk.qcow2', 'image-installer': 'installer.iso', 'vsphere-ova': 'image.ova', vhd: 'disk.vhdx', ami: 'ami', oci: 'disk.qcow2' };

const S3 = 'https://image-builder-service-production.s3.amazonaws.com';

export const BLUEPRINTS: Blueprint[] = [
  {
    id: '4f1b2c3d-1a2b-4c5d-8e9f-0a1b2c3d4e5f',
    name: 'rhel-wsl-podman',
    description: 'RHEL 9 WSL distro usable as a Podman machine',
    version: 3,
    distribution: 'rhel-9',
    last_modified_at: '2026-10-06T09:12:00Z',
    image_requests: [{ architecture: 'x86_64', image_type: 'wsl' }],
    customizations: {
      packages: ['podman', 'podman-docker', 'openssh-server', 'sudo', 'procps-ng', 'iproute', 'dhcp-client', 'net-tools', 'systemd-networkd'],
      custom_repositories: [{ id: 'epel9', name: 'EPEL 9', baseurl: ['https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/'] }],
      subscription: { organization: 19830412, 'activation-key': 'podman-desktop', insights: true, rhc: true },
    },
  },
  {
    id: '9e8d7c6b-5a49-4382-a1b0-c9d8e7f6a5b4',
    name: 'rhel10-cis-guest',
    description: 'CIS L1 hardened qcow2 for local VMs',
    version: 5,
    distribution: 'rhel-10',
    last_modified_at: '2026-09-28T16:40:00Z',
    image_requests: [{ architecture: 'x86_64', image_type: 'guest-image' }],
    customizations: {
      openscap: { profile_id: 'xccdf_org.ssgproject.content_profile_cis_server_l1', profile_name: 'CIS Red Hat Enterprise Linux 10 Benchmark for Level 1 - Server' },
      users: [{ name: 'alice', ssh_key: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJ6… alice@acme', groups: ['wheel'] }],
      packages: ['tmux', 'git'],
      subscription: { organization: 19830412, 'activation-key': 'podman-desktop', insights: true, rhc: true },
    },
  },
  {
    id: 'a7e3c9d1-0000-4e6a-9c8d-1f2e3d4c5b6a',
    name: 'rhel10-podman-hyperv',
    description: 'RHEL 10 Hyper-V disk for Podman machines',
    version: 1,
    distribution: 'rhel-10',
    last_modified_at: '2026-09-30T10:20:00Z',
    image_requests: [{ architecture: 'x86_64', image_type: 'vhd' }],
    customizations: { packages: ['podman', 'openssh-server', 'hyperv-daemons'], subscription: { organization: 19830412, 'activation-key': 'podman-desktop', insights: true, rhc: true } },
  },
  {
    id: '1c2d3e4f-5a6b-4c7d-8e9f-a0b1c2d3e4f5',
    name: 'rhel9-edge-iso',
    description: 'Installer ISO for lab boxes',
    version: 1,
    distribution: 'rhel-9',
    last_modified_at: '2026-08-11T11:00:00Z',
    image_requests: [{ architecture: 'aarch64', image_type: 'image-installer' }],
    customizations: {},
  },
  {
    id: '7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d',
    name: 'rhel9-vsphere-app',
    description: 'VMware template for staging',
    version: 2,
    distribution: 'rhel-9',
    last_modified_at: '2026-07-30T08:00:00Z',
    image_requests: [{ architecture: 'x86_64', image_type: 'vsphere-ova' }],
    customizations: { packages: ['open-vm-tools'] },
  },
];

export const COMPOSES: Compose[] = [
  { id: 'b2f4c1d0-7e3a-4c9b-8a10-3d2e1f0a9b8c', blueprint: 'rhel-wsl-podman', blueprint_version: 3, image_type: 'wsl', created_at: '2026-10-06T09:13:02Z', image_status: { status: 'success', upload_status: { type: 'aws.s3', status: 'success', options: { url: `${S3}/composer-api-b2f4c1d0-wsl.tar.gz?X-Amz-Expires=21600` } } } },
  { id: 'c3a5d2e1-8f4b-4dac-9b21-4e3f2a1b0c9d', blueprint: 'rhel-wsl-podman', blueprint_version: 2, image_type: 'wsl', created_at: '2026-10-01T15:02:44Z', image_status: { status: 'failure', error: { reason: 'Error depsolving', details: 'No match for argument: systemd-networkd' } } },
  { id: 'a7e3c9d1-2b4f-4e6a-9c8d-1f2e3d4c5b6a', blueprint: 'rhel10-podman-hyperv', blueprint_version: 1, image_type: 'vhd', created_at: '2026-09-30T10:31:00Z', image_status: { status: 'success', upload_status: { type: 'aws.s3', status: 'success', options: { url: `${S3}/composer-api-a7e3c9d1-disk.vhdx` } } } },
  { id: 'd4b6e3f2-9a5c-4ebd-8c32-5f4a3b2c1d0e', blueprint: 'rhel10-cis-guest', blueprint_version: 5, image_type: 'guest-image', created_at: '2026-10-08T07:55:10Z', image_status: { status: 'building' } },
  { id: 'e5c7f4a3-0b6d-4fce-9d43-6a5b4c3d2e1f', blueprint: 'rhel9-vsphere-app', blueprint_version: 2, image_type: 'vsphere-ova', created_at: '2026-10-08T08:01:00Z', image_status: { status: 'pending' } },
  { id: 'f6d8a5b4-1c7e-4adf-8e54-7b6c5d4e3f2a', blueprint: 'rhel9-edge-iso', blueprint_version: 1, image_type: 'image-installer', created_at: '2026-10-08T07:40:00Z', image_status: { status: 'uploading' } },
];

export const OPENSCAP_PROFILES = [
  { value: '', label: 'None' },
  { value: 'xccdf_org.ssgproject.content_profile_cis_server_l1', label: 'CIS Level 1 – Server' },
  { value: 'xccdf_org.ssgproject.content_profile_cis', label: 'CIS Level 2 – Server' },
  { value: 'xccdf_org.ssgproject.content_profile_stig', label: 'DISA STIG' },
  { value: 'xccdf_org.ssgproject.content_profile_pci-dss', label: 'PCI-DSS v4' },
];

interface Store {
  blueprints: Blueprint[];
  composes: Compose[];
}

export function ibStore(): Store {
  return (world.ext[IB_EXT] ?? { blueprints: [], composes: [] }) as unknown as Store;
}

export function ibMutable(): Store {
  world.ext[IB_EXT] ??= { blueprints: [], composes: [] };
  return world.ext[IB_EXT] as unknown as Store;
}
