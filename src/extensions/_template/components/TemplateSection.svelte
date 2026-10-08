<script lang="ts">
/** Nav section page: reuse KubeResourceList for CRDs (P4), or build a NavPage. */
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
</script>

<KubeResourceList {conn} title="Example items" kinds={['ExampleItem']} columns={[{ title: 'Size', value: (o): string => String(o.spec?.size ?? '') }]} />
