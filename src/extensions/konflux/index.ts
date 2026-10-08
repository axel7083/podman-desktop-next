/**
 * redhat.konflux – Konflux tenant as a Kubernetes connection (P1) with
 * Applications / Components / PipelineRuns / Snapshots / Releases sections
 * (P2, P4) and an image tab tracing a digest back to its build (P14).
 */
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionView, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { ContainerImage, World } from '#lib/world.svelte.ts';

import Applications from './components/Applications.svelte';
import KonfluxImageTab from './components/KonfluxImageTab.svelte';
import PipelineRuns from './components/PipelineRuns.svelte';
import Snapshots from './components/Snapshots.svelte';
import { KONFLUX, seedKonflux } from './data.ts';

const isKonflux = (conn: ConnectionView): boolean => !!conn.capabilities?.includes('kube.crd:components.appstudio.redhat.com');
const count = (kind: string) => (world: World, conn: ConnectionView): number => (world.kube[conn.id] ?? []).filter(o => o.kind === kind).length;


const extension: MockExtension = {
  id: 'redhat.konflux',
  displayName: 'Konflux',
  publisher: 'redhat',
  description: 'See your Konflux applications, component builds, snapshots and releases next to the images you build locally.',
  version: '0.1.0',
  icon: 'icons/redhat.konflux.png',
  tags: ['platform'],
  pApis: ['P1', 'P2', 'P4', 'P14'],
  contributes: {
    connections: [
      {
        id: KONFLUX,
        name: 'konflux-acme',
        kind: 'kubernetes',
        providerId: 'konflux',
        providerName: 'Konflux',
        hint: '☁',
        hintTooltip: 'Konflux tenant acme-tenant on konflux.apps.ocp.acme-corp.com',
        initialStatus: 'started',
        endpoint: 'https://api.konflux.acme-corp.com:6443',
        version: 'v1.33.4',
        details: { Context: 'konflux-acme', Namespace: 'acme-tenant', User: 'priya@acme-corp.com (SSO)', Console: 'https://konflux-ui.apps.ocp.acme-corp.com' },
        capabilities: ['kube', 'remote', 'kube.crd:components.appstudio.redhat.com', 'kube.crd:releases.appstudio.redhat.com'],
        resources: ['deployments', 'k8s-pods', 'configmaps'],
      },
    ],
    navSections: [
      { id: 'konflux-applications', label: 'Applications', when: isKonflux, component: Applications, counter: count('Application'), order: 1 },
      { id: 'konflux-components', label: 'Components', when: isKonflux, component: () => import('./components/ComponentsList.svelte'), counter: count('Component'), order: 2 },
      { id: 'konflux-pipelineruns', label: 'PipelineRuns', when: isKonflux, component: PipelineRuns, counter: count('PipelineRun'), order: 3 },
      { id: 'konflux-snapshots', label: 'Snapshots', when: isKonflux, component: Snapshots, counter: count('Snapshot'), order: 4 },
      { id: 'konflux-releases', label: 'Releases', when: isKonflux, component: () => import('./components/ReleasesList.svelte'), counter: count('Release'), order: 5 },
    ],
    tabs: [{ id: 'konflux', label: 'Konflux', target: 'image', when: ctx => (ctx.resource as ContainerImage).name === 'quay.io/acme/payments-api', component: KonfluxImageTab }],
    commands: [{ id: 'konflux.runs', title: 'Open Konflux PipelineRuns', category: 'Konflux', icon: faCodeBranch, run: (): void => navigate(`/c/${KONFLUX}/konflux-pipelineruns`) }],
  },
  seed(): void {
    seedKonflux();
  },
};

export default extension;
