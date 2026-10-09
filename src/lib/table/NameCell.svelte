<script lang="ts">
// Markup from PD container/ContainerColumnNameContainer.svelte
import AppIcon from '#lib/components/AppIcon.svelte';
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
      {#if object.sub?.length || object.chip}
        <div class="flex flex-nowrap text-xs font-extra-light text-[var(--pd-table-body-text)] items-center max-w-full">
          {#if object.chip}
            <span
              class="mr-1 shrink-0 inline-flex items-center gap-1 rounded-sm pl-0.5 pr-1.5 leading-4 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]"
              title={object.chip.ext ? `Grouped by ${object.chip.ext.displayName}` : undefined}>
              {#if object.chip.icon}<AppIcon icon={object.chip.icon} size="12px" />{/if}{object.chip.label}
            </span>
          {/if}
          {#each object.sub ?? [] as s, i (i)}
            <div class="max-w-fit overflow-hidden text-ellipsis" class:pl-2={i > 0} class:shrink-0={i === 0} title={s}>{s}</div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</button>
