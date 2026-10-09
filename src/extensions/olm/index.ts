/**
 * redhat.olm (proposed) – Operators on any connected cluster with OLM v1
 * (ClusterCatalog / ClusterExtension; OLM v0 CatalogSource / Subscription on
 * MicroShift). "Operators" section under clusters that serve the OLM APIs
 * (P2 `when`), contributed actions on installed operators (P4) and the
 * "OperatorHub.io catalog" / "OLM v1" add-ons for local clusters (P13).
 */
import { faArrowUp, faCubes } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { addKube, kube, type KubeObject, runTask, world } from '#lib/world.svelte.ts';

import OperatorsPage from './components/OperatorsPage.svelte';
import { catalog, extensionObj, INSTALLED_KINDS, OLM_ID, olmVersion, OPENSHIFT_CATALOGS } from './data.ts';

const extension: MockExtension = {
  id: OLM_ID,
  displayName: 'Operators (OLM)',
  publisher: 'redhat',
  category: 'Kubernetes & OpenShift',
  description: 'Browse catalogs and install operators on any connected cluster with OLM v1.',
  version: '0.2.0',
  icon: 'icons/redhat.olm.png',
  tags: ['openshift'],
  pApis: ['P2', 'P4', 'P13'],
  contributes: {
    navSections: [
      {
        id: 'operators',
        label: 'Operators',
        icon: 'icons/redhat.olm.png',
        when: conn => conn.kind === 'kubernetes' && conn.status === 'started' && !!olmVersion(conn.id),
        component: OperatorsPage,
        counter: (w, conn) => (w.kube[conn.id] ?? []).filter(o => INSTALLED_KINDS.includes(o.kind)).length,
        order: 30,
      },
    ],
    menus: [
      {
        id: 'olm-upgrade',
        label: 'Upgrade with SelfCertified policy',
        icon: faArrowUp,
        target: 'kube-resource',
        placement: 'kebab',
        when: ctx => 'kind' in ctx.resource && ctx.resource.kind === 'ClusterExtension' && ctx.resource.status?.reason === 'Blocked',
        run: ctx => {
          const o = ctx.resource as KubeObject;
          runTask({
            name: `Upgrade ${o.metadata.name} on ${ctx.conn.name}`,
            ext: OLM_ID,
            steps: [
              { label: 'Setting upgradeConstraintPolicy: SelfCertified', ms: 600 },
              { label: 'Resolving bundle amqstreams.v3.1.0', ms: 900 },
              { label: 'Rolling out new operator version', ms: 1600 },
            ],
            onDone: () => {
              o.status = { ...o.status, state: 'RUNNING', reason: 'Succeeded', version: '3.1.0', bundle: 'amq-streams.v3.1.0', message: undefined };
            },
          });
        },
      },
    ],
    addons: [
      {
        id: 'olm-v1',
        label: 'OLM v1',
        description: 'Installs operator-controller and catalogd, plus the OperatorHub.io catalog (quay.io/operatorhubio/catalog:latest).',
        icon: 'icons/redhat.olm.png',
        when: conn => !!conn.capabilities?.includes('kind'),
        installSteps: [
          { label: 'Applying operator-controller v1.6.0 manifests', ms: 1500 },
          { label: 'Waiting for catalogd and operator-controller', ms: 1500 },
          { label: 'Unpacking ClusterCatalog operatorhubio', ms: 1500 },
        ],
        onInstalled: conn =>
          addKube(conn.id, [
            kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', 'clusterextensions.olm.operatorframework.io', undefined, {}, {}, { m: 0 }),
            catalog('operatorhubio', 'quay.io/operatorhubio/catalog:latest', 0, { d: 0, h: 0 }),
          ]),
      },
      {
        id: 'operatorhubio',
        label: 'OperatorHub.io catalog',
        description: 'Adds the community catalog (quay.io/operatorhubio/catalog:latest) to the OLM shipped with MicroShift.',
        icon: 'icons/redhat.olm.png',
        when: conn => !!conn.capabilities?.includes('minc'),
        installSteps: [
          { label: 'Creating CatalogSource operatorhubio-catalog', ms: 700 },
          { label: 'Pulling catalog image (290 MB)', ms: 1800 },
          { label: 'Waiting for catalog to be READY', ms: 1000 },
        ],
        onInstalled: conn => addKube(conn.id, [catalog('operatorhubio-catalog', 'quay.io/operatorhubio/catalog:latest', 0, { d: 0, h: 0 }, 'CatalogSource')]),
        onUninstalled: conn => {
          world.kube[conn.id] = (world.kube[conn.id] ?? []).filter(o => o.metadata.name !== 'operatorhubio-catalog');
        },
      },
    ],
    commands: [{ id: 'olm.browse', title: 'Browse operators on ocp-dev', category: 'Operators', icon: faCubes, run: (): void => navigate('/c/ocp-dev/operators') }],
  },
  seed(): void {
    addKube('ocp-dev', [
      ...OPENSHIFT_CATALOGS(),
      extensionObj('cert-manager', 'cert-manager-operator', 'openshift-cert-manager-operator', 'stable-v1', '1.18.0', 'RUNNING', 'Succeeded', undefined, { d: 36 }),
      extensionObj('openshift-pipelines', 'openshift-operators', 'openshift-pipelines-operator-rh', 'latest', '1.21.0'),
      extensionObj('openshift-gitops', 'openshift-gitops-operator', 'openshift-gitops-operator', 'latest', '1.19.1'),
      extensionObj('kubevirt-hyperconverged', 'openshift-cnv', 'kubevirt-hyperconverged', 'stable', '4.22.1'),
      extensionObj('skupper', 'openshift-operators', 'skupper-operator', 'stable-2', '2.2.0'),
      extensionObj('lightspeed', 'openshift-lightspeed', 'lightspeed-operator', 'stable', '1.0.6'),
      extensionObj('amq-streams', 'kafka', 'amq-streams', 'stable', '2.9.1', 'DEGRADED', 'Blocked', 'no upgrade edge from 2.9.1 to 3.1.0'),
    ]);
    addKube('ocp-prod', [
      ...OPENSHIFT_CATALOGS(),
      extensionObj('openshift-gitops', 'openshift-gitops-operator', 'openshift-gitops-operator', 'latest', '1.19.1'),
      extensionObj('rhacs-operator', 'rhacs-operator', 'rhacs-operator', 'stable', '4.10.0'),
    ]);
    addKube('openshift-local', OPENSHIFT_CATALOGS());
  },
};

export default extension;
