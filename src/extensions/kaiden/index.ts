/**
 * redhat.kaiden-bridge (proposed) – Kaiden agent workspaces (OpenShell
 * sandboxes running on Podman) inside Podman Desktop: an "OpenShell gateway"
 * service connection (P8) with Agent workspaces / Agents sections (P2), a
 * "Kaiden sandboxes" container grouper (P10) and "Open in Kaiden" menus.
 */
import { faArrowUpRightFromSquare, faRobot } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionView, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { Container } from '#lib/world.svelte.ts';

import Agents from './components/Agents.svelte';
import Workspaces from './components/Workspaces.svelte';
import { GROUP_LABEL, KAIDEN, openInKaiden, seedKaiden, workspaces } from './shared.ts';

const icon = 'icons/redhat.kaiden-bridge.png';
const isGateway = (c: ConnectionView): boolean => c.providerId === 'openshell';

const extension: MockExtension = {
  id: KAIDEN,
  displayName: 'Kaiden',
  publisher: 'redhat',
  description: 'Show Kaiden agent workspaces (sandboxes on Podman) and share inference providers, MCP servers and skills with Kaiden.',
  version: '0.1.0',
  icon,
  dependsOn: ['redhat.ai-lab'],
  tags: ['ai'],
  pApis: ['P2', 'P8', 'P9', 'P10', 'P15'],
  contributes: {
    connections: [
      {
        id: 'openshell-gateway',
        name: 'OpenShell gateway',
        kind: 'service',
        providerId: 'openshell',
        providerName: 'Kaiden',
        hint: 'podman',
        hintTooltip: 'Gateway container on podman-machine-default',
        initialStatus: 'started',
        endpoint: 'https://127.0.0.1:41871',
        version: 'openshell gateway 0.0.71',
        details: { Image: 'ghcr.io/nvidia/openshell/gateway:0.0.71', 'Supports mounts': 'yes', Kaiden: '0.1.0-next' },
        capabilities: ['kaiden'],
      },
    ],
    navSections: [
      { id: 'kaiden-workspaces', label: 'Agent workspaces', icon, when: isGateway, component: Workspaces, order: 1, counter: (): number => workspaces().length },
      { id: 'kaiden-agents', label: 'Agents', icon, when: isGateway, component: Agents, order: 2 },
    ],
    groupers: [{ id: 'kaiden', label: GROUP_LABEL, typeName: 'Kaiden sandboxes', icon }],
    menus: [
      {
        id: 'kaiden-open',
        label: 'Open in Kaiden',
        icon: faArrowUpRightFromSquare,
        target: 'container',
        placement: 'kebab',
        when: (ctx): boolean => !!(ctx.resource as Container).labels?.['ai.openkaiden.workspace'],
        run: (ctx): void => openInKaiden((ctx.resource as Container).labels['ai.openkaiden.workspace']),
      },
    ],
    commands: [{ id: 'kaiden.createWorkspace', title: 'Start agent workspace', category: 'Kaiden', icon: faRobot, run: (): void => navigate('/c/openshell-gateway/kaiden-workspaces') }],
  },
  seed(): void {
    seedKaiden();
  },
};

export default extension;
