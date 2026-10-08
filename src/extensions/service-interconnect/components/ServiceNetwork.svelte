<script lang="ts">
/** Service network section (P2): Skupper objects of this site, reusing the generic kube list. */
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';
import type { KubeObject } from '#lib/world.svelte.ts';

import { linkedTo, SKUPPER_KINDS } from '../data.ts';
import { linkToCluster } from '../actions.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
const remote = $derived(linkedTo(conn.id));
const isLocal = $derived(conn.kind === 'engine');

function detail(o: KubeObject): string {
  const s = o.spec ?? {};
  switch (o.kind) {
    case 'Site':
      return `${String(o.status?.platform)} · link access ${String(s.linkAccess)} · ${String(o.status?.sitesInNetwork)} site(s) in network`;
    case 'Link':
      return `→ ${String(o.status?.remoteSiteName)} · cost ${String(s.cost)}`;
    case 'Listener':
      return `${String(s.routingKey)} on ${String(s.host)}:${String(s.port)}`;
    case 'Connector':
      return `${String(s.routingKey)} → ${String(s.host ?? s.selector)}:${String(s.port)}`;
    case 'AccessGrant':
      return `${String(o.status?.redeemed)}/${String(s.redemptionsAllowed)} redeemed · expires in ${String(s.expirationWindow)}`;
    default:
      return '';
  }
}

function matched(o: KubeObject): string {
  if (o.kind === 'Listener') return o.status?.hasMatchingConnector ? 'Matching connector' : 'No matching connector';
  if (o.kind === 'Connector') return o.status?.hasMatchingListener ? 'Matching listener' : 'No matching listener';
  if (o.kind === 'Site') return remote || !isLocal ? 'Ready' : 'Ready · not yet linked';
  return String(o.status?.status ?? '');
}

function linkCluster(): void {
  linkToCluster(conn);
}

const columns = [
  { title: 'Type', width: '100px', value: (o: KubeObject): string => o.kind },
  { title: 'Details', width: '2.5fr', value: detail },
  { title: 'State', width: '1.4fr', value: matched },
];
</script>

<KubeResourceList {conn} title="Service network" kinds={SKUPPER_KINDS} {columns}>
  {#snippet additionalActions()}
    {#if isLocal}
      <Button icon={faLink} disabled={!!remote} title={remote ? `Linked to ${remote}` : 'Link this site to a cluster'} onclick={linkCluster}>{remote ? `Linked to ${remote}` : 'Link to cluster'}</Button>
    {/if}
  {/snippet}
</KubeResourceList>
