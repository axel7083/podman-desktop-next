<script lang="ts">
/** OpenShift AI overview: DataScienceCluster release and component management states. */
import { NavPage } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import Card from '../../ai-lab/components/ui/Card.svelte';
import Chip from '../../ai-lab/components/ui/Chip.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const objects = $derived(world.kube[conn.id] ?? []);
const dsc = $derived(objects.find(o => o.kind === 'DataScienceCluster'));
const components = $derived(Object.entries((dsc?.spec?.components as Record<string, { managementState: string }>) ?? {}));
const release = $derived(dsc?.status?.release as { name: string; version: string } | undefined);
const count = (kind: string, pred: (s: Record<string, unknown>) => boolean = (): boolean => true): number =>
  objects.filter(o => o.kind === kind && pred(o.status ?? {})).length;

function go(section: string): void {
  navigate(`/c/${conn.id}/${section}`);
}
</script>

<NavPage title="OpenShift AI" searchEnabled={false}>
  {#snippet content()}
    <div class="flex flex-col gap-4 px-5 py-4 w-full overflow-auto">
      <div class="grid grid-cols-4 gap-4">
        <Card title="Release">
          <div class="text-[var(--pd-content-card-header-text)]">{release?.name}</div>
          <div class="mt-1 flex gap-1"><Chip label={release?.version ?? ''} tone="primary" /><Chip label="DSC {String(dsc?.status?.phase ?? '')}" tone="success" /></div>
        </Card>
        <Card title="Data science projects">
          <button class="text-2xl font-semibold text-[var(--pd-content-card-header-text)] hover:underline" onclick={go.bind(undefined, 'rhoai-projects')}>{objects.filter(o => o.kind === 'Namespace' && o.metadata.labels?.['opendatahub.io/dashboard']).length}</button>
        </Card>
        <Card title="Deployed models">
          <button class="text-2xl font-semibold text-[var(--pd-content-card-header-text)] hover:underline" onclick={go.bind(undefined, 'rhoai-serving')}>{count('InferenceService', s => s.state === 'running')}<span class="text-sm font-normal"> / {count('InferenceService')} ready</span></button>
        </Card>
        <Card title="GPUs">
          <div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)]">3<span class="text-sm font-normal"> / 8 nvidia.com/gpu used</span></div>
        </Card>
      </div>
      <Card title="DataScienceCluster default-dsc · components">
        <div class="grid grid-cols-3 gap-x-6 gap-y-1.5">
          {#each components as [name, c] (name)}
            <div class="flex items-center justify-between rounded-md bg-[var(--pd-content-card-inset-bg)] px-3 py-1.5">
              <span class="font-mono text-xs text-[var(--pd-content-card-header-text)]">{name}</span>
              <Chip label={c.managementState} tone={c.managementState === 'Managed' ? 'success' : 'default'} />
            </div>
          {/each}
        </div>
      </Card>
    </div>
  {/snippet}
</NavPage>
