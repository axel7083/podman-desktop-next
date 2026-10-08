/**
 * podman-desktop.docker – built-in Docker extension: the Docker Desktop
 * context as a second engine connection (stopped by default). In the Windows
 * scenario every live `docker context` is a connection (default,
 * desktop-linux, rancher-desktop, remote prod-ssh), the current context is
 * tracked, and Settings › Docker contexts lists skipped ones (P1, P11).
 */
import { faStar } from '@fortawesome/free-solid-svg-icons';

import { registry } from '#lib/ext/registry.svelte.ts';
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { ConnectionDef, MockExtension, ScenarioContext } from '#lib/ext/types.ts';

import { currentContext, makeCurrent } from './contexts.ts';

/** Windows: one connection per live Docker context (current one flagged). */
function windowsContexts(): ConnectionDef[] {
  const current = currentContext();
  const ctx = (
    id: string,
    name: string,
    context: string,
    endpoint: string,
    status: ConnectionDef['initialStatus'],
    { hint = 'context', capabilities = [], details = {}, version = '28.4.0' }: { hint?: string; capabilities?: string[]; details?: Record<string, string>; version?: string } = {},
  ): ConnectionDef => ({
    id,
    name,
    kind: 'engine',
    providerId: 'docker',
    providerName: 'Docker',
    engineType: 'docker',
    hint: context === current ? 'current' : hint,
    hintTooltip: context === current ? `Current Docker context "${context}"` : `Docker context "${context}"`,
    initialStatus: status,
    endpoint,
    version,
    capabilities: ['docker', ...capabilities],
    details: { Context: context, ...details },
  });
  return [
    ctx('docker-default', 'Docker (default)', 'default', 'npipe:////./pipe/docker_engine', 'started', { details: { Description: 'Current DOCKER_HOST based configuration' } }),
    ctx('docker-desktop', 'desktop-linux', 'desktop-linux', 'npipe:////./pipe/dockerDesktopLinuxEngine', 'started', { details: { 'Docker Desktop': '4.46.0' } }),
    ctx('docker-rancher', 'rancher-desktop', 'rancher-desktop', 'npipe:////./pipe/docker_engine_rd', 'stopped', {
      version: '27.3.1',
      details: { Description: 'Rancher Desktop moby context', 'Rancher Desktop': '1.20.0' },
    }),
    ctx('docker-prod-ssh', 'prod-ssh', 'prod-ssh', 'ssh://ops@build01.acme.internal', 'stopped', {
      hint: 'ssh',
      capabilities: ['remote'],
      version: '28.3.3',
      details: { Description: 'Build host', Transport: 'SSH (preview)', Host: 'build01.acme.internal', User: 'ops' },
    }),
  ];
}

const extension: MockExtension = {
  id: 'podman-desktop.docker',
  displayName: 'Docker',
  publisher: 'podman-desktop',
  description: 'Integration for Docker engines and Docker contexts.',
  version: '1.29.0',
  icon: 'icons/podman-desktop.docker.png',
  builtin: true,
  tags: ['community', 'windows'],
  pApis: ['P1', 'P11'],
  contributes: {
    connections: (s: ScenarioContext): ConnectionDef[] => (s.has('windows') ? windowsContexts() : [
      {
        id: 'docker-desktop',
        name: 'desktop-linux',
        kind: 'engine',
        providerId: 'docker',
        providerName: 'Docker',
        engineType: 'docker',
        hint: 'context',
        hintTooltip: 'Docker context "desktop-linux"',
        initialStatus: 'stopped',
        endpoint: 'unix:///home/user/.docker/run/docker.sock',
        version: '28.4.0',
        details: { Context: 'desktop-linux', 'Docker Desktop': '4.46.0' },
        capabilities: ['docker'],
      },
    ]),
    menus: [
      {
        id: 'docker.context.make-current',
        label: 'Make current Docker context',
        icon: faStar,
        target: 'connection',
        placement: 'details',
        when: ctx => (ctx.conn.engineType === 'docker' || ctx.conn.engineType === 'podman') && ctx.conn.kind === 'engine',
        run: (ctx): void => makeCurrent(ctx.conn, registry.scenarioCtx.has('windows')),
      },
    ],
    tabs: [{ id: 'docker-context', label: 'Docker context', target: 'connection', when: ctx => ctx.conn.engineType === 'docker', component: () => import('./components/DockerContextTab.svelte') }],
    settings: [{ id: 'docker-contexts', title: 'Docker contexts', component: () => import('./components/DockerContexts.svelte') }],
    cliTools: [
      {
        id: 'docker',
        name: 'docker',
        displayName: 'Docker CLI',
        description: 'Docker command-line client, used by Docker contexts.',
        version: '28.4.0',
        path: '/usr/local/bin/docker',
      },
    ],
  },
  seed(world, s): void {
    if (s.has('windows')) {
      world.containers.push(
        mkContainer('docker-default', {
          name: 'sqlserver',
          image: 'mcr.microsoft.com/mssql/server:2022-latest',
          ports: [1433],
          env: ['ACCEPT_EULA=Y', 'MSSQL_PID=Developer'],
          ageH: 50,
          upM: 240,
        }),
      );
      world.images.push(mkImage('docker-default', { name: 'mcr.microsoft.com/mssql/server', tag: '2022-latest', sizeMB: 1580, ageD: 45, base: 'ubuntu-22.04' }));
    }
    const e = 'docker-desktop';
    world.containers.push(
      mkContainer(e, { name: 'jaeger', image: 'docker.io/jaegertracing/all-in-one:1.62', state: 'EXITED', ports: [16686, 4317], ageH: 200 }),
      mkContainer(e, { name: 'mongo-dev', image: 'docker.io/library/mongo:8.0', state: 'EXITED', ports: [27017], ageH: 340 }),
    );
    world.images.push(
      mkImage(e, { name: 'docker.io/jaegertracing/all-in-one', tag: '1.62', sizeMB: 96, ageD: 90 }),
      mkImage(e, { name: 'docker.io/library/mongo', tag: '8.0', sizeMB: 854, ageD: 60, base: 'ubuntu-24.04' }),
    );
  },
};

export default extension;
