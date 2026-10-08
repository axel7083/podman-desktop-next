/**
 * podman-desktop.podman – built-in Podman extension.
 * Contributes the Podman machine engine connection(s), the "Create Podman
 * machine" factory (P12/P18), the podman CLI, settings and the seed world.
 */
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';

import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { ConnectionDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { ago, hexId, MB, runTask } from '#lib/world.svelte.ts';

import PodmanUpdateCard from './PodmanUpdateCard.svelte';

const ID = 'podman-desktop.podman';
export const PODMAN_MACHINE = 'podman-machine-default';

const extension: MockExtension = {
  id: ID,
  displayName: 'Podman',
  publisher: 'podman-desktop',
  description: 'Integration for Podman: machines, containers, pods, images, volumes and the podman CLI.',
  version: '1.29.0',
  icon: 'icons/podman-desktop.podman.png',
  builtin: true,
  tags: ['community', 'rhel', 'windows'],
  pApis: ['P1', 'P11', 'P12', 'P18'],
  contributes: {
    connections: (s): ConnectionDef[] => [
      {
        id: PODMAN_MACHINE,
        name: 'podman-machine-default',
        kind: 'engine',
        providerId: 'podman',
        providerName: 'Podman',
        engineType: 'podman',
        hint: s.has('windows') ? 'WSL' : undefined,
        hintTooltip: s.has('windows') ? 'Runs in WSL 2 distribution podman-machine-default' : undefined,
        initialStatus: 'started',
        endpoint: s.has('windows')
          ? 'npipe:////./pipe/podman-machine-default'
          : 'unix:///run/user/1000/podman/podman-machine-default-api.sock',
        version: '5.6.2',
        details: {
          'VM type': s.has('windows') ? 'WSL' : 'applehv',
          CPUs: '4',
          Memory: '4 GiB',
          Disk: '100 GiB',
          Mode: 'rootless',
        },
        capabilities: ['podman', 'machine'],
      },
    ],
    connectionFactories: [
      {
        id: 'podman-machine',
        label: 'Create Podman machine',
        providerId: 'podman',
        kind: 'engine',
        description: 'A Linux virtual machine running the Podman engine.',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'podman-machine-dev', required: true },
          { id: 'cpus', label: 'CPU(s)', type: 'slider', default: 4, min: 1, max: 12, unit: 'cores' },
          { id: 'memory', label: 'Memory', type: 'slider', default: 4, min: 1, max: 32, unit: 'GiB' },
          { id: 'disk', label: 'Disk size', type: 'slider', default: 100, min: 10, max: 500, unit: 'GiB' },
          {
            id: 'image',
            label: 'Image path (optional)',
            type: 'file',
            placeholder: 'Leave empty to use the default Fedora CoreOS image',
            description: 'A custom image or WSL tarball, e.g. a RHEL for WSL image (P18).',
          },
          { id: 'rootful', label: 'Machine with root privileges', type: 'checkbox', default: false },
          {
            id: 'provider',
            label: 'Provider type',
            type: 'select',
            default: 'applehv',
            options: [
              { value: 'applehv', label: 'Apple HyperVisor' },
              { value: 'libkrun', label: 'GPU enabled (LibKrun)' },
              { value: 'wsl', label: 'WSL' },
              { value: 'hyperv', label: 'Hyper-V' },
            ],
          },
          { id: 'start', label: 'Start the machine now', type: 'checkbox', default: true },
        ],
        steps: v => [
          {
            label: v.image ? `Copying image ${String(v.image).split(/[\\/]/).pop()}` : 'Downloading Fedora CoreOS image',
            ms: 2500,
            log: ['Looking up Podman Machine image at quay.io/podman/machine-os:5.6 to create VM'],
          },
          { label: `Initializing ${String(v.name)}`, ms: 1800, log: [`Machine init complete`] },
          ...(v.start ? [{ label: `Starting ${String(v.name)}`, ms: 2000, log: ['API forwarding listening on: /run/user/1000/podman/podman.sock'] }] : []),
        ],
        createConnection: (v): ConnectionDef => ({
          id: String(v.name),
          name: String(v.name),
          kind: 'engine',
          providerId: 'podman',
          providerName: 'Podman',
          engineType: 'podman',
          hint: v.provider === 'wsl' ? 'WSL' : undefined,
          initialStatus: v.start ? 'started' : 'stopped',
          endpoint: `unix:///run/user/1000/podman/${String(v.name)}-api.sock`,
          version: '5.6.2',
          details: {
            'VM type': String(v.provider),
            CPUs: String(v.cpus),
            Memory: `${String(v.memory)} GiB`,
            Disk: `${String(v.disk)} GiB`,
            Mode: v.rootful ? 'rootful' : 'rootless',
            ...(v.image ? { Image: String(v.image) } : {}),
          },
          capabilities: ['podman', 'machine'],
        }),
        onCreated: (world, conn): void => {
          world.images.push(mkImage(conn.id, { name: 'quay.io/podman/hello', tag: 'latest', sizeMB: 0.8, ageD: 40 }));
          world.networks.push({ id: hexId(64), name: 'podman', engineId: conn.id, driver: 'bridge', subnet: '10.88.0.0/16', created: Date.now() });
        },
      },
    ],
    cliTools: [
      {
        id: 'podman',
        name: 'podman',
        displayName: 'Podman',
        description: 'Podman CLI to manage containers, pods and machines.',
        version: '5.6.2',
        latest: '5.6.2',
        path: '/usr/local/bin/podman',
      },
    ],
    settings: [
      {
        id: 'podman',
        title: 'Podman',
        properties: [
          { id: 'podman.binary.path', title: 'Path to Podman binary', type: 'string', default: '', description: 'Custom path to the podman executable (leave empty to auto-detect).' },
          { id: 'podman.setting.dockerCompatibility', title: 'Docker compatibility', type: 'boolean', default: true, description: 'Expose the Podman socket as the Docker socket.' },
          { id: 'podman.machine.autoStart', title: 'Start the default machine on login', type: 'boolean', default: true },
        ],
      },
    ],
    dashboardCards: [{ id: 'podman-update', title: 'Podman', component: PodmanUpdateCard }],
    commands: [
      {
        id: 'podman.machine.create',
        title: 'Create Podman machine',
        category: 'Podman',
        run: (): void => navigate('/settings/create/podman-machine'),
      },
      {
        id: 'podman.prune',
        title: 'Prune unused images and stopped containers',
        category: 'Podman',
        icon: faArrowsRotate,
        run: (): void => {
          runTask({ name: 'Prune unused resources', ext: ID, steps: [{ label: 'Removing stopped containers', ms: 800 }, { label: 'Removing dangling images', ms: 1000 }] });
        },
      },
    ],
    onboarding: [
      {
        id: 'podman-setup',
        title: 'Podman setup',
        steps: [
          { title: 'Check Podman installation', description: 'Podman 5.6.2 is installed.' },
          { title: 'Create a Podman machine', description: 'Run containers in a Linux VM.' },
        ],
      },
    ],
  },
  seed(world): void {
    const e = PODMAN_MACHINE;
    const compose = (svc: string): Record<string, string> => ({
      'com.docker.compose.project': 'bookinfo',
      'com.docker.compose.service': svc,
      'com.docker.compose.version': '2.39.2',
      'com.docker.compose.project.working_dir': '/home/user/src/bookinfo',
    });
    const podId = hexId(64);
    const infra = mkContainer(e, { name: `${podId.slice(0, 12)}-infra`, image: 'localhost/podman-pause:5.6.2-1757000000', podId, ports: [8888], upM: 240 });
    const backend = mkContainer(e, {
      name: 'backend-pod-api',
      image: 'quay.io/redhat-developer/quarkus-todo:1.4',
      podId,
      ports: [8888],
      upM: 240,
      command: 'java -jar /deployments/quarkus-run.jar',
      env: ['QUARKUS_HTTP_PORT=8888', 'JAVA_OPTS=-Xmx256m'],
    });
    world.pods.push({ id: podId, name: 'backend-pod', engineId: e, status: 'RUNNING', created: ago({ h: 26 }), containerIds: [infra.id, backend.id] });
    world.containers.push(
      mkContainer(e, { name: 'bookinfo-productpage-1', image: 'docker.io/istio/examples-bookinfo-productpage-v1:1.20.2', labels: compose('productpage'), ports: [[9080, 9080]], upM: 52 }),
      mkContainer(e, { name: 'bookinfo-details-1', image: 'docker.io/istio/examples-bookinfo-details-v1:1.20.2', labels: compose('details'), upM: 52 }),
      mkContainer(e, { name: 'bookinfo-reviews-1', image: 'docker.io/istio/examples-bookinfo-reviews-v1:1.20.2', labels: compose('reviews'), upM: 52 }),
      mkContainer(e, {
        name: 'pg-dev',
        image: 'docker.io/library/postgres:16.4',
        ports: [5432],
        env: ['POSTGRES_USER=app', 'POSTGRES_DB=inventory', 'PGDATA=/var/lib/postgresql/data'],
        command: 'postgres',
        upM: 300,
      }),
      mkContainer(e, { name: 'web-nginx', image: 'docker.io/library/nginx:1.27-alpine', ports: [[8080, 80]], command: 'nginx -g daemon off;', upM: 18 }),
      mkContainer(e, { name: 'httpd-ubi', image: 'registry.access.redhat.com/ubi9/httpd-24:latest', state: 'EXITED', ports: [[8443, 8443]], ageH: 70 }),
      mkContainer(e, { name: 'cache-redis', image: 'quay.io/sclorg/redis-7-c9s:latest', ports: [6379], upM: 300 }),
      mkContainer(e, { name: 'hello_podman', image: 'quay.io/podman/hello:latest', state: 'EXITED', ageH: 120 }),
      infra,
      backend,
    );
    world.images.push(
      mkImage(e, { name: 'docker.io/istio/examples-bookinfo-productpage-v1', tag: '1.20.2', sizeMB: 213, ageD: 120, base: 'debian-12' }),
      mkImage(e, { name: 'docker.io/istio/examples-bookinfo-details-v1', tag: '1.20.2', sizeMB: 179, ageD: 120, base: 'debian-12' }),
      mkImage(e, { name: 'docker.io/istio/examples-bookinfo-reviews-v1', tag: '1.20.2', sizeMB: 481, ageD: 120, base: 'ubi9' }),
      mkImage(e, { name: 'docker.io/library/postgres', tag: '16.4', sizeMB: 453, ageD: 45, base: 'debian-12', packages: [{ name: 'openssl', version: '3.0.15-1~deb12u1' }, { name: 'libxml2', version: '2.9.14+dfsg-1.3' }] }),
      mkImage(e, { name: 'docker.io/library/nginx', tag: '1.27-alpine', sizeMB: 48.4, ageD: 21, base: 'alpine-3.20' }),
      mkImage(e, { name: 'registry.access.redhat.com/ubi9/httpd-24', tag: 'latest', sizeMB: 356, ageD: 9, base: 'ubi9', labels: { vendor: 'Red Hat, Inc.', 'com.redhat.component': 'httpd-24-container' } }),
      mkImage(e, { name: 'quay.io/sclorg/redis-7-c9s', tag: 'latest', sizeMB: 287, ageD: 14, base: 'centos-stream-9' }),
      mkImage(e, { name: 'quay.io/podman/hello', tag: 'latest', sizeMB: 0.8, ageD: 200 }),
      mkImage(e, { name: 'quay.io/redhat-developer/quarkus-todo', tag: '1.4', sizeMB: 412, ageD: 3, base: 'ubi9', labels: { 'io.quarkus.version': '3.27.0' } }),
      mkImage(e, { name: 'localhost/podman-pause', tag: '5.6.2-1757000000', sizeMB: 0.7, ageD: 30 }),
      mkImage(e, { name: 'registry.access.redhat.com/ubi9/ubi-minimal', tag: '9.6', sizeMB: 101, ageD: 12, base: 'ubi9' }),
      mkImage(e, { name: 'docker.io/kindest/node', tag: 'v1.34.0', sizeMB: 1056, ageD: 30, base: 'debian-12' }),
    );
    world.volumes.push(
      { name: 'pgdata', engineId: e, size: 64 * MB, created: ago({ d: 12 }), mountpoint: '/var/home/core/.local/share/containers/storage/volumes/pgdata/_data' },
      { name: 'bookinfo_ratings-data', engineId: e, size: 3 * MB, created: ago({ d: 2 }), mountpoint: '/var/home/core/.local/share/containers/storage/volumes/bookinfo_ratings-data/_data' },
      { name: hexId(64), engineId: e, size: 12 * MB, created: ago({ d: 30 }), mountpoint: '/var/home/core/.local/share/containers/storage/volumes/anon/_data' },
    );
    world.networks.push(
      { id: hexId(64), name: 'podman', engineId: e, driver: 'bridge', subnet: '10.88.0.0/16', created: ago({ d: 60 }) },
      { id: hexId(64), name: 'bookinfo_default', engineId: e, driver: 'bridge', subnet: '10.89.0.0/24', created: ago({ d: 2 }) },
      { id: hexId(64), name: 'kind', engineId: e, driver: 'bridge', subnet: '10.89.1.0/24', created: ago({ d: 5 }) },
    );
    world.secrets.push(
      { id: hexId(25), name: 'pg-password', engineId: e, created: ago({ d: 12 }), driver: 'file' },
      { id: hexId(25), name: 'registry-token', engineId: e, created: ago({ d: 4 }), driver: 'file' },
    );
    world.notifications.push({
      id: 'podman-update',
      title: 'Podman 5.6.2 is installed',
      body: 'podman-machine-default was updated to machine-os 5.6.',
      type: 'info',
      created: ago({ h: 3 }),
      read: false,
    });
  },
};

export default extension;
