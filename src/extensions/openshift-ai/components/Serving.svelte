<script lang="ts">
/** Model serving: KServe InferenceServices (RawDeployment) with status and URL. */
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';
import type { KubeObject } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

function state(o: KubeObject): string {
  const st = (o.status?.modelStatus as { states?: { activeModelState?: string } } | undefined)?.states?.activeModelState ?? '';
  const reason = (o.status?.conditions as { type: string; reason?: string }[] | undefined)?.find(c => c.type === 'Ready')?.reason;
  return reason ? `${st} (${reason})` : st;
}

function model(o: KubeObject): { runtime?: string; storageUri?: string } {
  return ((o.spec?.predictor as { model?: { runtime?: string; storageUri?: string } } | undefined)?.model ?? {});
}
</script>

<KubeResourceList
  {conn}
  title="Model serving"
  kinds={['InferenceService']}
  columns={[
    { title: 'Model state', width: '1.4fr', value: state },
    { title: 'Inference endpoint', width: '2.2fr', value: (o): string => String(o.status?.url ?? '–') },
    { title: 'Storage URI', width: '2.6fr', value: (o): string => model(o).storageUri ?? '' },
  ]} />
