<script lang="ts">
import { faFileContract, faPlay } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import KubeResourceList from '#lib/resources/KubeResourceList.svelte';
import { type KubeObject, runTask } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

function comps(o: KubeObject): string {
  return ((o.spec?.components as { name: string }[] | undefined) ?? []).map(c => c.name).join(', ');
}

function validate(): void {
  runTask({
    name: 'Validate snapshot payments-20261008-0912 with Conforma',
    ext: 'redhat.konflux',
    steps: [
      { label: 'ec validate image --images snapshot.json --policy k8s://acme-tenant/acme-release-policy', ms: 1800, log: ['payments-api: success', 'payments-worker: success', 'junit report written'] },
    ],
  });
}

function runLocally(): void {
  runTask({
    name: 'Run snapshot payments-20261008-0912 locally',
    ext: 'redhat.konflux',
    action: { label: 'Open pods', href: '/c/podman-machine-default/pods' },
    steps: [
      { label: 'Pulling quay.io/redhat-user-workloads/acme-tenant/payments-api@sha256:2a9e4c7b', ms: 1400 },
      { label: 'Pulling quay.io/redhat-user-workloads/acme-tenant/payments-worker@sha256:5d1e0aa3', ms: 1200 },
      { label: 'Creating pod payments on podman-machine-default', ms: 800 },
    ],
  });
}
</script>

<KubeResourceList
  {conn}
  title="Snapshots"
  kinds={['Snapshot']}
  columns={[
    { title: 'Application', value: (o): string => String(o.spec?.application ?? '') },
    { title: 'Components', width: '2fr', value: comps },
    { title: 'Tests', value: (o): string => (o.status?.AppStudioTestSucceeded === 'True' ? 'Succeeded' : 'Running') },
  ]}>
  {#snippet additionalActions()}
    <Button icon={faFileContract} onclick={validate}>Validate with Conforma</Button>
    <Button icon={faPlay} onclick={runLocally}>Run locally</Button>
  {/snippet}
</KubeResourceList>
