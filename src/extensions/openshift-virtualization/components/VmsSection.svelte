<script lang="ts">
/** Virtual machines section (P2/P4): KubeVirt VMs with printable status, node and IP. */
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';
import type { KubeObject } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const columns = [
  { title: 'Phase', value: (o: KubeObject): string => String(o.status?.printableStatus ?? '') },
  { title: 'Instance type', value: (o: KubeObject): string => String((o.spec?.instancetype as { name?: string } | undefined)?.name ?? '—') },
  { title: 'Node', width: '1.6fr', value: (o: KubeObject): string => String(o.status?.nodeName ?? '—') },
  { title: 'IP address', value: (o: KubeObject): string => String(o.status?.ipAddress ?? '—') },
];
</script>

<KubeResourceList {conn} title="Virtual machines" kinds={['VirtualMachine']} {columns} />
