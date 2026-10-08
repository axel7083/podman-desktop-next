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
  title="Data science projects"
  kinds={['Namespace']}
  columns={[
    { title: 'Display name', width: '1.5fr', value: (o): string => o.metadata.labels?.['openshift.io/display-name'] ?? '' },
    { title: 'Data science project', value: (o): string => (o.metadata.labels?.['opendatahub.io/dashboard'] ? 'Yes' : 'No') },
  ]} />
