/**
 * podman-desktop.docker – built-in Docker extension: the Docker Desktop
 * context as a second engine connection (stopped by default).
 */
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { MockExtension } from '#lib/ext/types.ts';

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
    connections: [
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
    ],
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
  seed(world): void {
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
