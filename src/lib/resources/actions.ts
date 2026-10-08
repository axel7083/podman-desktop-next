/**
 * Core + contributed actions for each resource type (PD ContainerActions et al.).
 * Contributed menus (MenuDef) are merged in by placement: `row` → inline
 * buttons, `kebab` → overflow menu, `details` → details header.
 */
import {
  faAlignLeft,
  faArrowsRotate,
  faDownload,
  faExternalLinkSquareAlt,
  faFileCode,
  faPlay,
  faRocket,
  faStop,
  faTerminal,
  faTrash,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, MenuDef, ResourceContext, ResourceTarget } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { ActionsCellData, ActionSpec } from '#lib/table/types.ts';
import {
  type Container,
  type ContainerImage,
  type KubeObject,
  deleteContainer,
  deleteImage,
  deletePod,
  deleteVolume,
  type Pod,
  restartContainer,
  runTask,
  shortImage,
  startContainer,
  startPod,
  stopContainer,
  stopPod,
  toast,
  type Volume,
} from '#lib/world.svelte.ts';

function contributed(target: ResourceTarget, conn: ConnectionView | undefined, resource: ResourceContext['resource'], placement: MenuDef['placement']): ActionSpec[] {
  if (!conn) return [];
  const ctx: ResourceContext = { target, conn, resource };
  return registry.menusFor(ctx, placement).map(m => ({
    title: m.label,
    icon: m.icon ?? faRocket,
    onClick: (): void => m.run(ctx),
    ext: m.ext,
  }));
}

export function containerActions(c: Container, detailed = false): ActionsCellData {
  const conn = registry.getConnection(c.engineId);
  const running = c.state === 'RUNNING' || c.state === 'STOPPING';
  const base = `/c/${c.engineId}/containers/${c.id}`;
  const buttons: ActionSpec[] = [
    { title: 'Start Container', icon: faPlay, onClick: (): void => startContainer(c.id), hidden: running, inProgress: c.state === 'STARTING' },
    { title: 'Stop Container', icon: faStop, onClick: (): void => stopContainer(c.id), hidden: !running, inProgress: c.state === 'STOPPING' },
    {
      title: 'Delete Container',
      icon: faTrash,
      inProgress: c.state === 'DELETING',
      onClick: (): void => withConfirmation(() => deleteContainer(c.id), `delete container ${c.name}`, 'Delete container?'),
    },
    ...contributed('container', conn, c, 'row'),
  ];
  const menu: ActionSpec[] = [
    { title: 'Open Logs', icon: faAlignLeft, onClick: (): void => navigate(`${base}/logs`), hidden: detailed },
    {
      title: 'Generate Kube',
      icon: faFileCode,
      onClick: (): void => navigate(`${base}/inspect`),
      hidden: conn?.engineType !== 'podman' || !!c.labels['com.docker.compose.project'],
    },
    {
      title: 'Deploy to Kubernetes',
      icon: faRocket,
      hidden: conn?.engineType !== 'podman',
      onClick: (): void => {
        runTask({
          name: `Deploy ${c.name} to Kubernetes`,
          steps: [
            { label: 'Generating Kubernetes YAML', ms: 800 },
            { label: 'Creating pod on current context', ms: 1600 },
          ],
        });
      },
    },
    {
      title: 'Open Browser',
      icon: faExternalLinkSquareAlt,
      enabled: c.state === 'RUNNING' && c.ports.length > 0,
      hidden: c.state !== 'RUNNING',
      onClick: (): void => toast({ type: 'info', title: `Opening http://localhost:${c.ports[0]?.host}` }),
    },
    { title: 'Open Terminal', icon: faTerminal, onClick: (): void => navigate(`${base}/terminal`), hidden: c.state !== 'RUNNING' || detailed },
    { title: 'Restart Container', icon: faArrowsRotate, onClick: (): void => restartContainer(c.id) },
    {
      title: 'Export Container',
      icon: faDownload,
      onClick: (): void => {
        runTask({ name: `Export ${c.name}`, steps: [{ label: 'Writing tar archive', ms: 1500 }] });
      },
    },
    ...contributed('container', conn, c, 'kebab'),
    ...(detailed ? contributed('container', conn, c, 'details') : []),
  ];
  return { buttons, menu, detailed };
}

export function groupActions(containers: Container[], podId?: string): ActionsCellData {
  const anyRunning = containers.some(c => c.state === 'RUNNING');
  const ids = containers.map(c => c.id);
  return {
    buttons: [
      {
        title: podId ? 'Start Pod' : 'Start all',
        icon: faPlay,
        hidden: anyRunning,
        onClick: (): void => (podId ? startPod(podId) : ids.forEach(startContainer)),
      },
      {
        title: podId ? 'Stop Pod' : 'Stop all',
        icon: faStop,
        hidden: !anyRunning,
        onClick: (): void => (podId ? stopPod(podId) : ids.forEach(stopContainer)),
      },
      {
        title: podId ? 'Delete Pod' : 'Delete all',
        icon: faTrash,
        onClick: (): void =>
          withConfirmation(
            () => (podId ? deletePod(podId) : ids.forEach(deleteContainer)),
            podId ? 'delete this pod' : `delete ${ids.length} containers`,
            podId ? 'Delete pod?' : 'Delete containers?',
          ),
      },
    ],
    menu: [{ title: 'Restart all', icon: faArrowsRotate, onClick: (): void => ids.forEach(restartContainer) }],
  };
}

export function podActions(p: Pod, containers: Container[], detailed = false): ActionsCellData {
  const conn = registry.getConnection(p.engineId);
  const base = groupActions(containers, p.id);
  return {
    buttons: [...base.buttons, ...contributed('pod', conn, p, 'row')],
    menu: [
      { title: 'Open Logs', icon: faAlignLeft, onClick: (): void => navigate(`/c/${p.engineId}/pods/${p.id}/logs`), hidden: detailed },
      ...base.menu,
      ...contributed('pod', conn, p, 'kebab'),
    ],
    detailed,
  };
}

export function imageActions(i: ContainerImage, inUse: boolean, detailed = false): ActionsCellData {
  const conn = registry.getConnection(i.engineId);
  const ref = `${shortImage(i.name)}:${i.tag}`;
  return {
    buttons: [
      {
        title: 'Run Image',
        icon: faPlay,
        onClick: (): void => {
          runTask({ name: `Run ${ref}`, steps: [{ label: 'Creating container', ms: 900 }, { label: 'Starting container', ms: 700 }] });
        },
      },
      {
        title: 'Delete Image',
        icon: faTrash,
        enabled: !inUse,
        onClick: (): void => withConfirmation(() => deleteImage(i.id), `delete image ${ref}`, 'Delete image?'),
      },
      ...contributed('image', conn, i, 'row'),
    ],
    menu: [
      {
        title: 'Push Image',
        icon: faUpload,
        onClick: (): void => {
          runTask({ name: `Push ${ref}`, steps: [{ label: 'Pushing layers', ms: 2200 }, { label: 'Writing manifest', ms: 400 }] });
        },
      },
      {
        title: 'Save Image',
        icon: faDownload,
        onClick: (): void => {
          runTask({ name: `Save ${ref}`, steps: [{ label: 'Writing archive', ms: 1500 }] });
        },
      },
      ...contributed('image', conn, i, 'kebab'),
      ...(detailed ? contributed('image', conn, i, 'details') : []),
    ],
    detailed,
  };
}

export function volumeActions(v: Volume, inUse: boolean, detailed = false): ActionsCellData {
  const conn = registry.getConnection(v.engineId);
  return {
    buttons: [
      {
        title: 'Delete Volume',
        icon: faTrash,
        enabled: !inUse,
        onClick: (): void => withConfirmation(() => deleteVolume(v.name), `delete volume ${v.name}`, 'Delete volume?'),
      },
      ...contributed('volume', conn, v, 'row'),
    ],
    menu: contributed('volume', conn, v, 'kebab'),
    detailed,
  };
}

/**
 * Contributed actions on a Kubernetes object (P4 Kubernetes menus):
 * `row` → inline buttons, `kebab` → overflow; on details pages `details` too.
 * The caller adds its own core actions (e.g. Delete).
 */
export function kubeActions(conn: ConnectionView, o: KubeObject, detailed = false): ActionsCellData {
  return {
    buttons: [...contributed('kube-resource', conn, o, 'row'), ...(detailed ? contributed('kube-resource', conn, o, 'details') : [])],
    menu: contributed('kube-resource', conn, o, 'kebab'),
    detailed,
  };
}
