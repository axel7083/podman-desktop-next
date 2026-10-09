<script lang="ts">
/**
 * Round-2 Dashboard: per-connection health cards grouped like today's
 * Resources settings (Engines / Kubernetes / VMs & services). Card click =
 * apply facet (P8) / open connection (P9) / switch context (P10, P6).
 */
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { CONN_GROUPS, CONNECTIONS, type LabConnection } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import { countFor, CTX_LABEL, ctxColor, kindsOf } from './ctx.ts';

interface Props {
  onpick: (connId: string, kindId?: string) => void;
  /** Highlighted (faceted / in scope) connections. */
  selected?: string[];
  hint?: string;
  /** Only show these connections (scope). */
  only?: string[];
}

let { onpick, selected = [], hint = 'Click a card to open it.', only }: Props = $props();

function stats(c: LabConnection): { id: string; label: string; n: number }[] {
  return kindsOf(c)
    .slice(0, 3)
    .map(k => ({ id: k.id, label: k.label, n: countFor(k.id, [c.id]) }));
}

function load(c: LabConnection): number {
  return c.status === 'running' ? 18 + ((c.name.length * 13) % 60) : c.status === 'starting' ? 8 : 0;
}

const visible = $derived(only ? CONNECTIONS.filter(c => only.includes(c.id)) : CONNECTIONS);
</script>

<div class="h-full overflow-auto">
  <div class="flex items-center gap-3 px-5 pt-4 pb-3">
    <div class="flex-1 min-w-0">
      <h1 class="text-xl font-bold text-[var(--pd-content-header)]">Dashboard</h1>
      <div class="text-sm text-[var(--pd-content-sub-header)]">{visible.length} connections · {visible.filter(c => c.status === 'running').length} running · {visible.filter(c => c.status === 'error').length} need attention · {hint}</div>
    </div>
    <Button icon={faPlus} onclick={(): void => lab.openCreate('Create a connection')}>Create</Button>
  </div>
  {#each CONN_GROUPS as g (g)}
    {@const list = visible.filter(c => c.group === g)}
    {#if list.length}
      <div class="px-5 pb-1.5 text-base font-semibold text-[var(--pd-content-card-header-text)]">{g} <span class="opacity-50 font-normal">{list.length}</span></div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3 px-5 pb-4">
        {#each list as c (c.id)}
          {@const col = lab.color ? ctxColor(c.id) : undefined}
          {@const sel = selected.includes(c.id)}
          <div
            role="button"
            tabindex="0"
            class="relative flex flex-col gap-2 p-3 pt-3.5 rounded-lg bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left cursor-pointer overflow-hidden border"
            class:border-[var(--pd-tab-highlight)]={sel}
            class:border-transparent={!sel}
            onclick={(): void => onpick(c.id)}
            onkeydown={(e): void => { if (e.key === 'Enter') onpick(c.id); }}>
            {#if col}<span class="absolute left-0 right-0 top-0 h-1" style:background={col}></span>{/if}
            <div class="flex items-center gap-2.5 min-w-0">
              <ConnIcon connId={c.id} size={26} ring="var(--pd-content-card-bg)" />
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5">
                  <span class="font-semibold truncate text-[var(--pd-content-card-header-text)]">{c.name}</span>
                  {#if CTX_LABEL[c.id]}<span class="px-1 rounded text-[9px] font-bold text-white bg-[var(--pd-status-dead)]">{CTX_LABEL[c.id]}</span>{/if}
                </span>
                <span class="block text-sm truncate text-[var(--pd-content-card-text)]">{c.product} · <span class:text-[var(--pd-status-dead)]={c.status === 'error'}>{c.status}</span></span>
              </span>
            </div>
            <div class="flex gap-1">
              {#each stats(c) as s (s.id)}
                <button
                  type="button"
                  class="flex-1 flex flex-col items-start px-2 py-1 rounded bg-[var(--pd-content-card-inset-bg)] hover:outline hover:outline-1 hover:outline-[var(--pd-tab-highlight)]"
                  title="{c.name} › {s.label}"
                  onclick={(e): void => {
                    e.stopPropagation();
                    onpick(c.id, s.id);
                  }}>
                  <span class="text-lg font-semibold leading-tight text-[var(--pd-content-card-header-text)]">{s.n}</span>
                  <span class="text-xs text-[var(--pd-content-card-text)]">{s.label}</span>
                </button>
              {/each}
            </div>
            <div class="flex items-center gap-2 text-xs text-[var(--pd-content-card-text)]">
              <span class="w-8">CPU</span>
              <span class="flex-1 h-1.5 rounded-full bg-[var(--pd-content-card-inset-bg)] overflow-hidden"><span class="block h-full rounded-full bg-[var(--pd-status-running)]" style:width="{load(c)}%"></span></span>
              <span class="w-8 text-right tabular-nums">{load(c)}%</span>
              {#each c.sections.filter(s => s.ext).slice(0, 4) as s (s.id)}<span title={s.ext?.name}><AppIcon icon={s.ext?.icon} size="12px" /></span>{/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/each}
</div>
