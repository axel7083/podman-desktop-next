/**
 * podman-desktop.helm – Helm releases under every Kubernetes connection (P2,
 * P4 release actions), an Artifact Hub / OCI chart catalog tool (P3, P7) and
 * the helm CLI. Releases follow `helm list` / `helm history` shapes.
 */
import { faDharmachakra } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import HelmCharts from './components/HelmCharts.svelte';
import HelmReleases from './components/HelmReleases.svelte';
import { HELM_ID, releasesOf, seedRevisions, store } from './data.ts';

const extension: MockExtension = {
  id: HELM_ID,
  displayName: 'Helm',
  publisher: 'podman-desktop',
  category: 'Kubernetes & OpenShift',
  description: 'Browse Artifact Hub, install charts into your Kubernetes contexts and manage releases.',
  version: '0.1.0',
  icon: 'icons/podman-desktop.helm.png',
  tags: ['community', 'platform'],
  pApis: ['P2', 'P4', 'P7'],
  contributes: {
    navSections: [
      {
        id: 'helm-releases',
        label: 'Helm releases',
        when: conn => conn.kind === 'kubernetes',
        component: HelmReleases,
        counter: (_world, conn) => releasesOf(conn.id).length,
      },
    ],
    tools: [{ id: 'helm-charts', label: 'Helm charts', description: 'Search Artifact Hub and OCI registries for Helm charts.', component: HelmCharts }],
    cliTools: [
      {
        id: 'helm',
        name: 'helm',
        displayName: 'Helm',
        description: 'The Kubernetes package manager.',
        version: '4.3.0',
        latest: '4.3.0',
        path: '/home/user/.local/share/containers/podman-desktop/extensions-storage/podman-desktop.helm/helm',
      },
    ],
    commands: [
      { id: 'helm.install', title: 'Helm: Install chart', category: 'Helm', icon: faDharmachakra, run: (): void => navigate('/tools/helm-charts') },
      { id: 'helm.releases', title: 'Helm: Show releases on kind-dev', category: 'Helm', run: (): void => navigate('/c/kind-dev/helm-releases') },
    ],
  },
  seed(): void {
    const revs = store('kind-dev');
    if (!revs.length) revs.push(...seedRevisions());
  },
};

export default extension;
