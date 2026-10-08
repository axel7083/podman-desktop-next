/**
 * podman-desktop.devcontainers (proposed) – detect `.devcontainer/devcontainer.json`
 * projects and run them on Podman with the Dev Containers CLI: tool page (P3),
 * `devcontainer up` as a task (P15), containers grouped by
 * `devcontainer.local_folder` (P10) and a "Dev Container" details tab (P14).
 */
import { faBoxOpen } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { Container } from '#lib/world.svelte.ts';

import DevContainersTool from './components/DevContainersTool.svelte';
import DevContainerTab from './components/DevContainerTab.svelte';
import { basename, CLI_VERSION, DEVC_EXT, FOLDER_LABEL, projectByFolder, seedDevcontainers } from './data.ts';

function openWizard(): void {
  navigate('/tools/devcontainers?open=1');
}

const extension: MockExtension = {
  id: DEVC_EXT,
  displayName: 'Dev Containers',
  publisher: 'podman-desktop',
  description: 'Detect .devcontainer/devcontainer.json in your projects, build and start them on Podman with the Dev Containers CLI, and see them as first-class containers.',
  version: '0.1.0',
  icon: 'icons/podman-desktop.devcontainers.png',
  tags: ['appdev'],
  pApis: ['P10', 'P14', 'P15'],
  contributes: {
    tools: [
      {
        id: 'devcontainers',
        label: 'Dev Containers',
        icon: 'icons/podman-desktop.devcontainers.png',
        description: 'Open project folders in dev containers on Podman',
        component: DevContainersTool,
      },
    ],
    tabs: [
      {
        id: 'devcontainer',
        label: 'Dev Container',
        target: 'container',
        when: (ctx): boolean => !!(ctx.resource as Container).labels[FOLDER_LABEL],
        component: DevContainerTab,
      },
    ],
    menus: [
      {
        id: 'devcontainers.open-folder',
        label: 'Open folder in dev container',
        icon: faBoxOpen,
        target: 'container',
        placement: 'toolbar',
        run: openWizard,
      },
    ],
    groupers: [
      {
        id: 'devcontainer',
        label: FOLDER_LABEL,
        typeName: 'dev container',
        groupName: (value): string => basename(value),
        groupDetails: (value): string[] => {
          const p = projectByFolder(value);
          return p ? [p.stack] : [];
        },
      },
    ],
    commands: [
      {
        id: 'devcontainers.open-folder',
        title: 'Open folder in dev container',
        category: 'Dev Containers',
        icon: faBoxOpen,
        run: openWizard,
      },
    ],
    cliTools: [
      {
        id: 'devcontainer',
        name: 'devcontainer',
        displayName: 'Dev Containers CLI',
        description: 'Reference implementation of the containers.dev spec (@devcontainers/cli): up, exec, build, features, templates.',
        version: CLI_VERSION,
        path: '/home/maya/.local/bin/devcontainer',
      },
    ],
  },
  seed(): void {
    seedDevcontainers();
  },
};

export default extension;
