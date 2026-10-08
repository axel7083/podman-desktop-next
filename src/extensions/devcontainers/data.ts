/**
 * Dev Containers mock data, shaped like the containers.dev spec
 * (`devcontainer.json`), the `@devcontainers/cli` `up` result and the labels
 * the CLI sets on created containers (`devcontainer.local_folder`,
 * `devcontainer.config_file`, `devcontainer.metadata`).
 */
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { Container, TaskStep } from '#lib/world.svelte.ts';
import { ago, hexId, runTask, toast, world } from '#lib/world.svelte.ts';

import { ENGINE } from '../_appdev/services.ts';

export const DEVC_EXT = 'podman-desktop.devcontainers';
export const FOLDER_LABEL = 'devcontainer.local_folder';
export const CONFIG_LABEL = 'devcontainer.config_file';
export const METADATA_LABEL = 'devcontainer.metadata';
export const HOME = '/home/maya';
export const CLI_VERSION = '0.89.0';

export interface DevcontainerJson {
  name: string;
  image?: string;
  build?: { dockerfile: string; context?: string; args?: Record<string, string> };
  features?: Record<string, Record<string, string | boolean>>;
  forwardPorts?: number[];
  postCreateCommand?: string;
  postStartCommand?: string;
  customizations?: { vscode?: { extensions?: string[] } };
  remoteUser?: string;
  updateRemoteUserUID?: boolean;
  runArgs?: string[];
  containerEnv?: Record<string, string>;
  mounts?: string[];
  workspaceFolder?: string;
}

export interface FeatureRef {
  id: string;
  version: string;
  digest: string;
}

export interface Project {
  /** `~/dev/acme-orders` */
  path: string;
  name: string;
  /** Hash in `vsc-<name>-<hash>-features`. */
  hash: string;
  configPath: string;
  json: DevcontainerJson;
  /** Resolved features (OCI artifacts in GHCR). */
  resolved: FeatureRef[];
  /** postCreateCommand duration, seconds. */
  postCreateS: number;
  stack: string;
}

export const PROJECTS: Project[] = [
  {
    path: '~/dev/acme-orders',
    name: 'acme-orders',
    hash: '5f2c9e1b',
    configPath: '.devcontainer/devcontainer.json',
    stack: 'Quarkus 3.33 · Maven',
    postCreateS: 41,
    json: {
      name: 'acme-orders',
      image: 'mcr.microsoft.com/devcontainers/java:21',
      features: {
        'ghcr.io/devcontainers/features/java:1': { version: '21', installMaven: 'true' },
        'ghcr.io/devcontainers/features/node:1': { version: '22' },
        'ghcr.io/devcontainers-extra/features/quarkus-cli:1': {},
      },
      forwardPorts: [8080, 5005],
      postCreateCommand: 'mvn -q dependency:go-offline',
      customizations: { vscode: { extensions: ['redhat.java', 'redhat.vscode-quarkus', 'redhat.vscode-kaoto'] } },
      remoteUser: 'vscode',
      updateRemoteUserUID: true,
      runArgs: ['--userns=keep-id'],
      containerEnv: { QUARKUS_DATASOURCE_JDBC_URL: 'jdbc:postgresql://host.containers.internal:5432/orders' },
      mounts: ['source=${localEnv:HOME}/.m2,target=/home/vscode/.m2,type=bind,Z'],
      workspaceFolder: '/workspaces/acme-orders',
    },
    resolved: [
      { id: 'ghcr.io/devcontainers/features/java:1', version: '1.6.3', digest: 'sha256:4e1a9c' },
      { id: 'ghcr.io/devcontainers/features/node:1', version: '1.6.2', digest: 'sha256:b70f2d' },
      { id: 'ghcr.io/devcontainers-extra/features/quarkus-cli:1', version: '1.0.4', digest: 'sha256:c2e81a' },
    ],
  },
  {
    path: '~/dev/inventory-service',
    name: 'inventory-service',
    hash: 'a81d07c3',
    configPath: '.devcontainer/devcontainer.json',
    stack: 'JBoss EAP 7.4 WAR · Maven',
    postCreateS: 63,
    json: {
      name: 'inventory-service',
      image: 'mcr.microsoft.com/devcontainers/java:1-11-bookworm',
      features: {
        'ghcr.io/devcontainers/features/java:1': { version: '11', installMaven: 'true' },
        'ghcr.io/devcontainers/features/github-cli:1': {},
      },
      forwardPorts: [8080, 9990],
      postCreateCommand: 'mvn -q -DskipTests package',
      remoteUser: 'vscode',
      updateRemoteUserUID: true,
      runArgs: ['--userns=keep-id'],
      workspaceFolder: '/workspaces/inventory-service',
    },
    resolved: [
      { id: 'ghcr.io/devcontainers/features/java:1', version: '1.6.3', digest: 'sha256:4e1a9c' },
      { id: 'ghcr.io/devcontainers/features/github-cli:1', version: '1.0.14', digest: 'sha256:91cd3e' },
    ],
  },
];

/* Read accessors (pure) */

export function absFolder(path: string): string {
  return path.replace(/^~/, HOME);
}

export function basename(path: string): string {
  return path.replace(/\/+$/, '').split('/').pop() ?? path;
}

export function projectByFolder(folder: string): Project | undefined {
  const abs = absFolder(folder);
  return PROJECTS.find(p => absFolder(p.path) === abs);
}

export function containerOf(p: Project): Container | undefined {
  return world.containers.find(c => c.labels[FOLDER_LABEL] === absFolder(p.path) && c.state !== 'DELETING');
}

export function imageName(p: Project): string {
  return `vsc-${p.name}-${p.hash}-features-uid`;
}

export function featureShort(id: string): string {
  return id.split('/').pop() ?? id;
}

export function metadataOf(p: Project): string {
  return JSON.stringify([
    ...Object.keys(p.json.features ?? {}).map(id => ({ id })),
    { remoteUser: p.json.remoteUser },
    ...(p.json.postCreateCommand ? [{ postCreateCommand: p.json.postCreateCommand }] : []),
    ...(p.json.forwardPorts ? [{ forwardPorts: p.json.forwardPorts }] : []),
  ]);
}

export function labelsOf(p: Project): Record<string, string> {
  const folder = absFolder(p.path);
  return { [FOLDER_LABEL]: folder, [CONFIG_LABEL]: `${folder}/${p.configPath}`, [METADATA_LABEL]: metadataOf(p) };
}

export function upCommand(p: Project, removeExisting: boolean): string {
  return `devcontainer up --workspace-folder ${p.path} --docker-path podman${removeExisting ? ' --remove-existing-container' : ''}`;
}

/* Actions (writes) */

function mkDevContainer(p: Project, id: string, keepId: boolean): Container {
  const c = mkContainer(ENGINE, {
    name: `${p.name}_devcontainer`,
    image: `localhost/${imageName(p)}:latest`,
    ports: p.json.forwardPorts ?? [],
    labels: labelsOf(p),
    command: '/bin/sh -c echo Container started; trap "exit 0" 15; exec "$@"; while sleep 1 & wait $!; do :; done -',
    env: [...Object.entries(p.json.containerEnv ?? {}).map(([k, v]) => `${k}=${v}`), 'REMOTE_CONTAINERS=true'],
    upM: 0,
    ageH: 0,
    logs: ['Container started', `[${p.json.remoteUser}] ${p.json.postCreateCommand ?? ''}`, `postCreateCommand finished in ${p.postCreateS} s`],
  });
  c.id = id;
  if (keepId) c.labels['devcontainer.runArgs'] = '--userns=keep-id';
  return c;
}

function ensureImage(p: Project): void {
  const name = `localhost/${imageName(p)}`;
  if (world.images.some(i => i.name === name)) return;
  world.images.push(mkImage(ENGINE, { name, tag: 'latest', sizeMB: p.name === 'acme-orders' ? 1830 : 1410, ageD: 0, base: 'debian-12', labels: { [METADATA_LABEL]: metadataOf(p) } }));
}

/** `devcontainer up`: build the features image, create and start the container. */
export function devcontainerUp(p: Project, opts: { keepId: boolean; removeExisting: boolean }): string {
  const existing = containerOf(p);
  const reuse = !!existing && !opts.removeExisting;
  const id = reuse && existing ? existing.id : `${p.name === 'acme-orders' ? '8c41f0a2d9e7' : hexId(12)}${hexId(52)}`;
  const features = Object.keys(p.json.features ?? {}).map(featureShort).join(', ');
  const steps: TaskStep[] = reuse
    ? [
        { label: `Found existing container ${existing?.name}`, ms: 500, log: [upCommand(p, false), `[1/2] Reusing container ${existing?.name}`] },
        { label: 'Starting container', ms: 1200, log: ['[2/2] Starting container', `postStartCommand: none`] },
      ]
    : [
        {
          label: `Resolving features ${features}`,
          ms: 1200,
          log: [upCommand(p, opts.removeExisting), `[1/4] Resolving features ${features}`, ...p.resolved.map(f => `  ${f.id} -> ${f.version} (${f.digest})`)],
        },
        {
          label: `Building vsc-${p.name}-${p.hash}-features`,
          ms: 2200,
          log: [`[2/4] Building vsc-${p.name}-${p.hash}-features`, `STEP 1/6: FROM ${p.json.image ?? 'Dockerfile'}`, 'STEP 4/6: RUN ./install.sh (java, node, quarkus-cli)', `COMMIT vsc-${p.name}-${p.hash}-features`, `Successfully tagged localhost/${imageName(p)}:latest`],
        },
        {
          label: 'Starting container',
          ms: 1000,
          log: [
            '[3/4] Starting container',
            ...(opts.removeExisting && existing ? [`podman rm -f ${existing.name}`] : []),
            `podman run -d --name ${p.name}_devcontainer ${opts.keepId ? '--userns=keep-id ' : ''}--label ${FOLDER_LABEL}=${absFolder(p.path)} -p ${(p.json.forwardPorts ?? []).map(x => `${x}:${x}`).join(' -p ')} localhost/${imageName(p)}`,
          ],
        },
        {
          label: `postCreateCommand: ${p.json.postCreateCommand ?? 'none'}`,
          ms: 1600,
          log: [`[4/4] postCreateCommand: ${p.json.postCreateCommand ?? 'none'}`, `Done in ${p.postCreateS} s`],
        },
      ];
  steps[steps.length - 1].log?.push(JSON.stringify({ outcome: 'success', containerId: id.slice(0, 12), remoteUser: p.json.remoteUser, remoteWorkspaceFolder: p.json.workspaceFolder }));
  return runTask({
    name: `devcontainer up ${p.name}`,
    ext: DEVC_EXT,
    steps,
    action: { label: `Open ${p.name}_devcontainer`, href: `/c/${ENGINE}/containers/${id}/devcontainer` },
    onDone: (): void => {
      if (reuse) {
        const c = world.containers.find(x => x.id === id);
        if (c) {
          c.state = 'RUNNING';
          c.startedAt = Date.now();
        }
        return;
      }
      world.containers = world.containers.filter(c => c.labels[FOLDER_LABEL] !== absFolder(p.path));
      ensureImage(p);
      world.containers.push(mkDevContainer(p, id, opts.keepId));
    },
  });
}

/** Rebuild in place (`devcontainer up --remove-existing-container`). The mock keeps the container id so the open details page stays valid. */
export function rebuild(c: Container): string | undefined {
  const p = projectByFolder(c.labels[FOLDER_LABEL] ?? '');
  if (!p) return undefined;
  const containerId = c.id;
  return runTask({
    name: `devcontainer up --remove-existing-container ${p.name}`,
    ext: DEVC_EXT,
    steps: [
      { label: `Resolving features ${Object.keys(p.json.features ?? {}).map(featureShort).join(', ')}`, ms: 800, log: [upCommand(p, true)] },
      { label: `Building vsc-${p.name}-${p.hash}-features`, ms: 1600, log: ['Using cache for layers 1-5', `COMMIT vsc-${p.name}-${p.hash}-features`] },
      { label: 'Recreating container', ms: 900, log: [`podman rm -f ${c.name}`, `podman run -d --name ${c.name} --userns=keep-id localhost/${imageName(p)}`] },
      { label: `postCreateCommand: ${p.json.postCreateCommand ?? 'none'}`, ms: 1200, log: [`Done in ${p.postCreateS} s`] },
    ],
    onDone: (): void => {
      const target = world.containers.find(x => x.id === containerId);
      if (!target) return;
      ensureImage(p);
      target.state = 'RUNNING';
      target.created = Date.now();
      target.startedAt = Date.now();
      target.labels = { ...target.labels, ...labelsOf(p) };
    },
  });
}

export function openInVsCode(c: Container): void {
  const folder = c.labels[FOLDER_LABEL] ?? '';
  const p = projectByFolder(folder);
  toast({
    type: 'info',
    title: 'Opening in VS Code',
    body: `vscode://ms-vscode-remote.remote-containers/attach?containerName=${c.name} · ${p?.json.workspaceFolder ?? '/workspaces'}`,
  });
}

/** Seed: the inventory-service dev container from last week, stopped. */
export function seedDevcontainers(): void {
  const p = PROJECTS[1];
  const c = mkContainer(ENGINE, {
    name: `${p.name}_devcontainer`,
    image: `localhost/vsc-${p.name}-${p.hash}-uid:latest`,
    state: 'EXITED',
    ports: p.json.forwardPorts ?? [],
    labels: { [FOLDER_LABEL]: absFolder(p.path), [CONFIG_LABEL]: `${absFolder(p.path)}/${p.configPath}`, [METADATA_LABEL]: metadataOf(p) },
    ageH: 9 * 24,
  });
  c.id = `3b7d2e19ac04${hexId(52)}`;
  c.created = ago({ d: 9 });
  world.containers.push(c);
  world.images.push(mkImage(ENGINE, { name: `localhost/vsc-${p.name}-${p.hash}-uid`, tag: 'latest', sizeMB: 1410, ageD: 9, base: 'debian-12' }));
}
