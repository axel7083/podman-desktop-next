/**
 * podman-desktop.compose – built-in Compose extension: groups containers by
 * `com.docker.compose.project` (the original grouping, generalised as a P10
 * grouper) and manages the docker-compose binary (CLI tool with update).
 */
import { faArrowsRotate, faFileLines } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { restartContainer } from '#lib/world.svelte.ts';

const extension: MockExtension = {
  id: 'podman-desktop.compose',
  displayName: 'Compose',
  publisher: 'podman-desktop',
  category: 'Containers & engines',
  description: 'Install and update Compose; group Compose projects in the containers list.',
  version: '1.29.0',
  icon: 'icons/podman-desktop.compose.png',
  builtin: true,
  tags: ['community'],
  pApis: ['P10', 'P17'],
  contributes: {
    groupers: [
      {
        id: 'compose',
        label: 'com.docker.compose.project',
        typeName: 'compose', chip: 'Compose',
        icon: 'icons/podman-desktop.compose.png',
        actions: [
          {
            id: 'restart',
            label: 'Restart project',
            icon: faArrowsRotate,
            run: (_group, containers): void => containers.forEach(c => restartContainer(c.id)),
          },
          {
            id: 'logs',
            label: 'Open logs',
            icon: faFileLines,
            run: (_group, containers): void => {
              if (containers[0]) navigate(`/c/${containers[0].engineId}/containers/${containers[0].id}/logs`);
            },
          },
        ],
      },
    ],
    cliTools: [
      {
        id: 'compose',
        name: 'docker-compose',
        displayName: 'Compose',
        description: 'Compose is a tool for defining and running multi-container applications.',
        version: '2.39.2',
        latest: '2.40.0',
        path: '/home/user/.local/share/containers/podman-desktop/extensions-storage/podman-desktop.compose/bin/docker-compose',
      },
    ],
  },
};

export default extension;
