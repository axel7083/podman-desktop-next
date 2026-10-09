<script lang="ts">
/** PD-style table (header + 40px rows, group cards for compose/pod). */
import { faChevronDown, faChevronRight, faEllipsisVertical, faPlay, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import StatusDotIcon from '#lib/components/StatusDotIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn, type LabResource, type LabTarget } from '../data.ts';
import ConnIcon from './ConnIcon.svelte';

interface Props {
  rows: LabResource[];
  icon: IconRef;
  showProvider?: boolean;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
  selected?: string;
}

let { rows, icon, showProvider = false, onopen, selected }: Props = $props();

let collapsed = $state<string[]>([]);

interface Line {
  group?: string;
  count?: number;
  row?: LabResource;
  indent?: boolean;
}

const lines = $derived.by((): Line[] => {
  const out: Line[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.group) {
      if (seen.has(r.group)) continue;
      seen.add(r.group);
      const members = rows.filter(x => x.group === r.group);
      out.push({ group: r.group, count: members.length });
      if (!collapsed.includes(r.group)) for (const m of members) out.push({ row: m, indent: true });
    } else out.push({ row: r });
  }
  return out;
});

function statusOf(s: string): string {
  return s === 'ready' ? 'running' : s === 'error' ? 'dead' : s;
}

function target(r: LabResource): LabTarget {
  return { kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id };
}
</script>

<div class="text-[var(--pd-table-body-text)]">
  <div class="grid items-center h-8 px-3 text-sm font-semibold text-[var(--pd-table-header-text)] border-b border-[var(--pd-content-divider)] sticky top-0 bg-[var(--pd-content-bg)] z-10"
    style:grid-template-columns={showProvider ? '28px 32px minmax(0,1fr) 190px 110px 96px' : '28px 32px minmax(0,1fr) 110px 96px'}>
    <input type="checkbox" aria-label="Select all" class="accent-[var(--pd-input-checkbox-checked)]" />
    <span>Status</span>
    <span class="pl-2">Name</span>
    {#if showProvider}<span>Connection</span>{/if}
    <span>Age</span>
    <span class="text-right pr-2">Actions</span>
  </div>
  {#each lines as line, i (line.group ? `g:${line.group}` : `r:${line.row?.id}:${i}`)}
    {#if line.group}
      {@const open = !collapsed.includes(line.group)}
      <button
        type="button"
        class="w-full flex items-center gap-2 h-9 px-3 mt-1 text-left font-semibold rounded-t-md bg-[var(--pd-content-card-bg)] border-t border-x border-[var(--pd-content-card-border)] hover:bg-[var(--pd-content-card-hover-bg)]"
        onclick={(): void => {
          collapsed = open ? [...collapsed, line.group!] : collapsed.filter(g => g !== line.group);
        }}>
        <span class="w-3 text-[10px]"><AppIcon icon={open ? faChevronDown : faChevronRight} /></span>
        <span class="text-[var(--pd-table-body-text-highlight)]">{line.group}</span>
        <span class="text-sm opacity-60">{line.group.endsWith('pod') ? 'Pod' : 'Compose'} · {line.count}</span>
      </button>
    {:else if line.row}
      {@const r = line.row}
      {@const sel = selected === r.id}
      <div
        role="row"
        tabindex="0"
        class="grid items-center h-10 px-3 cursor-pointer border-b border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)]"
        class:bg-[var(--pd-content-card-selected-bg)]={sel}
        class:bg-[var(--pd-content-card-bg)]={line.indent && !sel}
        class:border-x={line.indent}
        class:border-[var(--pd-content-card-border)]={line.indent}
        style:grid-template-columns={showProvider ? '28px 32px minmax(0,1fr) 190px 110px 96px' : '28px 32px minmax(0,1fr) 110px 96px'}
        onclick={(): void => onopen(target(r), { preview: true })}
        ondblclick={(): void => onopen(target(r), { preview: false })}
        onkeydown={(e): void => {
          if (e.key === 'Enter') onopen(target(r), { preview: false });
        }}>
        <input type="checkbox" aria-label="Select {r.name}" onclick={(e): void => e.stopPropagation()} />
        <span class="flex items-center gap-1 text-[var(--pd-table-body-text-sub-secondary)]" style:font-size="16px">
          <span class="relative"><AppIcon {icon} size="18px" /><StatusDotIcon status={statusOf(r.status)} size="9" class="absolute -bottom-0.5 -right-1" /></span>
        </span>
        <span class="pl-2 min-w-0 flex flex-col leading-tight">
          <span class="truncate text-[var(--pd-table-body-text-highlight)] font-medium" class:pl-3={line.indent}>{r.name}</span>
          <span class="truncate text-sm text-[var(--pd-table-body-text-sub-secondary)]" class:pl-3={line.indent}>{r.sub}</span>
        </span>
        {#if showProvider}
          <span class="flex items-center gap-1.5 min-w-0 text-sm">
            <ConnIcon connId={r.connId} size={14} ring="var(--pd-content-bg)" /><span class="truncate">{findConn(r.connId)?.name}</span>
          </span>
        {/if}
        <span class="text-sm text-[var(--pd-table-body-text)] opacity-80">{r.age}</span>
        <span class="flex justify-end gap-0.5 text-[var(--pd-action-button-details-text)]">
          <button type="button" aria-label="Start/stop" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-inset-bg)]" onclick={(e): void => e.stopPropagation()}><AppIcon icon={r.status === 'running' ? faStop : faPlay} size="xs" /></button>
          <button type="button" aria-label="Delete" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-inset-bg)]" onclick={(e): void => e.stopPropagation()}><AppIcon icon={faTrash} size="xs" /></button>
          <button type="button" aria-label="More actions" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-inset-bg)]" onclick={(e): void => e.stopPropagation()}><AppIcon icon={faEllipsisVertical} size="xs" /></button>
        </span>
      </div>
    {/if}
  {/each}
</div>
