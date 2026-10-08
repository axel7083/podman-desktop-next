/**
 * podman-desktop.debug-shell (proposed, O3 – Docker Debug / OrbStack parity):
 * a container "Debug" tab (P14) that attaches a toolbox container to the
 * target's namespaces, a "Debug shell" kebab action, and a grouper (P10) that
 * folds debug containers under their target.
 */
import { faBug } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { Container } from '#lib/world.svelte.ts';
import { findContainer } from '#lib/world.svelte.ts';

import DebugTab from './components/DebugTab.svelte';
import { DEBUG_EXT, DEBUG_LABEL, isDebugContainer } from './data.ts';

function debuggable(c: Container): boolean {
  return c.state === 'RUNNING' && !isDebugContainer(c);
}

const extension: MockExtension = {
  id: DEBUG_EXT,
  displayName: 'Debug shell',
  publisher: 'podman-desktop',
  description: 'Open a shell with real tools inside any container — even distroless or scratch — without changing the image.',
  version: '0.1.0',
  icon: 'icons/podman-desktop.debug-shell.png',
  tags: ['appdev'],
  pApis: ['P10', 'P14'],
  contributes: {
    tabs: [
      {
        id: 'debug',
        label: 'Debug',
        target: 'container',
        when: (ctx): boolean => debuggable(ctx.resource as Container),
        component: DebugTab,
      },
    ],
    menus: [
      {
        id: 'debug-shell.open',
        label: 'Debug shell',
        icon: faBug,
        target: 'container',
        placement: 'kebab',
        when: (ctx): boolean => debuggable(ctx.resource as Container),
        run: (ctx): void => navigate(`/c/${ctx.conn.id}/containers/${(ctx.resource as Container).id}/debug`),
      },
    ],
    groupers: [
      {
        id: 'debug-target',
        label: DEBUG_LABEL,
        typeName: 'debug',
        groupName: (value, containers): string =>
          `debug ${findContainer(value)?.name ?? containers[0]?.labels['io.podman-desktop.debug-target.name'] ?? value.slice(0, 12)}`,
        groupDetails: (_value, containers): string[] => [...new Set(containers.map(c => c.image.split('/').pop() ?? c.image))],
      },
    ],
  },
};

export default extension;
