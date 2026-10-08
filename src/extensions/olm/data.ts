/** OLM v1 ClusterCatalog / ClusterExtension objects and FBC package metadata (catalogd `/api/v1/all`). */
import { kube, type KubeObject, world } from '#lib/world.svelte.ts';

export const OLM_ID = 'redhat.olm';
export const CATALOG_KINDS = ['ClusterCatalog', 'CatalogSource'];
export const INSTALLED_KINDS = ['ClusterExtension', 'Subscription'];

export interface OperatorPackage {
  packageName: string;
  displayName: string;
  catalog: string;
  defaultChannel: string;
  channels: string[];
  latest: string;
  provider: string;
  description: string;
}

export const PACKAGES: OperatorPackage[] = [
  { packageName: 'openshift-cert-manager-operator', displayName: 'cert-manager Operator for Red Hat OpenShift', catalog: 'openshift-redhat-operators', defaultChannel: 'stable-v1', channels: ['stable-v1', 'stable-v1.17'], latest: '1.18.0', provider: 'Red Hat', description: 'Manages TLS certificates from ACME, Vault and private issuers.' },
  { packageName: 'openshift-gitops-operator', displayName: 'Red Hat OpenShift GitOps', catalog: 'openshift-redhat-operators', defaultChannel: 'latest', channels: ['latest', 'gitops-1.19'], latest: '1.19.1', provider: 'Red Hat', description: 'Argo CD for declarative, GitOps-based continuous delivery.' },
  { packageName: 'openshift-pipelines-operator-rh', displayName: 'Red Hat OpenShift Pipelines', catalog: 'openshift-redhat-operators', defaultChannel: 'latest', channels: ['latest', 'pipelines-1.21'], latest: '1.21.0', provider: 'Red Hat', description: 'Cloud-native CI/CD based on Tekton.' },
  { packageName: 'kubevirt-hyperconverged', displayName: 'OpenShift Virtualization', catalog: 'openshift-redhat-operators', defaultChannel: 'stable', channels: ['stable'], latest: '4.22.1', provider: 'Red Hat', description: 'Run and manage virtual machines next to containers.' },
  { packageName: 'amq-streams', displayName: 'Streams for Apache Kafka', catalog: 'openshift-redhat-operators', defaultChannel: 'stable', channels: ['stable', 'amq-streams-2.9.x'], latest: '3.1.0', provider: 'Red Hat', description: 'Run Apache Kafka clusters, topics and users on OpenShift.' },
  { packageName: 'skupper-operator', displayName: 'Red Hat Service Interconnect', catalog: 'openshift-redhat-operators', defaultChannel: 'stable-2', channels: ['stable-2'], latest: '2.2.0', provider: 'Red Hat', description: 'Connect services across clusters and hosts with Skupper.' },
  { packageName: 'lightspeed-operator', displayName: 'OpenShift Lightspeed', catalog: 'openshift-redhat-operators', defaultChannel: 'stable', channels: ['stable'], latest: '1.0.6', provider: 'Red Hat', description: 'Generative AI assistant integrated in the OpenShift console.' },
  { packageName: 'crunchy-postgres-operator', displayName: 'Crunchy Postgres for Kubernetes', catalog: 'openshift-certified-operators', defaultChannel: 'v5', channels: ['v5'], latest: '5.8.2', provider: 'Crunchy Data', description: 'Production PostgreSQL clusters with backups and HA.' },
  { packageName: 'prometheus', displayName: 'Prometheus Operator', catalog: 'operatorhubio', defaultChannel: 'beta', channels: ['beta'], latest: '0.86.0', provider: 'Community', description: 'Prometheus, Alertmanager and monitoring CRDs.' },
  { packageName: 'cert-manager', displayName: 'cert-manager', catalog: 'operatorhubio', defaultChannel: 'stable', channels: ['stable'], latest: '1.19.1', provider: 'Community', description: 'Upstream cert-manager from the jetstack project.' },
  { packageName: 'strimzi-kafka-operator', displayName: 'Strimzi', catalog: 'operatorhubio', defaultChannel: 'stable', channels: ['stable'], latest: '0.48.0', provider: 'Community', description: 'Apache Kafka on Kubernetes.' },
];

export function catalog(name: string, ref: string, priority: number, age = { d: 0, h: 3 }, kind = 'ClusterCatalog'): KubeObject {
  return kind === 'ClusterCatalog'
    ? kube('olm.operatorframework.io/v1', 'ClusterCatalog', name, undefined, { source: { type: 'Image', image: { ref, pollIntervalMinutes: 60 } }, priority, availabilityMode: 'Available' }, { state: 'RUNNING', serving: 'True', lastUnpacked: new Date(Date.now() - (age.h ?? 0) * 3600_000).toISOString() }, age)
    : kube('operators.coreos.com/v1alpha1', 'CatalogSource', name, 'openshift-marketplace', { sourceType: 'grpc', image: ref, priority }, { state: 'RUNNING', connectionState: 'READY' }, age);
}

export function extensionObj(name: string, ns: string, pkg: string, channel: string, version: string, state: 'RUNNING' | 'STARTING' | 'DEGRADED' = 'RUNNING', reason = 'Succeeded', message?: string, age = { d: 30 }): KubeObject {
  return kube(
    'olm.operatorframework.io/v1',
    'ClusterExtension',
    name,
    undefined,
    { namespace: ns, serviceAccount: { name: `${name}-installer` }, source: { sourceType: 'Catalog', catalog: { packageName: pkg, channels: [channel], upgradeConstraintPolicy: 'CatalogProvided' } } },
    { state, installed: state === 'STARTING' ? 'False' : 'True', reason, bundle: `${pkg}.v${version}`, version, message },
    age,
  );
}

export const OPENSHIFT_CATALOGS = (): KubeObject[] => [
  catalog('openshift-redhat-operators', 'registry.redhat.io/redhat/redhat-operator-index:v4.22', -100, { d: 0, h: 3 }),
  catalog('openshift-certified-operators', 'registry.redhat.io/redhat/certified-operator-index:v4.22', -200, { d: 0, h: 3 }),
  catalog('openshift-community-operators', 'registry.redhat.io/redhat/community-operator-index:v4.22', -400, { d: 0, h: 3 }),
];

export function hasCrd(connId: string, name: string): boolean {
  return (world.kube[connId] ?? []).some(o => o.kind === 'CustomResourceDefinition' && o.metadata.name === name);
}

export function olmVersion(connId: string): 'v1' | 'v0' | undefined {
  if (hasCrd(connId, 'clusterextensions.olm.operatorframework.io')) return 'v1';
  if (hasCrd(connId, 'catalogsources.operators.coreos.com')) return 'v0';
  return undefined;
}
