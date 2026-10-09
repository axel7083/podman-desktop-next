<script lang="ts">
/** P9 connection tab: header + in-page kind sub-tabs (core + contributed) + list. */
import { faMagnifyingGlass, faPlay, faPlus, faStop } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabTarget, resourcesOf } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import ResourceTable from '../ui/ResourceTable.svelte';
import { CTX_LABEL, ctxColor } from './ctx.ts';

interface Props {
  connId: string;
  sub: string;
  onsub: (sectionId: string) => void;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { connId, sub, onsub, onopen }: Props = $props();
let filter = $state('');
const c = $derived(findConn(connId));
const s = $derived(c?.sections.find(x => x.id === sub) ?? c?.sections[0]);
const rows = $derived(c && s ? resourcesOf(c.id, s.id).filter(r => r.name.toLowerCase().includes(filter.toLowerCase())) : []);
const col = $derived(lab.color ? ctxColor(connId) : undefined);
</script>

{#if c && s}
  <div class="flex flex-col h-full min-h-0">
    <div class="relative flex items-center gap-3 px-5 pt-4 pb-2">
      <ConnIcon connId={c.id} size={32} ring="var(--pd-content-bg)" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-[var(--pd-content-header)] truncate">{c.name}</h1>
          {#if CTX_LABEL[c.id]}<span class="px-1.5 rounded text-[10px] font-bold text-white bg-[var(--pd-status-dead)]">{CTX_LABEL[c.id]}</span>{/if}
          {#if col}<span class="w-2.5 h-2.5 rounded-full" style:background={col}></span>{/if}
        </div>
        <div class="text-sm text-[var(--pd-content-sub-header)] truncate">{c.product} · {c.detail} · {c.status}</div>
      </div>
      <Button type="secondary" icon={c.status === 'running' ? faStop : faPlay}>{c.status === 'running' ? 'Stop' : 'Start'}</Button>
    </div>
    <div role="tablist" aria-label="{c.name} kinds" class="flex gap-0.5 px-4 border-b border-[var(--pd-content-divider)] overflow-x-auto">
      {#each c.sections as sec (sec.id)}
        {@const on = sec.id === s.id}
        <button
          type="button"
          role="tab"
          aria-selected={on}
          class="flex items-center gap-1.5 px-2.5 py-2 border-b-2 text-sm whitespace-nowrap {on ? 'border-[var(--pd-tab-highlight)] text-[var(--pd-tab-text-highlight)]' : 'border-transparent text-[var(--pd-tab-text)] hover:text-[var(--pd-tab-text-highlight)]'}"
          onclick={(): void => onsub(sec.id)}>
          <AppIcon icon={sec.icon} size="14px" />{sec.label}
          {#if sec.ext}<AppIcon icon={sec.ext.icon} size="11px" />{/if}
          <span class="opacity-60 tabular-nums">{resourcesOf(c.id, sec.id).length}</span>
        </button>
      {/each}
    </div>
    <div class="flex items-center gap-2 px-5 py-3">
      <label class="flex items-center gap-2 w-72 h-8 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
        <AppIcon icon={faMagnifyingGlass} size="xs" />
        <input class="flex-1 bg-transparent outline-none text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" placeholder="Search {rows.length} {s.label.toLowerCase()}" bind:value={filter} />
      </label>
      <span class="flex-1"></span>
      <Button icon={faPlus} onclick={(): void => lab.openCreate(`Create in ${c.name}`)}>Create</Button>
    </div>
    <div class="flex-1 min-h-0 overflow-auto px-5 pb-4">
      <ResourceTable {rows} icon={s.icon} {onopen} />
    </div>
  </div>
{/if}
