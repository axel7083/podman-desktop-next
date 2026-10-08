/** podman-desktop.registries – built-in default registries (Settings › Registries). */
import type { MockExtension } from '#lib/ext/types.ts';

const extension: MockExtension = {
  id: 'podman-desktop.registries',
  displayName: 'Registries',
  publisher: 'podman-desktop',
  description: 'Suggested container registries: Docker Hub, Red Hat Quay, GitHub and Google.',
  version: '1.29.0',
  icon: 'icons/podman-desktop.registries.png',
  builtin: true,
  tags: ['community'],
  pApis: [],
  contributes: {
    registries: [
      { id: 'docker.io', name: 'Docker Hub', server: 'docker.io', icon: 'icons/podman-desktop.docker.png', user: 'devuser' },
      { id: 'quay.io', name: 'Red Hat Quay', server: 'quay.io', icon: 'icons/podman-desktop.registries.png' },
      { id: 'ghcr.io', name: 'GitHub', server: 'ghcr.io', icon: 'icons/podman-desktop.github-account.png' },
      { id: 'gcr.io', name: 'Google Container Registry', server: 'gcr.io' },
    ],
  },
};

export default extension;
