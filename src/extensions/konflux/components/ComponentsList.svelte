<script lang="ts">
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';
import type { KubeObject } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

function git(o: KubeObject): string {
  const g = (o.spec?.source as { git?: { url: string; context?: string } } | undefined)?.git;
  return g ? `${g.url.replace('https://', '')}${g.context ? ` (${g.context})` : ''}` : '';
}
</script>

<KubeResourceList
  {conn}
  title="Components"
  kinds={['Component']}
  columns={[
    { title: 'Application', value: (o): string => String(o.spec?.application ?? '') },
    { title: 'Source', width: '2fr', value: git },
    { title: 'Last promoted image', width: '2fr', value: (o): string => String(o.status?.lastPromotedImage ?? '—').replace('quay.io/redhat-user-workloads/acme-tenant/', '') },
  ]} />
