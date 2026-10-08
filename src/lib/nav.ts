/**
 * Routing helpers and the core-resource model of each connection kind.
 */
import { faCubes, faServer } from '@fortawesome/free-solid-svg-icons';
import { goto } from '$app/navigation';
import { asset, resolve } from '$app/paths';
import type { Component } from 'svelte';

import type { ConnectionKind, ConnectionView, IconRef } from '#lib/ext/types.ts';
import ConfigMapSecretIcon from '#lib/images/ConfigMapSecretIcon.svelte';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';
import DeploymentIcon from '#lib/images/DeploymentIcon.svelte';
import ImageIcon from '#lib/images/ImageIcon.svelte';
import NetworkIcon from '#lib/images/NetworkIcon.svelte';
import NodeIcon from '#lib/images/NodeIcon.svelte';
import PodIcon from '#lib/images/PodIcon.svelte';
import PVCIcon from '#lib/images/PVCIcon.svelte';
import SecretIcon from '#lib/images/SecretIcon.svelte';
import ServiceIcon from '#lib/images/ServiceIcon.svelte';
import VolumeIcon from '#lib/images/VolumeIcon.svelte';

const resolvePath = resolve as unknown as (path: string) => string;
const assetPath = asset as unknown as (path: string) => string;

/** App-absolute path (`/c/x/containers`) → URL with the base path. */
export function href(path: string): string {
  return resolvePath(path.replace(/^\//, ''));
}

/** Static asset (`icons/x.png`) → URL with the base path. */
export function assetUrl(path: string): string {
  return assetPath(path.replace(/^\//, ''));
}

export function navigate(path: string, replace = false): void {
  goto(href(path), { replace }).catch((err: unknown) => console.error(err));
}

/** Resolve an IconRef: strings are static asset paths. */
export function iconSrc(icon: IconRef | undefined): IconRef | undefined {
  if (typeof icon === 'string' && !icon.startsWith('data:') && !/^fa[srb]? /.test(icon)) return assetUrl(icon);
  return icon;
}

/* ------------------------------------------------------------------ */
/* Core resources                                                      */
/* ------------------------------------------------------------------ */

export interface CoreResource {
  id: string;
  label: string;
  /** Singular, for details breadcrumbs. */
  singular: string;
  icon: Component<{ size?: string }> | typeof faCubes;
}

export const CORE_RESOURCES: Record<string, CoreResource> = {
  containers: { id: 'containers', label: 'Containers', singular: 'Container', icon: ContainerIcon },
  pods: { id: 'pods', label: 'Pods', singular: 'Pod', icon: PodIcon },
  images: { id: 'images', label: 'Images', singular: 'Image', icon: ImageIcon },
  volumes: { id: 'volumes', label: 'Volumes', singular: 'Volume', icon: VolumeIcon },
  networks: { id: 'networks', label: 'Networks', singular: 'Network', icon: NetworkIcon },
  secrets: { id: 'secrets', label: 'Secrets', singular: 'Secret', icon: SecretIcon },
  nodes: { id: 'nodes', label: 'Nodes', singular: 'Node', icon: NodeIcon },
  deployments: { id: 'deployments', label: 'Deployments', singular: 'Deployment', icon: DeploymentIcon },
  'k8s-pods': { id: 'k8s-pods', label: 'Pods', singular: 'Pod', icon: PodIcon },
  services: { id: 'services', label: 'Services', singular: 'Service', icon: ServiceIcon },
  configmaps: { id: 'configmaps', label: 'ConfigMaps & Secrets', singular: 'ConfigMap', icon: ConfigMapSecretIcon },
  pvcs: { id: 'pvcs', label: 'PVCs', singular: 'PVC', icon: PVCIcon },
  workloads: { id: 'workloads', label: 'Workloads', singular: 'Workload', icon: faCubes },
  machines: { id: 'machines', label: 'Machines', singular: 'Machine', icon: faServer },
};

/** Kubernetes kinds listed by each kube core resource. */
export const KUBE_KINDS: Record<string, string[]> = {
  nodes: ['Node'],
  deployments: ['Deployment'],
  'k8s-pods': ['Pod'],
  services: ['Service'],
  configmaps: ['ConfigMap', 'Secret'],
  pvcs: ['PersistentVolumeClaim'],
};

const DEFAULT_RESOURCES: Record<ConnectionKind, string[]> = {
  engine: ['containers', 'pods', 'images', 'volumes', 'networks', 'secrets'],
  kubernetes: ['nodes', 'deployments', 'k8s-pods', 'services', 'configmaps', 'pvcs'],
  vm: [],
  service: [],
};

export function coreResourcesOf(conn: ConnectionView): CoreResource[] {
  let ids = conn.resources ?? DEFAULT_RESOURCES[conn.kind];
  if (conn.kind === 'engine' && conn.engineType === 'docker' && !conn.resources) {
    ids = ['containers', 'images', 'volumes', 'networks'];
  }
  return ids.map(id => CORE_RESOURCES[id]).filter(Boolean);
}

/** Landing page when a connection is clicked in the primary nav. */
export function connectionHome(conn: ConnectionView): string {
  if (conn.kind === 'engine' && conn.status === 'started') return `/c/${conn.id}/containers`;
  return `/c/${conn.id}`;
}

export const GROUPS: { id: string; label: string; kinds: ConnectionKind[] }[] = [
  { id: 'engines', label: 'Engines', kinds: ['engine'] },
  { id: 'kubernetes', label: 'Kubernetes', kinds: ['kubernetes'] },
  { id: 'vms', label: 'VMs & services', kinds: ['vm', 'service'] },
];

export const STATUS_DOT_CLASS: Record<string, string> = {
  started: 'bg-[var(--pd-status-running)]',
  starting: 'bg-[var(--pd-status-starting)]',
  creating: 'bg-[var(--pd-status-starting)]',
  stopping: 'bg-[var(--pd-status-starting)]',
  stopped: 'bg-[var(--pd-status-stopped)]',
  error: 'bg-[var(--pd-status-terminated)]',
  unknown: 'bg-[var(--pd-status-unknown)]',
};

export const STATUS_LABEL: Record<string, string> = {
  started: 'Running',
  starting: 'Starting',
  creating: 'Creating',
  stopping: 'Stopping',
  stopped: 'Stopped',
  error: 'Error',
  unknown: 'Unknown',
};

/** Strip the base path from a pathname: `/base/c/x` → `/c/x`. */
export function appPath(pathname: string): string {
  const root = href('/').replace(/\/$/, '');
  const stripped = root && pathname.startsWith(root) ? pathname.slice(root.length) : pathname;
  return stripped || '/';
}
