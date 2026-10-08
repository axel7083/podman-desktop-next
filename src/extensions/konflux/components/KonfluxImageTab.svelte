<script lang="ts">
/** Image › Konflux: which build produced this digest (payments-api). */
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

import { KONFLUX } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const image = $derived(ctx.resource as ContainerImage);

const rows: [string, string][] = [
  ['Application', 'payments (acme-tenant)'],
  ['Component', 'payments-api'],
  ['Build PipelineRun', 'payments-api-on-push-r9d4m (Succeeded)'],
  ['Commit', 'b77f210 · github.com/acme/payments@main'],
  ['Snapshot', 'payments-20261008-0912 (tests succeeded)'],
  ['Release', 'payments-1-5-0-rel-x8wp → quay.io/acme/payments-api:1.5.0 (Succeeded)'],
  ['Integration tests', 'payments-enterprise-contract-5tq2z (Succeeded)'],
];

function open(section: string): void {
  navigate(`/c/${KONFLUX}/${section}`);
}
</script>

<div role="region" class="px-5 py-4 space-y-3 text-[var(--pd-content-text)]" aria-label="Konflux build">
  <div class="flex items-center gap-2 text-[var(--pd-state-success)]"><Icon icon={faCircleCheck} /> Built in Konflux, signed by Tekton Chains with SLSA v1 provenance</div>
  <table class="w-full rounded-lg bg-[var(--pd-content-card-bg)]">
    <tbody>
      <tr><td class="p-2 w-48">Digest</td><td class="p-2 font-mono text-sm break-all">{image.digest}</td></tr>
      {#each rows as [k, v] (k)}<tr class="border-t border-[var(--pd-content-divider)]"><td class="p-2">{k}</td><td class="p-2">{v}</td></tr>{/each}
    </tbody>
  </table>
  <div class="flex gap-2">
    <Button onclick={open.bind(undefined, 'konflux-pipelineruns')}>Open PipelineRuns</Button>
    <Button type="secondary" onclick={open.bind(undefined, 'konflux-releases')}>Open releases</Button>
  </div>
</div>
