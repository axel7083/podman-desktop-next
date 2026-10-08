<script lang="ts">
import { EmptyScreen } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import ContainerDetails from '#lib/details/ContainerDetails.svelte';
import ImageDetails from '#lib/details/ImageDetails.svelte';
import SimpleDetails from '#lib/details/SimpleDetails.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import KubeIcon from '#lib/images/KubeIcon.svelte';
import NetworkIcon from '#lib/images/NetworkIcon.svelte';
import PodIcon from '#lib/images/PodIcon.svelte';
import SecretIcon from '#lib/images/SecretIcon.svelte';
import VolumeIcon from '#lib/images/VolumeIcon.svelte';
import { podActions, volumeActions } from '#lib/resources/actions.ts';
import { cleanKube, kubeStatus, toYaml } from '#lib/resources/kube.ts';
import { humanAge, humanSize, world } from '#lib/world.svelte.ts';

const conn = $derived(registry.getConnection(page.params.conn ?? ''));
const resource = $derived(page.params.resource ?? '');
const id = $derived(decodeURIComponent(page.params.id ?? ''));
const tab = $derived(page.params.tab ?? 'summary');
const base = $derived(`/c/${page.params.conn}/${resource}/${page.params.id}`);

const container = $derived(resource === 'containers' ? world.containers.find(c => c.id === id) : undefined);
const image = $derived(resource === 'images' ? world.images.find(i => i.id === id) : undefined);
const pod = $derived(resource === 'pods' ? world.pods.find(p => p.id === id) : undefined);
const volume = $derived(resource === 'volumes' ? world.volumes.find(v => v.name === id) : undefined);
const network = $derived(resource === 'networks' ? world.networks.find(n => n.id === id) : undefined);
const secret = $derived(resource === 'secrets' ? world.secrets.find(s => s.id === id) : undefined);
const kubeObj = $derived.by(() => {
  if (resource !== 'kube' || !conn) return undefined;
  const [kind, ns, name] = id.split('~');
  return (world.kube[conn.id] ?? []).find(o => o.kind === kind && (o.metadata.namespace ?? '_') === ns && o.metadata.name === name);
});
const podContainers = $derived(pod ? world.containers.filter(c => pod.containerIds.includes(c.id)) : []);
</script>

{#if !conn}
  <EmptyScreen title="Connection not found" message="'{page.params.conn}' does not exist in this scenario." />
{:else if container}
  <ContainerDetails {conn} {container} {tab} />
{:else if image}
  <ImageDetails {conn} {image} {tab} />
{:else if pod}
  <SimpleDetails
    title={pod.name}
    subtitle={pod.id.slice(0, 12)}
    icon={PodIcon}
    status={pod.status}
    breadcrumb="Pods"
    listHref="/c/{conn.id}/pods"
    {base}
    {tab}
    ctx={{ target: 'pod', conn, resource: pod }}
    actions={podActions(pod, podContainers, true)}
    logs={podContainers.flatMap(c => (c.logs ?? []).map(l => `${c.name} | ${l}`))}
    inspect={JSON.stringify({ Id: pod.id, Name: pod.name, State: pod.status, Containers: podContainers.map(c => ({ Id: c.id, Name: c.name, State: c.state })) }, undefined, 2)}
    sections={[{ title: 'Details', rows: [['Name', pod.name], ['ID', pod.id], ['Status', pod.status], ['Created', `${humanAge(pod.created)} ago`], ['Containers', podContainers.map(c => c.name).join(', ')]] }]} />
{:else if volume}
  <SimpleDetails
    title={volume.name.length > 40 ? volume.name.slice(0, 12) : volume.name}
    subtitle={volume.mountpoint}
    icon={VolumeIcon}
    status="UNUSED"
    breadcrumb="Volumes"
    listHref="/c/{conn.id}/volumes"
    {base}
    {tab}
    ctx={{ target: 'volume', conn, resource: volume }}
    actions={volumeActions(volume, false, true)}
    inspect={JSON.stringify({ Name: volume.name, Driver: volume.driver ?? 'local', Mountpoint: volume.mountpoint, CreatedAt: new Date(volume.created).toISOString() }, undefined, 2)}
    sections={[{ title: 'Details', rows: [['Name', volume.name], ['Driver', volume.driver ?? 'local'], ['Mount point', volume.mountpoint], ['Size', humanSize(volume.size)], ['Created', `${humanAge(volume.created)} ago`]] }]} />
{:else if network}
  <SimpleDetails
    title={network.name}
    subtitle={network.id.slice(0, 12)}
    icon={NetworkIcon}
    status="USED"
    breadcrumb="Networks"
    listHref="/c/{conn.id}/networks"
    {base}
    {tab}
    inspect={JSON.stringify({ name: network.name, id: network.id, driver: network.driver, subnets: network.subnet ? [{ subnet: network.subnet }] : [] }, undefined, 2)}
    sections={[{ title: 'Details', rows: [['Name', network.name], ['ID', network.id], ['Driver', network.driver], ['Subnet', network.subnet], ['Created', `${humanAge(network.created)} ago`]] }]} />
{:else if secret}
  <SimpleDetails
    title={secret.name}
    subtitle={secret.id.slice(0, 12)}
    icon={SecretIcon}
    status="UNUSED"
    breadcrumb="Secrets"
    listHref="/c/{conn.id}/secrets"
    {base}
    {tab}
    sections={[{ title: 'Details', rows: [['Name', secret.name], ['ID', secret.id], ['Driver', secret.driver ?? 'file'], ['Created', `${humanAge(secret.created)} ago`]] }]} />
{:else if kubeObj}
  <SimpleDetails
    title={kubeObj.metadata.name}
    subtitle="{kubeObj.kind}{kubeObj.metadata.namespace ? ` · ${kubeObj.metadata.namespace}` : ''}"
    icon={KubeIcon}
    status={kubeStatus(kubeObj)}
    breadcrumb={kubeObj.kind}
    listHref="/c/{conn.id}"
    {base}
    {tab}
    ctx={{ target: 'kube-resource', conn, resource: kubeObj }}
    inspect={`apiVersion: ${kubeObj.apiVersion}${toYaml(cleanKube(kubeObj)).replace(/^\napiVersion: .*$/m, '')}`}
    inspectLanguage="yaml"
    inspectLabel="YAML"
    sections={[
      {
        title: 'Details',
        rows: [
          ['Name', kubeObj.metadata.name],
          ['Kind', kubeObj.kind],
          ['API version', kubeObj.apiVersion],
          ['Namespace', kubeObj.metadata.namespace],
          ['UID', kubeObj.metadata.uid],
          ['Created', kubeObj.metadata.creationTimestamp],
        ],
      },
      { title: 'Labels', rows: Object.entries(kubeObj.metadata.labels ?? {}) as [string, string][] },
    ]} />
{:else}
  <EmptyScreen title="Not found" message="This {resource === 'kube' ? 'object' : resource.replace(/s$/, '')} no longer exists." />
{/if}
