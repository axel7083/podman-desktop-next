<script lang="ts">
// Markup from PD container/ContainerColumnNameContainer.svelte
import Badge from '#lib/components/Badge.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { navigate } from '#lib/nav.ts';

import type { NameCellData } from './types.ts';

interface Props {
  object: NameCellData;
}

let { object }: Props = $props();

function open(): void {
  if (object.href) navigate(object.href);
}
</script>

<button class="flex flex-col whitespace-nowrap max-w-full text-left" onclick={open} disabled={!object.href}>
  <div class="flex items-center max-w-full">
    <div class="max-w-full">
      <div class="flex flex-nowrap max-w-full items-center gap-1.5">
        <div
          class="text-[var(--pd-table-body-text-highlight)] overflow-hidden text-ellipsis group-hover:text-[var(--pd-link)]"
          title={object.title}>
          {object.title}
        </div>
        {#each object.badges ?? [] as b (b.ext.id + b.label)}
          <Contribution ext={b.ext} kind="column badge" api="P14">
            <Badge label={b.label} color="bg-[var(--pd-label-bg)]" class="text-[var(--pd-label-text)]" title="From {b.ext.displayName}" />
          </Contribution>
        {/each}
      </div>
      {#if object.sub?.length}
        <div class="flex flex-nowrap text-xs font-extra-light text-[var(--pd-table-body-text)] items-center max-w-full">
          {#each object.sub as s, i (i)}
            <div class="max-w-fit overflow-hidden text-ellipsis" class:pl-2={i > 0}>{s}</div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</button>
