/**
 * podman-desktop.testcontainers (proposed) – Podman as a first-class
 * Testcontainers runtime: sessions grouped in the containers list (P10,
 * keyed by `org.testcontainers.sessionId`), an environment checklist and
 * leaked-container cleanup (P3), and a status-bar session counter (P17).
 */
import { faBroom, faCopy, faSkull } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { deleteContainer, toast } from '#lib/world.svelte.ts';

import TestcontainersTool from './components/TestcontainersTool.svelte';
import { RYUK, SESSION, sessionMeta, sessions, TC_EXT, tcContainer } from './data.ts';

const extension: MockExtension = {
  id: TC_EXT,
  displayName: 'Testcontainers',
  publisher: 'podman-desktop',
  description: 'Make Podman a first-class Testcontainers runtime: socket setup, test sessions, Ryuk and reusable containers.',
  version: '0.2.0',
  icon: 'icons/podman-desktop.testcontainers.svg',
  tags: ['appdev'],
  pApis: ['P3', 'P10', 'P17'],
  contributes: {
    groupers: [
      {
        id: 'session',
        label: SESSION,
        typeName: 'Testcontainers',
        icon: 'icons/podman-desktop.testcontainers.svg',
        groupName: id => `session ${id.slice(0, 8)}`,
        groupDetails: (id, containers) => {
          const meta = sessionMeta(id);
          const ryuk = containers.filter(c => c.labels[RYUK]).length;
          return [meta ? `${meta.command} · ${meta.project}` : 'java · 2.0.5', ...(ryuk ? [`+${ryuk} infra (Ryuk)`] : [])];
        },
        actions: [
          {
            id: 'kill',
            label: 'Kill session',
            icon: faSkull,
            run: (id, containers): void => {
              containers.forEach(c => deleteContainer(c.id));
              toast({ type: 'success', title: `Session ${id.slice(0, 8)} ended`, body: `${containers.length} containers removed` });
            },
          },
          {
            id: 'env',
            label: 'Copy env exports',
            icon: faCopy,
            run: (): void => toast({ type: 'success', title: 'Copied DOCKER_HOST and TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE exports' }),
          },
        ],
      },
    ],
    tools: [{ id: 'testcontainers', label: 'Testcontainers', icon: 'icons/podman-desktop.testcontainers.svg', component: TestcontainersTool, badge: () => sessions().filter(s => s.state === 'leaked').length || undefined }],
    statusItems: [{ id: 'tc-sessions', align: 'right', icon: 'icons/podman-desktop.testcontainers.svg', text: () => `TC: ${sessions().filter(s => s.state === 'active').length} sessions`, tooltip: 'Active Testcontainers sessions', command: 'testcontainers.open' }],
    commands: [
      { id: 'testcontainers.open', title: 'Open Testcontainers sessions', category: 'Testcontainers', run: (): void => navigate('/tools/testcontainers') },
      { id: 'testcontainers.clean', title: 'Clean leaked Testcontainers containers', category: 'Testcontainers', icon: faBroom, run: (): void => navigate('/tools/testcontainers') },
    ],
  },
  seed(world): void {
    const verify = 'e4b19f27-5c3a-4d0e-9a61-2f8d7c3b1a90';
    const leaked = '7c1d0e55-03aa-4b2e-8f19-6e4a2b9d0c31';
    world.containers.push(
      tcContainer(verify, { name: 'testcontainers-ryuk-e4b19f27', image: 'docker.io/testcontainers/ryuk:0.14.0', ports: [[32769, 8080]], ryuk: true, upM: 3 }),
      tcContainer(verify, { name: 'vigilant_kowalevski', image: 'docker.io/library/postgres:18', ports: [[32801, 5432]], upM: 3 }),
      tcContainer(verify, { name: 'focused_tesla', image: 'docker.io/apache/kafka:4.2.0', ports: [[32803, 9092]], upM: 3 }),
      tcContainer(leaked, { name: 'brave_noether', image: 'quay.io/keycloak/keycloak:26.7.4', state: 'EXITED', ageH: 18 }),
      tcContainer(leaked, { name: 'eager_shannon', image: 'docker.io/library/postgres:18', state: 'EXITED', ageH: 18 }),
      tcContainer(undefined, { name: 'tc-reusable-postgres', image: 'docker.io/library/postgres:18', ports: [[32790, 5432]], hash: '3e9a1f0c7b52d48e6a1f2c3d4e5f60718293a4b5', upM: 60 * 24 * 7 }),
    );
  },
};

export default extension;
