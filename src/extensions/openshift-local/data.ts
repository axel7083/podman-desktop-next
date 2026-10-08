/** `crc status -o json`, `crc config`, daemon `/api/webconsoleurl` shaped data. */
import { hexId, kube, type KubeObject } from '#lib/world.svelte.ts';

export const CRC_ID = 'redhat.openshift-local';

export const CRC_STATUS = {
  crcStatus: 'Running',
  openshiftStatus: 'Running',
  openshiftVersion: '4.22.3',
  podmanVersion: '5.7.0',
  preset: 'openshift',
  ramSize: 11274289152,
  ramUsage: 8423112704,
  diskSize: 37580963840,
  diskUsage: 21470478336,
  cacheUsage: 4617089843,
  cacheDir: '~/.crc/cache',
  cpus: 6,
  crcVersion: '2.58.0',
};

export const CLUSTER_CONFIG = {
  ClusterType: 'openshift',
  ClusterAPI: 'https://api.crc.testing:6443',
  WebConsoleURL: 'https://console-openshift-console.apps-crc.testing',
};

export const USERS = [
  { name: 'kubeadmin', password: 'vXqhT-2Ks9J-pW7aL-QmZ3c', role: 'cluster-admin' },
  { name: 'developer', password: 'developer', role: 'project admin' },
];

export const BUNDLES = [
  { preset: 'openshift', version: '4.22.3', size: 4617089843, cached: true },
  { preset: 'microshift', version: '4.22.3', size: 1932735283, cached: true },
];

export function crcObjects(preset: string): KubeObject[] {
  const node = 'crc';
  const kv = preset === 'microshift' ? 'v1.35.2' : 'v1.35.2';
  const p = (name: string, ns: string, restarts = 0): KubeObject => kube('v1', 'Pod', name, ns, { nodeName: node }, { phase: 'Running', ready: '1/1', restarts }, { d: 8 });
  const objects: KubeObject[] = [
    kube('v1', 'Node', node, undefined, {}, { ready: true, roles: 'control-plane,master,worker', kubeletVersion: kv, osImage: 'Red Hat Enterprise Linux CoreOS 9.6 (Plow)' }, { d: 8 }),
    kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', 'routes.route.openshift.io', undefined, {}, { established: true }, { d: 8 }),
    kube('apps/v1', 'Deployment', 'router-default', 'openshift-ingress', { replicas: 1, image: 'quay.io/openshift-release-dev/ocp-v4.0-art-dev@sha256:…' }, { readyReplicas: 1 }, { d: 8 }),
    p(`router-default-6f8d9c7b44-${hexId(5)}`, 'openshift-ingress'),
    kube('v1', 'Service', 'router-internal-default', 'openshift-ingress', { type: 'ClusterIP', clusterIP: '172.30.163.9', ports: '80/TCP,443/TCP,1936/TCP' }, {}, { d: 8 }),
  ];
  if (preset !== 'microshift') {
    objects.push(
      kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', 'clusterextensions.olm.operatorframework.io', undefined, {}, { established: true }, { d: 8 }),
      kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', 'clustercatalogs.olm.operatorframework.io', undefined, {}, { established: true }, { d: 8 }),
      kube('apps/v1', 'Deployment', 'console', 'openshift-console', { replicas: 1, image: 'quay.io/openshift-release-dev/ocp-v4.0-art-dev@sha256:…' }, { readyReplicas: 1 }, { d: 8 }),
      kube('apps/v1', 'Deployment', 'oauth-openshift', 'openshift-authentication', { replicas: 1, image: 'quay.io/openshift-release-dev/ocp-v4.0-art-dev@sha256:…' }, { readyReplicas: 1 }, { d: 8 }),
      kube('apps/v1', 'Deployment', 'payments-api', 'demo', { replicas: 1, image: 'quay.io/acme/payments-api:1.4.0' }, { readyReplicas: 1 }, { d: 1 }),
      p(`console-5c7f8b9d6-${hexId(5)}`, 'openshift-console'),
      p(`oauth-openshift-7d9f6c8b5-${hexId(5)}`, 'openshift-authentication', 1),
      p(`payments-api-84f6d7c9b-${hexId(5)}`, 'demo'),
      kube('v1', 'Service', 'payments-api', 'demo', { type: 'ClusterIP', clusterIP: '172.30.21.88', ports: '8080/TCP' }, {}, { d: 1 }),
      kube('v1', 'Secret', 'pull-secret', 'openshift-config', { type: 'kubernetes.io/dockerconfigjson' }, {}, { d: 8 }),
      kube('v1', 'PersistentVolumeClaim', 'image-registry-storage', 'openshift-image-registry', { storage: '100Gi', storageClassName: 'crc-csi-hostpath-provisioner' }, { phase: 'Bound' }, { d: 8 }),
    );
  }
  return objects;
}
