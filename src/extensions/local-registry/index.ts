/**
 * podman-desktop.local-registry – one-click zot OCI registry on
 * localhost:5000 (service connection, P8), wired into Podman
 * (registries.conf) and local clusters (P13 add-on). Used by preflight.
 */
import { faUpload } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import { type ContainerImage, runTask, shortImage } from '#lib/world.svelte.ts';

import Repositories from './components/Repositories.svelte';
import { addTag, LR, repos } from './data.ts';

function push(image: ContainerImage): void {
  const repo = image.name.replace(/^[^/]+\//, '').replace(/^library\//, '');
  runTask({
    name: `Push ${shortImage(image.name)}:${image.tag} to localhost:5000`,
    ext: LR,
    action: { label: 'Open repositories', href: '/c/local-registry/repositories' },
    steps: [
      { label: `podman tag ${shortImage(image.name)}:${image.tag} localhost:5000/${repo}:${image.tag}`, ms: 300 },
      { label: `Pushing localhost:5000/${repo}:${image.tag}`, ms: 1500, log: ['Copying blob … done', 'Writing manifest to image destination'] },
    ],
    onDone: () => addTag(repo, image.tag),
  });
}

const extension: MockExtension = {
  id: LR,
  displayName: 'Local registry',
  publisher: 'podman-desktop',
  description: 'One-click OCI registry (zot) on localhost:5000, wired into Podman and your local clusters.',
  version: '0.1.0',
  icon: 'icons/podman-desktop.local-registry.png',
  dependsOn: ['podman-desktop.podman'],
  tags: ['community', 'platform'],
  pApis: ['P6', 'P8', 'P13'],
  contributes: {
    connections: [
      {
        id: 'local-registry',
        name: 'zot (localhost:5000)',
        kind: 'service',
        providerId: 'local-registry',
        providerName: 'Local registry',
        initialStatus: 'started',
        endpoint: 'http://localhost:5000',
        version: 'v2.1.22',
        details: {
          Image: 'ghcr.io/project-zot/zot:v2.1.22',
          Storage: '/var/lib/registry (gc, dedupe)',
          'Podman config': '/etc/containers/registries.conf.d/50-pd-local.conf (insecure=true)',
          Extensions: 'search, ui, scrub · OCI 1.1 referrers',
          'Runs on': 'podman-machine-default',
        },
        capabilities: ['oci-registry'],
        parentId: 'podman-machine-default',
      },
    ],
    navSections: [
      {
        id: 'repositories',
        label: 'Repositories',
        when: conn => !!conn.capabilities?.includes('oci-registry'),
        component: Repositories,
        counter: world => ((world.ext[LR]?.repos as unknown[] | undefined) ?? []).length || 4,
      },
    ],
    registries: [{ id: 'localhost:5000', name: 'Local registry (zot)', server: 'localhost:5000', icon: 'icons/podman-desktop.local-registry.png' }],
    menus: [{ id: 'push-local', label: 'Push to local registry', icon: faUpload, target: 'image', placement: 'kebab', run: ctx => push(ctx.resource as ContainerImage) }],
    addons: [
      {
        id: 'local-registry',
        label: 'Local registry (localhost:5000)',
        description: 'Adds containerdConfigPatches and the local-registry-hosting ConfigMap (KEP-1755) so pods can pull localhost:5000 images.',
        icon: 'icons/podman-desktop.local-registry.png',
        when: conn => conn.kind === 'kubernetes' && !!conn.capabilities?.includes('kube.local'),
        installSteps: [
          { label: 'Connecting zot to the cluster network', ms: 800 },
          { label: 'Patching containerd registry config on nodes', ms: 1200 },
          { label: 'Creating ConfigMap kube-public/local-registry-hosting', ms: 500 },
        ],
        endpoints: () => [{ label: 'Registry', url: 'localhost:5000' }],
      },
    ],
  },
  seed(world): void {
    repos();
    world.containers.push(
      mkContainer('podman-machine-default', {
        name: 'pd-local-registry',
        image: 'ghcr.io/project-zot/zot:v2.1.22',
        ports: [5000],
        labels: { 'io.podman-desktop.local-registry': 'true' },
        command: 'zot serve /etc/zot/config.json',
        upM: 480,
      }),
    );
  },
};

export default extension;
