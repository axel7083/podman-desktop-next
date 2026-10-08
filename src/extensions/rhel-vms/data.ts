/**
 * Mock data for redhat.rhel-vms, shaped like ext-rhel (`src/images.ts`,
 * macadam `list --format json`) and the R4 dossier.
 */

export interface OfficialImage {
  release: string;
  provider: 'wsl' | 'applehv' | 'linux' | 'hyperv';
  sha256?: string;
  file?: string;
  size?: number;
}

/** `GET https://api.access.redhat.com/management/v1/images/{checksum}/download`. */
export const OFFICIAL_IMAGES: OfficialImage[] = [
  { release: 'rhel-10.2', provider: 'wsl', sha256: 'e1871004d0075e0ce10cfb4c1aae7c1fb56cf2162e9d494d1f9c9d061902fec6', file: 'rhel10.tar.gz', size: 903872512 },
  { release: 'rhel-9.8', provider: 'wsl', sha256: 'bf4fa1142e0090e7f6fe163bf03d5f0de12ebafce02d4f8ea71dd5de3f1769c8', file: 'rhel9.tar.gz', size: 851443712 },
  { release: 'rhel-10.2', provider: 'applehv', sha256: 'a522f6abacab1c5804477332bbd14a467c3f9812d3f2c46ee05c71b07df05bcf', file: 'rhel10.qcow2', size: 1137704960 },
  { release: 'rhel-9.8', provider: 'applehv', sha256: 'e424cba737c5d6315160111043f40108b3bc458c09c937454a3331c52503d877', file: 'rhel9.qcow2', size: 1073741824 },
  // no hyperv entry upstream → "provider hyperv is not supported"
];

export const RELEASES: Record<string, { label: string; pretty: string; version: string }> = {
  'rhel-10.2': { label: 'RHEL 10.2', pretty: 'Red Hat Enterprise Linux release 10.2 (Coughlan)', version: '10.2' },
  'rhel-9.8': { label: 'RHEL 9.8', pretty: 'Red Hat Enterprise Linux release 9.8 (Plow)', version: '9.8' },
};

/** Image Builder composes usable as a machine image (R5 hand-off). */
export const COMPOSES: Record<string, { label: string; type: 'wsl' | 'vhd' | 'guest-image'; file: string; release: string }> = {
  'b2f4c1d0-7e3a-4c9b-8a10-3d2e1f0a9b8c': { label: 'rhel-wsl-podman v3 · wsl · success', type: 'wsl', file: 'composer-api-b2f4c1d0-wsl.tar.gz', release: 'rhel-9.8' },
  'a7e3c9d1-2b4f-4e6a-9c8d-1f2e3d4c5b6a': { label: 'rhel10-podman-hyperv v1 · vhd · success', type: 'vhd', file: 'composer-api-a7e3c9d1-disk.vhdx', release: 'rhel-10.2' },
  'd4b6e3f2-9a5c-4ebd-8c32-5f4a3b2c1d0e': { label: 'rhel10-cis-guest v5 · qcow2 · success', type: 'guest-image', file: 'composer-api-d4b6e3f2-disk.qcow2', release: 'rhel-10.2' },
};

export const ACTIVATION_KEYS = [
  { value: 'podman-desktop', label: 'podman-desktop (Workstation · Development/Test · Self-Support)' },
  { value: 'ci-runners', label: 'ci-runners (Server · Production · Standard)' },
  { value: 'edge-lab', label: 'edge-lab (Server · Development/Test · Self-Support)' },
  { value: 'satellite-dc1', label: 'satellite-dc1 (Server · Production · Premium)' },
  { value: 'rhel9-dev', label: 'rhel9-dev (Satellite · CV RHEL9-Base · Dev)' },
  { value: 'rhel10-dev', label: 'rhel10-dev (Satellite · CV RHEL10-Base · Dev)' },
];

export const SATELLITE_KEYS = ['rhel9-dev', 'rhel10-dev'];

export function uuid(): string {
  return crypto.randomUUID();
}

/** Scripted terminal answers for a RHEL guest. */
export function rhelTerminal(name: string, release: string, registered: boolean): Record<string, string> {
  const pretty = Object.values(RELEASES).find(r => release.startsWith(r.version))?.pretty ?? `Red Hat Enterprise Linux release ${release}`;
  return {
    'cat /etc/redhat-release': pretty,
    'cat /etc/os-release': `NAME="Red Hat Enterprise Linux"\nVERSION="${release}"\nID="rhel"\nID_LIKE="centos fedora"\nPLATFORM_ID="platform:el${release.split('.')[0]}"\nPRETTY_NAME="${pretty}"`,
    'uname -r': release.startsWith('10') ? '6.12.0-124.8.1.el10_1.x86_64' : '5.14.0-611.5.1.el9_7.x86_64',
    'podman version': 'Client:       Podman Engine\nVersion:      5.6.0\nAPI Version:  5.6.0\nGo Version:   go1.24.6 (Red Hat 1.24.6-1.el10)\nOS/Arch:      linux/amd64',
    'sudo subscription-manager status': registered
      ? '+-------------------------------------------+\n   System Status Details\n+-------------------------------------------+\nOverall Status: Registered\n\nSystem Purpose Status: Disabled\n\nContent Access Mode is set to Simple Content Access.'
      : 'Overall Status: Unknown\n\nThis system is not yet registered. Try \'subscription-manager register --help\' for more information.',
    'sudo insights-client --check-results': registered ? 'Successfully uploaded report for ' + name + '.\nView the Red Hat Insights console at https://console.redhat.com/insights/' : 'This host has not been registered. Use --register to register this host.',
    'hostnamectl': ` Static hostname: ${name}\n       Icon name: computer-vm\n         Chassis: vm\nOperating System: ${pretty}\n          Kernel: Linux ${release.startsWith('10') ? '6.12.0-124.8.1.el10_1.x86_64' : '5.14.0-611.5.1.el9_7.x86_64'}\n    Architecture: x86-64`,
    'sudo dnf repolist': registered
      ? `repo id                                    repo name\nrhel-${release.split('.')[0]}-for-x86_64-appstream-rpms   Red Hat Enterprise Linux ${release.split('.')[0]} for x86_64 - AppStream (RPMs)\nrhel-${release.split('.')[0]}-for-x86_64-baseos-rpms      Red Hat Enterprise Linux ${release.split('.')[0]} for x86_64 - BaseOS (RPMs)`
      : 'This system is not registered with an entitlement server. You can use subscription-manager to register.\nNo repositories available',
  };
}
