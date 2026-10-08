<script lang="ts">
/** Pipelines section (P2/P4): PipelineRuns of the cluster, reusing the generic kube list. */
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';
import type { KubeObject } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

function duration(o: KubeObject): string {
  const start = new Date(String(o.status?.startTime ?? o.metadata.creationTimestamp)).getTime();
  const end = o.status?.completionTime ? new Date(String(o.status.completionTime)).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - start) / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

const columns = [
  { title: 'Pipeline', value: (o: KubeObject): string => String(o.metadata.labels?.['tekton.dev/pipeline'] ?? '') },
  { title: 'Result', value: (o: KubeObject): string => String(o.status?.reason ?? '') },
  { title: 'Duration', value: duration },
  { title: 'Commit', value: (o: KubeObject): string => String(o.metadata.labels?.['pipelinesascode.tekton.dev/sha'] ?? '') },
];
</script>

<KubeResourceList {conn} title="PipelineRuns" kinds={['PipelineRun']} {columns} />
