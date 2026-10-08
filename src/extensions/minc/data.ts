/** minc v0.2 / MicroShift 4.19 cluster and the OpenShift Console add-on (minc-extension#577). */
import { hexId, kube, type KubeObject } from '#lib/world.svelte.ts';

export const MINC_ID = 'minc-org.minc';
export const MINC_IMAGE = 'quay.io/minc-org/minc:4.19.0-okd-scos.17-amd64';
export const CONSOLE_IMAGE = 'quay.io/openshift/origin-console:4.19';
export const CONSOLE_URL = 'https://console-openshift-console.apps.127.0.0.1.nip.io';
export const CONSOLE_WARNING = 'Authentication disabled: every visitor acts as system:serviceaccount:openshift-console:console-user (cluster-admin). Local use only.';

export function mincObjects(): KubeObject[] {
  const node = 'microshift';
  const p = (name: string, ns: string, restarts = 0): KubeObject => kube('v1', 'Pod', name, ns, { nodeName: node }, { phase: 'Running', ready: '1/1', restarts }, { d: 2 });
  return [
    kube('v1', 'Node', node, undefined, {}, { ready: true, roles: 'control-plane,master,worker', kubeletVersion: 'v1.32.8', osImage: 'CentOS Stream CoreOS 9 (OKD SCOS 4.19)' }, { d: 2 }),
    kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', 'routes.route.openshift.io', undefined, {}, { established: true }, { d: 2 }),
    kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', 'catalogsources.operators.coreos.com', undefined, {}, { established: true }, { d: 2 }),
    kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', 'subscriptions.operators.coreos.com', undefined, {}, { established: true }, { d: 2 }),
    kube('apps/v1', 'Deployment', 'router-default', 'openshift-ingress', { replicas: 1, image: 'quay.io/okd/scos-content@sha256:…' }, { readyReplicas: 1 }, { d: 2 }),
    kube('apps/v1', 'Deployment', 'service-ca', 'openshift-service-ca', { replicas: 1, image: 'quay.io/okd/scos-content@sha256:…' }, { readyReplicas: 1 }, { d: 2 }),
    kube('apps/v1', 'Deployment', 'olm-operator', 'openshift-operator-lifecycle-manager', { replicas: 1, image: 'quay.io/okd/scos-content@sha256:…' }, { readyReplicas: 1 }, { d: 2 }),
    p(`router-default-6f8d9c7b44-${hexId(5)}`, 'openshift-ingress'),
    p(`service-ca-5b7f4d9c8-${hexId(5)}`, 'openshift-service-ca'),
    p(`kube-proxy-${hexId(5)}`, 'kube-system'),
    p(`olm-operator-5c9d8b7f6-${hexId(5)}`, 'openshift-operator-lifecycle-manager', 1),
    kube('v1', 'Service', 'router-internal-default', 'openshift-ingress', { type: 'ClusterIP', clusterIP: '10.43.96.12', ports: '80/TCP,443/TCP' }, {}, { d: 2 }),
  ];
}

/** 16 objects applied by the console kustomization; we keep the visible ones. */
export function consoleObjects(): KubeObject[] {
  return [
    kube('apps/v1', 'Deployment', 'console', 'openshift-console', { replicas: 1, image: CONSOLE_IMAGE }, { readyReplicas: 1 }, { m: 0 }, { app: 'console' }),
    kube('v1', 'Pod', `console-7d9c6b8f5d-${hexId(5)}`, 'openshift-console', { nodeName: 'microshift' }, { phase: 'Running', ready: '1/1', restarts: 0 }, { m: 0 }, { app: 'console' }),
    kube('v1', 'Service', 'console', 'openshift-console', { type: 'ClusterIP', clusterIP: '10.43.12.80', ports: '443/TCP' }, {}, { m: 0 }),
    kube('v1', 'ConfigMap', 'console-config', 'openshift-console', { data: { 'console-config.yaml': 'auth:\n  authType: disabled' } }, {}, { m: 0 }),
  ];
}
