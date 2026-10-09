<script lang="ts">
/**
 * Operators (OLM) on a cluster: Installed (ClusterExtensions) | Catalog
 * (packages of the cluster catalogs, Install → task → Installed). One header,
 * segmented control for the two views, ModernTable for both collections.
 */
import { faDownload, faTrash } from '@fortawesome/free-solid-svg-icons';

import { type LabConnection, type LabSection, type LabTarget, resourcesOf } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import { addResource, runTask } from './flows.svelte.ts';
import Head from './Head.svelte';
import { deleteRes, live, type MenuItem } from './live.svelte.ts';
import ModernTable from './ModernTable.svelte';
import SegFilter from './SegFilter.svelte';

interface Props {
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, s, onopen }: Props = $props();

let view = $state('installed');
let search = $state('');
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');
const catalogName = $derived(c.product.includes('OpenShift') ? 'redhat-operators (registry.redhat.io/redhat/redhat-operator-index:v4.20)' : 'operatorhubio (quay.io/operatorhubio/catalog:latest)');

/** [display name, package, channel, version, provider, description]. */
const CATALOG: [string, string, string, string, string, string][] = [
  ['cert-manager Operator for Red Hat OpenShift', 'openshift-cert-manager-operator', 'stable-v1', '1.18.0', 'Red Hat', 'X.509 certificates for workloads'],
  ['Red Hat OpenShift Serverless', 'serverless-operator', 'stable', '1.37.0', 'Red Hat', 'Knative Serving and Eventing'],
  ['Streams for Apache Kafka', 'amqstreams', 'stable', '3.0.1', 'Red Hat', 'Kafka clusters, topics and users'],
  ['Red Hat build of Keycloak', 'rhbk-operator', 'stable-v26', '26.2.5', 'Red Hat', 'Identity and access management'],
  ['OpenShift Virtualization', 'kubevirt-hyperconverged', 'stable', '4.20.0', 'Red Hat', 'Run VMs next to containers'],
  ['Red Hat OpenShift AI', 'rhods-operator', 'stable-3.0', '3.0.0', 'Red Hat', 'Model serving, workbenches, pipelines'],
  ['Prometheus Operator', 'prometheus', 'beta', '0.80.1', 'Community', 'Prometheus, Alertmanager and rules'],
  ['Crunchy Postgres for Kubernetes', 'postgresql', 'v5', '5.8.2', 'Certified', 'Production PostgreSQL clusters'],
];

const installed = $derived.by(() => {
  void live.added;
  return resourcesOf(c.id, s.id).filter(r => !live.deleted.includes(r.id));
});

const t = $derived(search.toLowerCase());

const installedRows = $derived<LabRow[]>(
  installed
    .filter(r => !t || r.name.toLowerCase().includes(t))
    .map(r => {
      const cat = CATALOG.find(x => x[0] === r.name);
      const menu = (): MenuItem[] => [
        { label: 'Open', run: (): void => onopen({ kind: 'resource', connId: c.id, sectionId: s.id, resId: r.id }, {}) },
        { label: 'Uninstall', icon: faTrash, danger: true, sep: true, run: (): void => deleteRes(r) },
      ];
      return {
        name: r.id,
        r,
        status: r.status === 'starting' ? 'CREATED' : 'RUNNING',
        icon: s.ext?.icon ?? s.icon,
        title: r.name,
        sub: [],
        cols: { version: cat?.[3] ?? `4.20.${r.name.length % 9}`, channel: cat?.[2] ?? 'stable', ns: r.ns ?? 'openshift-operators', st: r.status === 'starting' ? 'Installing' : 'Succeeded' },
        open: (): void => onopen({ kind: 'resource', connId: c.id, sectionId: s.id, resId: r.id }, { preview: true }),
        buttons: [{ title: 'Uninstall', icon: faTrash, danger: true, run: (): void => deleteRes(r) }],
        menu,
      };
    }),
);

function install(name: string, pkg: string, channel: string, version: string): void {
  const id = `${c.id}/${s.id}/${name}`;
  addResource({ id, name, connId: c.id, sectionId: s.id, status: 'starting', sub: `${pkg} ${version}`, age: 'just now', ns: 'openshift-operators' });
  lab.panel = true;
  runTask({
    title: `Install ${pkg}`,
    connId: c.id,
    icon: 'icons/redhat.olm.png',
    label: 'OLM ClusterExtension',
    target: { kind: 'list', connId: c.id, sectionId: s.id },
    cmd: `kubectl apply -f clusterextension-${pkg}.yaml`,
    lines: [`serviceaccount/${pkg}-installer created`, `clusterextension.olm.operatorframework.io/${pkg} created (channel ${channel})`, 'Progressing: resolving bundle from catalog', `Installed: bundle ${pkg}.v${version}`, `✔ ${name} ${version} installed`],
    done: () => {
      live.status[id] = 'running';
      addResource({ id, name, connId: c.id, sectionId: s.id, status: 'running', sub: `${pkg} ${version}`, age: '1 minute', ns: 'openshift-operators' });
    },
  });
}

const catalogRows = $derived<LabRow[]>(
  CATALOG.filter(x => !t || x[0].toLowerCase().includes(t) || x[1].includes(t)).map(([name, pkg, channel, version, provider, desc]) => {
    const inst = installed.some(r => r.name === name);
    return {
      name: pkg,
      status: inst ? 'RUNNING' : '',
      icon: s.ext?.icon ?? s.icon,
      title: name,
      sub: [],
      cols: { pkg, channel, version, provider, desc },
      buttons: inst ? [] : [{ title: 'Install', icon: faDownload, label: true, run: (): void => install(name, pkg, channel, version) }],
      menu: (): MenuItem[] => [{ label: inst ? 'Installed' : 'Install', icon: faDownload, disabled: inst, run: (): void => install(name, pkg, channel, version) }],
    };
  }),
);
</script>

{#snippet seg()}
  <SegFilter tabs={[['installed', `Installed (${installed.length})`], ['catalog', 'Catalog']]} value={view} label="Operators view" testid="operators-seg" onpick={(v): void => void (view = v)} />
{/snippet}

<div data-testid="operators-view" class="flex flex-col h-full min-h-0">
  <Head icon={s.ext?.icon ?? s.icon} title="Operators" connId={c.id} onconn={(): void => onopen({ kind: 'connection', connId: c.id }, {})} sub={view === 'catalog' ? catalogName : undefined} provenance={s.ext?.name} placeholder="Filter operators" bind:search filters={seg} />
  <div class="flex flex-1 min-h-0 overflow-auto">
    {#if view === 'catalog'}
      <ModernTable rows={catalogRows} {variant} readonly initialSort="" mono={['pkg']} cols={[['Package', 'pkg', 'minmax(10rem, 1.2fr)'], ['Channel', 'channel', '100px'], ['Version', 'version', '80px'], ['Provider', 'provider', '90px'], ['Description', 'desc', 'minmax(10rem, 2fr)']]} />
    {:else}
      <ModernTable rows={installedRows} {variant} cols={[['Version', 'version', '90px'], ['Channel', 'channel', '100px'], ['Namespace', 'ns', '160px'], ['Status', 'st', '100px']]} />
    {/if}
  </div>
</div>
