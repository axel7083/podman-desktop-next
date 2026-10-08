<script lang="ts">
/** Model registry (Kubeflow Model Registry): registered models, versions and artifacts. */
import { faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, NavPage } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import KubeIcon from '#lib/images/KubeIcon.svelte';

import Card from '../../ai-lab/components/ui/Card.svelte';
import Chip from '../../ai-lab/components/ui/Chip.svelte';
import { deployInferenceService } from '../shared.ts';
import { world } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

interface Version {
  name: string;
  author: string;
  uri: string;
  modelFormatName: string;
}

const models = $derived((world.kube[conn.id] ?? []).filter(o => o.kind === 'RegisteredModel'));

function deploy(model: string, v: Version): void {
  deployInferenceService({ name: `${model}-${v.name}`.replace(/\./g, '-'), namespace: 'sam-ai', storageUri: v.uri });
}
</script>

<NavPage title="Model registry" searchEnabled={false}>
  {#snippet content()}
    <div class="flex flex-col gap-4 px-5 py-4 w-full overflow-auto">
      {#each models as m (m.metadata.uid)}
        <Card title={m.metadata.name}>
          {#snippet actions()}<Chip label="LIVE" tone="success" /><Chip label="owner {String(m.spec?.owner)}" />{/snippet}
          <ul class="divide-y divide-[var(--pd-content-divider)]">
            {#each (m.spec?.versions as Version[]) ?? [] as v (v.name)}
              <li class="flex items-center gap-3 py-2">
                <Chip label={v.name} tone="primary" />
                <span class="grow font-mono text-xs truncate" title={v.uri}>{v.uri}</span>
                <Chip label={v.modelFormatName} />
                <span class="text-xs">by {v.author}</span>
                <Button type="secondary" icon={faCloudArrowUp} onclick={deploy.bind(undefined, m.metadata.name, v)}>Deploy</Button>
              </li>
            {/each}
          </ul>
        </Card>
      {:else}
        <EmptyScreen icon={KubeIcon} title="No registered models" message="Register a ModelCar image from its ModelCar tab." />
      {/each}
    </div>
  {/snippet}
</NavPage>
