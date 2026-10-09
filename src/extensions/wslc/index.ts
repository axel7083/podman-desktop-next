/**
 * podman-desktop.wslc – WSL Containers (wslc.exe, GA in WSL 3.0.1): one engine
 * connection per WSLC session (P11 engine type `wslc`, no pods/secrets), a
 * "Create WSLC session" factory, the wslc CLI, a capability matrix tab, a
 * "Recreate on Podman" container action and a dashboard card (P1, P11).
 */
import { faArrowRightArrowLeft, faTerminal } from '@fortawesome/free-solid-svg-icons';

import { openDialog } from '#lib/dialog.svelte.ts';
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { ConnectionDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { type Container, hexId, toast } from '#lib/world.svelte.ts';

import CapabilitiesTab from './components/CapabilitiesTab.svelte';
import RecreateDialog from './components/RecreateDialog.svelte';
import { DEFAULT_VHD, WSL_INFO, WSLC_ID } from './data.ts';

const RESOURCES = ['containers', 'images', 'volumes', 'networks'];

function session(name: string, o: { cpus: number; memoryGB: number; vhd: string; gpu: boolean; status: ConnectionDef['initialStatus'] }): ConnectionDef {
  return {
    id: `wslc-${name}`,
    name: `WSLC ${name}`,
    kind: 'engine',
    providerId: 'wslc',
    providerName: 'WSL Containers',
    engineType: 'wslc',
    hint: o.gpu ? 'GPU' : undefined,
    hintTooltip: o.gpu ? 'GPU passthrough via CDI /dev/dxg' : undefined,
    initialStatus: o.status,
    endpoint: `wslc://session/${name}`,
    version: WSL_INFO.version,
    details: {
      Session: name,
      vCPU: String(o.cpus),
      Memory: `${o.memoryGB} GB`,
      Storage: o.vhd,
      ...(o.gpu ? { GPU: 'Enabled (CDI /dev/dxg)' } : {}),
      WSL: WSL_INFO.version,
      Networking: 'Consommé (VPN friendly)',
      API: 'CLI-driven (no Docker socket)',
    },
    capabilities: ['wslc', 'build', ...(o.gpu ? ['gpu'] : [])],
    resources: RESOURCES,
  };
}

const extension: MockExtension = {
  id: WSLC_ID,
  displayName: 'WSL Containers',
  publisher: 'podman-desktop',
  category: 'Containers & engines',
  description: 'See and manage the Linux containers you run with the built-in wslc engine of WSL, next to your Podman machines.',
  version: '0.1.0',
  icon: 'icons/podman-desktop.wslc.png',
  tags: ['windows'],
  pApis: ['P1', 'P11'],
  contributes: {
    connections: [
      session('default', { cpus: 2, memoryGB: 2, vhd: DEFAULT_VHD, gpu: false, status: 'started' }),
      session('ai-gpu', { cpus: 8, memoryGB: 16, vhd: 'C:\\Users\\alice\\AppData\\Local\\wslc\\sessions\\ai-gpu\\session.vhdx', gpu: true, status: 'stopped' }),
    ],
    connectionFactories: [
      {
        id: 'wslc-session',
        label: 'Create WSLC session',
        providerId: 'wslc',
        kind: 'engine',
        description: 'A WSL Containers session: its own lightweight Hyper-V VM with images, containers and volumes.',
        fields: [
          { id: 'name', label: 'Session name', type: 'text', default: 'dev', required: true },
          { id: 'cpus', label: 'CPU(s)', type: 'slider', default: 2, min: 1, max: 16, unit: 'vCPU' },
          { id: 'memory', label: 'Memory', type: 'slider', default: 2, min: 1, max: 32, unit: 'GB' },
          {
            id: 'storage',
            label: 'Storage path',
            type: 'file',
            placeholder: 'C:\\Users\\alice\\AppData\\Local\\wslc\\sessions',
            description: 'Folder holding the session VHD (default 32 GB).',
          },
          { id: 'gpu', label: 'Enable GPU (CDI /dev/dxg)', type: 'checkbox', default: false },
        ],
        steps: v => [
          { label: 'Checking WSL components', ms: 700, log: [`WSL version: ${WSL_INFO.version}`, 'WslcService.GetMissingComponents(): none'] },
          { label: `Creating session ${String(v.name)}`, ms: 1800, log: [`wslc session create ${String(v.name)} --cpus ${String(v.cpus)} --memory ${String(v.memory)}GB`] },
          { label: 'Starting session VM', ms: 1500, log: ['wslcsession.exe started'] },
        ],
        createConnection: (v): ConnectionDef =>
          session(String(v.name), {
            cpus: Number(v.cpus),
            memoryGB: Number(v.memory),
            vhd: `${String(v.storage || 'C:\\Users\\alice\\AppData\\Local\\wslc\\sessions')}\\${String(v.name)}\\session.vhdx`,
            gpu: !!v.gpu,
            status: 'started',
          }),
        onCreated: (world, conn): void => {
          world.networks.push({ id: hexId(64), name: 'default', engineId: conn.id, driver: 'nat', subnet: '172.30.0.0/16', created: Date.now() });
        },
      },
    ],
    tabs: [
      {
        id: 'capabilities',
        label: 'Capabilities',
        target: 'connection',
        when: ctx => ['wslc', 'apple', 'podman', 'docker'].includes(ctx.conn.engineType ?? ''),
        component: CapabilitiesTab,
      },
    ],
    menus: [
      {
        id: 'wslc.recreate-on-podman',
        label: 'Recreate on Podman',
        icon: faArrowRightArrowLeft,
        target: 'container',
        placement: 'kebab',
        when: ctx => ctx.conn.engineType === 'wslc',
        run: (ctx): void => openDialog(RecreateDialog, { container: ctx.resource as Container }),
      },
      {
        id: 'wslc.open-terminal',
        label: 'Open in Windows Terminal',
        icon: faTerminal,
        target: 'container',
        placement: 'kebab',
        when: ctx => ctx.conn.engineType === 'wslc',
        run: (ctx): void =>
          toast({ type: 'info', title: 'Opening Windows Terminal', body: `wslc exec -it ${(ctx.resource as Container).name} sh` }),
      },
    ],
    cliTools: [
      {
        id: 'wslc',
        name: 'wslc',
        displayName: 'WSL Containers CLI',
        description: 'wslc.exe (alias container.exe) ships with WSL and drives WSLC sessions, containers, images, volumes and networks.',
        version: WSL_INFO.version,
        latest: WSL_INFO.version,
        path: 'C:\\Program Files\\WSL\\wslc.exe',
      },
    ],
    dashboardCards: [{ id: 'wslc', title: 'WSL Containers', component: () => import('./components/WslcCard.svelte') }],
    commands: [
      { id: 'wslc.session.create', title: 'Create WSLC session', category: 'WSL Containers', run: (): void => navigate('/settings/create/wslc-session') },
      { id: 'wslc.open', title: 'Open WSLC default containers', category: 'WSL Containers', run: (): void => navigate('/c/wslc-default/containers') },
    ],
  },
  seed(world): void {
    const e = 'wslc-default';
    world.containers.push(
      mkContainer(e, {
        name: 'web',
        image: 'docker.io/library/nginx:1.29',
        ports: [[8080, 80]],
        env: ['NGINX_ENTRYPOINT_QUIET_LOGS=1'],
        ageH: 3,
        upM: 170,
        logs: ['/docker-entrypoint.sh: Configuration complete; ready for start up', '2026/10/08 08:02:12 [notice] 1#1: nginx/1.29.1', '172.30.0.1 - - [08/Oct/2026:08:14:03 +0000] "GET / HTTP/1.1" 200 615'],
      }),
      mkContainer(e, {
        name: 'pg',
        image: 'docker.io/library/postgres:16',
        ports: [[5433, 5432]],
        env: ['POSTGRES_USER=orders', 'POSTGRES_PASSWORD=••••••', 'POSTGRES_DB=orders'],
        ageH: 3,
        upM: 165,
        logs: ['PostgreSQL init process complete; ready for start up.', 'LOG:  database system is ready to accept connections'],
      }),
      mkContainer(e, { name: 'hello', image: 'docker.io/library/alpine:latest', state: 'EXITED', command: 'echo hello from wslc', ageH: 4 }),
    );
    world.images.push(
      mkImage(e, { name: 'docker.io/library/nginx', tag: '1.29', sizeMB: 192, ageD: 20, base: 'debian-12' }),
      mkImage(e, { name: 'docker.io/library/postgres', tag: '16', sizeMB: 438, ageD: 25, base: 'debian-12' }),
      mkImage(e, { name: 'docker.io/library/alpine', tag: 'latest', sizeMB: 8, ageD: 60, base: 'alpine-3.22' }),
    );
    world.volumes.push({ name: 'pgdata', engineId: e, size: 4 * 1000 * 1000 * 1000, created: Date.now() - 3 * 3600_000, mountpoint: '/var/lib/wslc/volumes/pgdata', driver: 'vhd' });
    world.networks.push({ id: hexId(64), name: 'default', engineId: e, driver: 'nat', subnet: '172.30.0.0/16', created: Date.now() - 3 * 3600_000 });
  },
};

export default extension;
