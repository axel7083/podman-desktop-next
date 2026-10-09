/**
 * redhat.openshift-ai (proposed) – OpenShift AI under the Kubernetes
 * connection whose cluster serves the `datascienceclusters` CRD (P2 `when`,
 * P4 CRD list/watch): Overview, Data science projects, Workbenches, Model
 * serving (InferenceService + Endpoint tab with "Try in playground") and
 * Model registry. Contributes the `rhoai-dev` cluster fixture.
 */
import { faBrain } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionView, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { KubeObject } from '#lib/world.svelte.ts';

import { RHOAI } from '../ai-lab/shared.ts';
import EndpointTab from './components/EndpointTab.svelte';
import Overview from './components/Overview.svelte';
import Projects from './components/Projects.svelte';
import Registry from './components/Registry.svelte';
import Serving from './components/Serving.svelte';
import Workbenches from './components/Workbenches.svelte';
import { RHOAI_CONN, seedRhoai } from './shared.ts';

const hasDsc = (conn: ConnectionView): boolean => !!conn.capabilities?.includes('kube.crd:datascienceclusters');
const icon = 'icons/redhat.openshift-ai.png';

const extension: MockExtension = {
  id: RHOAI,
  displayName: 'Red Hat OpenShift AI',
  publisher: 'redhat',
  category: 'AI',
  description: 'Data science projects, workbenches, deployed models (KServe) and the model registry of OpenShift AI clusters.',
  version: '0.3.0',
  icon,
  dependsOn: ['redhat.ai-lab'],
  tags: ['ai'],
  pApis: ['P2', 'P4', 'P9', 'P14', 'P15'],
  contributes: {
    connections: [
      {
        id: RHOAI_CONN,
        name: 'rhoai-dev',
        kind: 'kubernetes',
        providerId: 'openshift',
        providerName: 'OpenShift',
        icon: 'icons/redhat.openshift-local.png',
        hint: 'RHOAI',
        hintTooltip: 'OpenShift AI 3.5 detected (DataScienceCluster default-dsc)',
        initialStatus: 'started',
        endpoint: 'https://api.rhoai-dev.acme.example:6443',
        version: 'OpenShift 4.20.3 (v1.33.4)',
        details: { Context: 'sam-ai/api-rhoai-dev-acme-example:6443/sam', Nodes: '4 (2 GPU)', 'OpenShift AI': '3.5.0', User: 'sam' },
        capabilities: ['kube', 'openshift', 'kube.crd:datascienceclusters', 'kube.crd:inferenceservices', 'kube.crd:mcpservers'],
      },
    ],
    navSections: [
      { id: 'rhoai-overview', label: 'OpenShift AI', icon, when: hasDsc, component: Overview, order: 10 },
      { id: 'rhoai-projects', label: 'Projects', icon, when: hasDsc, component: Projects, order: 11, counter: (w, c): number => (w.kube[c.id] ?? []).filter(o => o.kind === 'Namespace' && o.metadata.labels?.['opendatahub.io/dashboard']).length },
      { id: 'rhoai-workbenches', label: 'Workbenches', icon, when: hasDsc, component: Workbenches, order: 12, counter: (w, c): number => (w.kube[c.id] ?? []).filter(o => o.kind === 'Notebook').length },
      { id: 'rhoai-serving', label: 'Model serving', icon, when: hasDsc, component: Serving, order: 13, counter: (w, c): number => (w.kube[c.id] ?? []).filter(o => o.kind === 'InferenceService').length },
      { id: 'rhoai-registry', label: 'Model registry', icon, when: hasDsc, component: Registry, order: 14, counter: (w, c): number => (w.kube[c.id] ?? []).filter(o => o.kind === 'RegisteredModel').length },
    ],
    tabs: [{ id: 'endpoint', label: 'Endpoint', target: 'kube-resource', when: (ctx): boolean => (ctx.resource as KubeObject).kind === 'InferenceService', component: EndpointTab }],
    commands: [{ id: 'rhoai.serving', title: 'Open OpenShift AI model serving (rhoai-dev)', category: 'OpenShift AI', icon: faBrain, run: (): void => navigate(`/c/${RHOAI_CONN}/rhoai-serving`) }],
  },
  seed(): void {
    seedRhoai();
  },
};

export default extension;
