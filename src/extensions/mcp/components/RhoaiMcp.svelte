<script lang="ts">
/** rhoai-dev › MCP servers: MCPServer CRs (mcp.x-k8s.io/v1beta1, P4). */
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
</script>

<KubeResourceList
  {conn}
  title="MCP servers"
  kinds={['MCPServer']}
  columns={[
    { title: 'Image', width: '2fr', value: (o): string => String(((o.spec?.source as { containerImage?: { ref?: string } }) ?? {}).containerImage?.ref ?? '') },
    { title: 'URL', width: '2fr', value: (o): string => String(o.status?.url ?? '') },
  ]} />
