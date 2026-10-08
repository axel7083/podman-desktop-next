/** Red Hat Edge Manager (flightctl v1beta1) mock data: Device, Fleet, EnrollmentRequest. */
import { world } from '#lib/world.svelte.ts';

export const EM_EXT = 'redhat.edge-manager';
export const EM_CONN = 'edge-manager';

export interface Device {
  name: string;
  labels: Record<string, string>;
  osImage: string;
  summary: 'Online' | 'Degraded' | 'Error' | 'Rebooting' | 'PoweredOff' | 'Unknown';
  summaryInfo?: string;
  updated: 'UpToDate' | 'OutOfDate' | 'Updating' | 'Unknown';
  applications: 'Healthy' | 'Degraded' | 'Error' | 'NoApplications' | 'Unknown';
  lastSeen: string;
  agentVersion?: string;
}

export interface Fleet {
  name: string;
  selector: Record<string, string>;
  osImage: string;
  applications: string[];
  rollout: { maxUnavailable: number; successThreshold: string; defaultUpdateTimeout: string };
}

export interface EnrollmentRequest {
  name: string;
  alias: string;
  created: string;
  status: 'Pending' | 'Approved' | 'Denied';
  /** Local RHEL VM that runs the agent, if any. */
  vm?: string;
}

const now = (): string => new Date().toISOString();

export const DEVICES: Device[] = [
  { name: 'dev-6a0f5c1e9b2d4c7aa1f3b2e8d9c0a4b1', labels: { fleet: 'kiosks', site: 'lab', alias: 'rhel-vm-kiosk-01' }, osImage: 'quay.io/acme/edge-kiosk:1.1', summary: 'Online', updated: 'UpToDate', applications: 'Healthy', lastSeen: now(), agentVersion: 'v1.3.1' },
  { name: 'dev-0b2c4e6f8a1c3e5f7a9b1d3f5e7c9a1b', labels: { fleet: 'kiosks', site: 'store-112', alias: 'kiosk-store-112' }, osImage: 'quay.io/acme/edge-kiosk:1.1', summary: 'Online', updated: 'UpToDate', applications: 'Healthy', lastSeen: now(), agentVersion: 'v1.3.1' },
  { name: 'dev-9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b', labels: { fleet: 'kiosks', site: 'store-207', alias: 'kiosk-store-207' }, osImage: 'quay.io/acme/edge-kiosk:1.1', summary: 'Online', updated: 'UpToDate', applications: 'Healthy', lastSeen: now(), agentVersion: 'v1.3.1' },
  { name: 'dev-1a3c5e7a9c1e3a5c7e9a1c3e5a7c9e1a', labels: { fleet: 'sensors', alias: 'sensor-dock-3' }, osImage: 'quay.io/acme/edge-sensor:0.9', summary: 'PoweredOff', updated: 'UpToDate', applications: 'NoApplications', lastSeen: '2026-10-02T19:00:00Z', agentVersion: 'v1.3.0' },
];

export const FLEETS: Fleet[] = [
  { name: 'kiosks', selector: { fleet: 'kiosks' }, osImage: 'quay.io/acme/edge-kiosk:1.1', applications: ['kiosk-ui (quay.io/acme/kiosk-ui:3.2, compose)'], rollout: { maxUnavailable: 1, successThreshold: '90%', defaultUpdateTimeout: '30m' } },
  { name: 'sensors', selector: { fleet: 'sensors' }, osImage: 'quay.io/acme/edge-sensor:0.9', applications: [], rollout: { maxUnavailable: 1, successThreshold: '100%', defaultUpdateTimeout: '1h' } },
];

export const ERS: EnrollmentRequest[] = [{ name: 'dev-4d6f8a0c2e4a6c8e0a2c4e6a8c0e2a4c', alias: 'rhel-vm-kiosk-02', created: '2026-10-08T08:16:10Z', status: 'Pending' }];

interface Store {
  devices: Device[];
  fleets: Fleet[];
  ers: EnrollmentRequest[];
}

export function emStore(): Store {
  return (world.ext[EM_EXT] ?? { devices: [], fleets: [], ers: [] }) as unknown as Store;
}

export function emMutable(): Store {
  world.ext[EM_EXT] ??= { devices: [], fleets: [], ers: [] };
  return world.ext[EM_EXT] as unknown as Store;
}

export function fingerprint(): string {
  return `dev-${crypto.randomUUID().replaceAll('-', '')}`;
}

/** Stable device fingerprint for a local VM name (flightctl uses the TPM/CSR key hash). */
export function fingerprintOf(name: string): string {
  let h1 = 0x811c9dc5;
  let out = '';
  for (let round = 0; out.length < 32; round++) {
    for (const ch of `${name}:${round}`) h1 = Math.imul(h1 ^ ch.charCodeAt(0), 16777619) >>> 0;
    out += h1.toString(16).padStart(8, '0');
  }
  return `dev-${out.slice(0, 32)}`;
}

/** Pending requests coming from local VMs running flightctl-agent. */
export function vmRequests(vms: { id: string; name: string }[]): EnrollmentRequest[] {
  const stored = emStore().ers;
  return vms.filter(c => !stored.some(e => e.vm === c.id)).map(c => ({ name: fingerprintOf(c.id), alias: c.name, created: new Date().toISOString(), status: 'Pending' as const, vm: c.id }));
}
