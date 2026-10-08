<script lang="ts">
/** GitOps section (P2/P4): Argo CD Applications with sync and health. */
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';
import type { KubeObject } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const sync = (o: KubeObject): string => String((o.status?.sync as { status?: string } | undefined)?.status ?? 'Unknown');
const health = (o: KubeObject): string => String((o.status?.health as { status?: string } | undefined)?.status ?? 'Unknown');
const op = (o: KubeObject): string => String((o.status?.operationState as { phase?: string } | undefined)?.phase ?? '');

const columns = [
  { title: 'Sync', value: (o: KubeObject): string => (op(o) === 'Running' ? 'Syncing…' : sync(o)) },
  { title: 'Health', value: health },
  { title: 'Revision', value: (o: KubeObject): string => String((o.status?.sync as { revision?: string } | undefined)?.revision ?? '') },
  { title: 'Path', value: (o: KubeObject): string => String((o.spec?.source as { path?: string } | undefined)?.path ?? '') },
  { title: 'Auto-sync', value: (o: KubeObject): string => ((o.spec?.syncPolicy as { automated?: unknown } | undefined)?.automated ? 'On' : 'Off') },
];
</script>

<KubeResourceList {conn} title="Applications" kinds={['Application']} {columns} />
