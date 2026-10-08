/**
 * WSL Containers mock data (shapes from `wslc system info`, `wslc container ls`
 * and the sample in docs/research/microsoft.wslc.md) + the engine capability
 * matrix shared with the Apple container extension (P11 capability flags).
 */

export const WSLC_ID = 'podman-desktop.wslc';

export const WSL_INFO = { version: '3.0.1', kernel: '6.6.87.2-1', wslcAvailable: true };

export const DEFAULT_VHD = 'C:\\Users\\alice\\AppData\\Local\\wslc\\sessions\\default\\session.vhdx';

export type EngineColumn = 'podman' | 'docker' | 'wslc' | 'apple';

export const ENGINE_COLUMNS: { id: EngineColumn; label: string; icon: string }[] = [
  { id: 'podman', label: 'Podman', icon: 'icons/podman-desktop.podman.png' },
  { id: 'docker', label: 'Docker', icon: 'icons/podman-desktop.docker.png' },
  { id: 'wslc', label: 'WSLC', icon: 'icons/podman-desktop.wslc.png' },
  { id: 'apple', label: 'Apple container', icon: 'icons/redhat.apple-container.png' },
];

export type Support = 'yes' | 'no' | 'partial';

export interface CapabilityRow {
  id: string;
  label: string;
  cells: Record<EngineColumn, { support: Support; note?: string }>;
}

export const CAPABILITIES: CapabilityRow[] = [
  {
    id: 'pods',
    label: 'Pods',
    cells: {
      podman: { support: 'yes' },
      docker: { support: 'no', note: 'No pod concept' },
      wslc: { support: 'no', note: 'Not supported by WSLC' },
      apple: { support: 'no', note: 'No pod concept' },
    },
  },
  {
    id: 'compose',
    label: 'Compose',
    cells: {
      podman: { support: 'yes', note: 'podman compose / docker-compose over the socket' },
      docker: { support: 'yes' },
      wslc: { support: 'no', note: 'Not supported by WSLC — Compose planned post-GA' },
      apple: { support: 'no' },
    },
  },
  {
    id: 'kube-play',
    label: 'Kube play',
    cells: {
      podman: { support: 'yes', note: 'podman kube play' },
      docker: { support: 'no' },
      wslc: { support: 'no' },
      apple: { support: 'no' },
    },
  },
  {
    id: 'build',
    label: 'Build images',
    cells: {
      podman: { support: 'yes' },
      docker: { support: 'yes' },
      wslc: { support: 'yes', note: 'wslc image build' },
      apple: { support: 'yes', note: 'container build' },
    },
  },
  {
    id: 'socket',
    label: 'Docker API socket',
    cells: {
      podman: { support: 'yes', note: 'npipe:////./pipe/podman-machine-default' },
      docker: { support: 'yes' },
      wslc: { support: 'no', note: 'No Docker-compatible socket at GA: Podman Desktop drives wslc.exe' },
      apple: { support: 'partial', note: 'Through the socktainer shim' },
    },
  },
  {
    id: 'vpn',
    label: 'VPN-friendly networking',
    cells: {
      podman: { support: 'partial', note: 'WSL 2 NAT can break on corporate VPNs' },
      docker: { support: 'partial', note: 'WSL 2 NAT can break on corporate VPNs' },
      wslc: { support: 'yes', note: 'Consommé: traffic exits as your Windows process' },
      apple: { support: 'partial', note: 'vmnet shared network' },
    },
  },
  {
    id: 'gpu',
    label: 'GPU',
    cells: {
      podman: { support: 'partial', note: 'CDI in WSL 2, libkrun on macOS' },
      docker: { support: 'partial', note: 'NVIDIA on WSL 2' },
      wslc: { support: 'yes', note: 'CDI /dev/dxg' },
      apple: { support: 'no' },
    },
  },
  {
    id: 'vm-per-container',
    label: 'VM per container',
    cells: {
      podman: { support: 'no', note: 'One shared machine VM' },
      docker: { support: 'no', note: 'One shared VM' },
      wslc: { support: 'no', note: 'One Hyper-V VM per session' },
      apple: { support: 'yes', note: 'Virtualization.framework VM per container' },
    },
  },
];

/** Banner shown above the matrix for engines with notable limitations. */
export const ENGINE_BANNERS: Partial<Record<EngineColumn, string>> = {
  wslc: 'WSL Containers is GA in WSL 3.0.1 but has no pods, Compose or kube play yet, and no Docker-compatible socket: Podman Desktop drives wslc.exe directly, so tools that rely on DOCKER_HOST (Testcontainers, docker CLI) do not see these containers.',
  apple:
    'Apple container runs one lightweight VM per container. Podman Desktop talks to it through socktainer, a Docker API shim: pods, Compose and kube play are not available.',
};
