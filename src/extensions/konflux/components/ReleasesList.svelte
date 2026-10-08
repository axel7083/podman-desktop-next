<script lang="ts">
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
</script>

<KubeResourceList
  {conn}
  title="Releases"
  kinds={['Release']}
  columns={[
    { title: 'Snapshot', value: (o): string => String(o.spec?.snapshot ?? '') },
    { title: 'Release plan', value: (o): string => String(o.spec?.releasePlan ?? '') },
    { title: 'Released', value: (o): string => String(o.status?.Released ?? '') },
    { title: 'Target', width: '2fr', value: (o): string => String(o.status?.target ?? '') },
  ]} />
