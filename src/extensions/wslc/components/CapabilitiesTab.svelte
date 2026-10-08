<script lang="ts">
/**
 * Engine capability matrix (P11: open engine type + capability flags).
 * Highlights the column of the current connection's engine.
 */
import { faCheck, faCircleInfo, faMinus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ResourceContext } from '#lib/ext/types.ts';

import { CAPABILITIES, ENGINE_BANNERS, ENGINE_COLUMNS, type EngineColumn, type Support } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const current = $derived((ctx.conn.engineType ?? 'podman') as EngineColumn);
const banner = $derived(ENGINE_BANNERS[current]);

const SUPPORT_ICON: Record<Support, typeof faCheck> = { yes: faCheck, no: faXmark, partial: faMinus };
const SUPPORT_CLASS: Record<Support, string> = {
  yes: 'text-[var(--pd-status-running)]',
  no: 'text-[var(--pd-status-terminated)]',
  partial: 'text-[var(--pd-status-degraded)]',
};
const SUPPORT_LABEL: Record<Support, string> = { yes: 'Supported', no: 'Not supported', partial: 'Partially supported' };
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4">
  {#if banner}
    <div class="flex items-start gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] border-l-4 border-[var(--pd-state-info)]" role="note" aria-label="Engine limitations">
      <Icon icon={faCircleInfo} class="text-[var(--pd-state-info)] mt-0.5" />
      <span>{banner}</span>
    </div>
  {/if}
  <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4">
    <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-1">Engine capabilities</h2>
    <p class="text-sm text-[var(--pd-content-card-text)] mb-3">What {ctx.conn.name} can do compared with the other container engines Podman Desktop supports.</p>
    <table class="w-full table-fixed text-[var(--pd-content-card-text)]" aria-label="Engine capabilities">
      <thead>
        <tr>
          <th class="w-48 text-left py-2 text-[var(--pd-table-header-text)] font-semibold">Capability</th>
          {#each ENGINE_COLUMNS as col (col.id)}
            <th
              class="text-left py-2 px-3 font-semibold rounded-t-md {col.id === current
                ? 'bg-[var(--pd-content-card-selected-bg)] text-[var(--pd-content-card-header-text)]'
                : 'text-[var(--pd-table-header-text)]'}"
              aria-current={col.id === current ? 'true' : undefined}>
              <span class="flex items-center gap-2">
                <AppIcon icon={col.icon} size="16px" />
                {col.label}
                {#if col.id === current}<span class="text-xs font-normal text-[var(--pd-content-card-light-title)]">(this engine)</span>{/if}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each CAPABILITIES as row (row.id)}
          <tr class="border-t border-[var(--pd-content-divider)]">
            <th scope="row" class="text-left py-2 font-normal text-[var(--pd-table-body-text-highlight)]">{row.label}</th>
            {#each ENGINE_COLUMNS as col (col.id)}
              {@const cell = row.cells[col.id]}
              <td class="py-2 px-3 align-top {col.id === current ? 'bg-[var(--pd-content-card-selected-bg)]' : ''}">
                <span class="flex items-start gap-2">
                  <span class="mt-0.5 {SUPPORT_CLASS[cell.support]}" title={SUPPORT_LABEL[cell.support]} aria-label="{col.label}: {SUPPORT_LABEL[cell.support]}">
                    <Icon icon={SUPPORT_ICON[cell.support]} />
                  </span>
                  {#if cell.note}<span class="text-xs text-[var(--pd-table-body-text)]">{cell.note}</span>{/if}
                </span>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
