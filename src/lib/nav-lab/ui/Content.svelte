<script lang="ts">
/**
 * Renders any lab target: list, resource details (Summary | Inspect | Split),
 * connection overview, tool page, dashboard, catalogs and stubs.
 */
import { faMagnifyingGlass, faPlay, faPlus, faRotateRight, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import StatusDotIcon from '#lib/components/StatusDotIcon.svelte';

import {
  CONN_GROUPS,
  CONNECTIONS,
  conn as findConn,
  KINDS,
  type LabTarget,
  RESOURCES,
  resource,
  resourcesOf,
  section as findSection,
  tool as findTool,
  TOOL_CATEGORIES,
  TOOLS,
  WORKFLOWS,
} from '../data.ts';
import { describe, lab } from '../lab.svelte.ts';
import ConnIcon from './ConnIcon.svelte';
import ResourceTable from './ResourceTable.svelte';
import TabIcon from './TabIcon.svelte';

interface Props {
  target: LabTarget | undefined;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
  /** P4: connection scope for kind lists (empty = all). */
  scope?: string[];
  scopeBar?: Snippet;
  /** Hide the connection chip in list headers (P4 lists span connections). */
  selectedRes?: string;
  /** Round 2: hide the kind-list title row (P7 breadcrumb replaces it). */
  headerless?: boolean;
  /** Round 2: extra controls next to the kind-list title (favourite star…). */
  titleExtra?: Snippet;
  /** Round 2: prefilled list filter (omnibox "show all matches"). */
  initialFilter?: string;
}

let { target, onopen, scope = [], scopeBar, selectedRes, headerless = false, titleExtra, initialFilter = '' }: Props = $props();

let view = $state<'summary' | 'inspect' | 'split'>('summary');
// svelte-ignore state_referenced_locally
let filter = $state(initialFilter);

const info = $derived(target ? describe(target) : undefined);
const c = $derived(findConn(target?.connId));
const s = $derived(findSection(c, target?.sectionId));

const listRows = $derived.by(() => {
  if (!target) return [];
  const f = filter.toLowerCase();
  if (target.kind === 'list' && c && s) return resourcesOf(c.id, s.id).filter(r => r.name.toLowerCase().includes(f));
  if (target.kind === 'kind') {
    const k = KINDS.find(x => x.id === target.kindId);
    const secs = target.sectionId ? [target.sectionId] : (k?.sections ?? []);
    return RESOURCES.filter(r => secs.includes(r.sectionId) && (scope.length === 0 || scope.includes(r.connId)) && r.name.toLowerCase().includes(f));
  }
  return [];
});

const kindIcon = $derived.by(() => {
  if (target?.kind !== 'kind') return s?.icon;
  const k = KINDS.find(x => x.id === target.kindId);
  if (target.sectionId) {
    for (const cc of CONNECTIONS) {
      const sec = cc.sections.find(x => x.id === target.sectionId);
      if (sec) return sec.icon;
    }
  }
  return k?.icon;
});

const kindTitle = $derived.by(() => {
  if (target?.kind !== 'kind') return '';
  const k = KINDS.find(x => x.id === target.kindId);
  if (target.sectionId) {
    for (const cc of CONNECTIONS) {
      const sec = cc.sections.find(x => x.id === target.sectionId);
      if (sec) return sec.label;
    }
  }
  return k?.label ?? '';
});

const res = $derived(resource(target?.resId));
const connCount = $derived(new Set(listRows.map(r => r.connId)).size);

function inspectJson(): string {
  return JSON.stringify(
    {
      Id: (res?.id ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 12).padEnd(12, '0') + 'a3f9c1e07b2d',
      Name: res?.name ?? c?.name,
      Connection: c?.name,
      Kind: s?.label ?? target?.kind,
      State: { Status: res?.status ?? c?.status, StartedAt: '2026-10-09T07:12:01Z' },
      Config: { Image: res?.sub, Labels: { 'io.podman.desktop.group': res?.group ?? null } },
    },
    null,
    2,
  );
}
</script>

{#snippet header(title: string, sub?: string)}
  <div class="flex items-center gap-3 px-5 pt-4 pb-3">
    <div class="min-w-0 flex-1">
      <h1 class="text-xl font-bold text-[var(--pd-content-header)] truncate">{title}</h1>
      {#if sub}<div class="text-sm text-[var(--pd-content-sub-header)] truncate">{sub}</div>{/if}
    </div>
  </div>
{/snippet}

{#snippet searchRow(createLabel: string, count: number)}
  <div class="flex items-center gap-2 px-5 pb-3">
    <label class="flex items-center gap-2 w-72 h-8 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
      <AppIcon icon={faMagnifyingGlass} size="xs" />
      <input class="flex-1 bg-transparent outline-none text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" placeholder="Search {count} items" bind:value={filter} />
    </label>
    <span class="flex-1"></span>
    <Button icon={faPlus} onclick={(): void => lab.openCreate(createLabel)}>{createLabel}</Button>
  </div>
{/snippet}

{#if !target || !info}
  <div class="flex-1 flex items-center justify-center text-[var(--pd-details-empty-sub-header)]">Nothing open. Pick something on the left.</div>
{:else if target.kind === 'list' && c && s}
  <div class="flex flex-col h-full min-h-0">
    <div class="flex items-center gap-3 px-5 pt-4 pb-3">
      <span class="text-[var(--pd-content-header-icon)]" style:font-size="20px"><AppIcon icon={s.icon} size="22px" /></span>
      <h1 class="text-xl font-bold text-[var(--pd-content-header)]">{s.label}</h1>
      <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] text-sm"><ConnIcon connId={c.id} size={14} ring="var(--pd-label-bg)" />{c.name}</span>
      {#if s.ext}<span class="flex items-center gap-1 text-sm text-[var(--pd-content-sub-header)]"><AppIcon icon={s.ext.icon} size="12px" />{s.ext.name}</span>{/if}
    </div>
    {@render searchRow(s.id === 'images' ? 'Pull image' : s.id === 'containers' ? 'Create container' : `Create ${s.label.toLowerCase().replace(/s$/, '')}`, listRows.length)}
    <div class="flex-1 min-h-0 overflow-auto px-5 pb-4">
      <ResourceTable rows={listRows} icon={s.icon} {onopen} selected={selectedRes} />
    </div>
  </div>
{:else if target.kind === 'kind'}
  <div class="flex flex-col h-full min-h-0">
    {#if !headerless}
      <div class="flex items-center gap-3 px-5 pt-4 pb-2">
        <span class="text-[var(--pd-content-header-icon)]" style:font-size="20px"><AppIcon icon={kindIcon} size="22px" /></span>
        <h1 class="text-xl font-bold text-[var(--pd-content-header)]">{kindTitle}</h1>
        <span class="text-sm text-[var(--pd-content-sub-header)]">{listRows.length} across {connCount} connection{connCount === 1 ? '' : 's'}</span>
        {#if titleExtra}{@render titleExtra()}{/if}
      </div>
    {:else}
      <div class="h-3"></div>
    {/if}
    {#if scopeBar}<div class="px-5 pb-2">{@render scopeBar()}</div>{/if}
    {@render searchRow(target.kindId === 'images' ? 'Pull image' : `Create ${kindTitle.toLowerCase().replace(/s$/, '')}`, listRows.length)}
    <div class="flex-1 min-h-0 overflow-auto px-5 pb-4">
      <ResourceTable rows={listRows} icon={kindIcon ?? faPlay} showProvider={connCount > 1 || scope.length !== 1} {onopen} selected={selectedRes} />
    </div>
  </div>
{:else if target.kind === 'resource' && res && c && s}
  <div class="flex flex-col h-full min-h-0 bg-[var(--pd-details-bg)]">
    <div class="flex items-start gap-3 px-5 pt-3 pb-3 border-b border-[var(--pd-content-divider)]">
      <div class="mt-1 text-[var(--pd-content-header-icon)]"><TabIcon icon={s.icon} connId={c.id} size={30} /></div>
      <div class="min-w-0 flex-1">
        <div class="text-sm text-[var(--pd-content-breadcrumb)] truncate" class:hidden={headerless}>
          <button type="button" class="hover:underline" onclick={(): void => onopen({ kind: 'connection', connId: c.id }, {})}>{c.name}</button>
          <span class="mx-1">›</span>
          <button type="button" class="hover:underline" onclick={(): void => onopen({ kind: 'list', connId: c.id, sectionId: s.id }, {})}>{s.label}</button>
        </div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-[var(--pd-content-header)] truncate">{res.name}</h1>
          <StatusDotIcon status={res.status === 'ready' ? 'running' : res.status} size="12" />
          <span class="text-sm text-[var(--pd-content-sub-header)]">{res.status}</span>
        </div>
        <div class="text-sm text-[var(--pd-content-sub-header)] truncate">{res.sub}</div>
      </div>
      <div class="flex items-center gap-1 text-[var(--pd-action-button-details-text)]">
        {#each [faStop, faRotateRight, faTrash] as ic, i (i)}
          <button type="button" aria-label="Action {i}" class="w-7 h-7 rounded bg-[var(--pd-action-button-details-bg)] hover:text-[var(--pd-action-button-details-hover-text)]"><AppIcon icon={ic} size="xs" /></button>
        {/each}
      </div>
      <div role="radiogroup" aria-label="View" class="flex items-center ml-2 p-0.5 rounded-md border border-[var(--pd-content-divider)] bg-[var(--pd-content-card-inset-bg)]">
        {#each [['summary', 'Summary'], ['inspect', 'Inspect'], ['split', 'Split']] as [id, label] (id)}
          <button
            type="button"
            role="radio"
            aria-checked={view === id}
            class="px-2.5 h-6 rounded text-sm"
            class:bg-[var(--pd-button-primary-bg)]={view === id}
            class:text-[var(--pd-button-primary-text)]={view === id}
            class:text-[var(--pd-tab-text)]={view !== id}
            onclick={(): void => {
              view = id as typeof view;
            }}>{label}</button>
        {/each}
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-auto p-5 grid gap-4" class:grid-cols-2={view === 'split'}>
      {#if view !== 'inspect'}
        <div class="flex flex-col gap-4 min-w-0">
          <div class="rounded-lg bg-[var(--pd-details-card-bg)] p-4">
            <div class="text-lg font-semibold text-[var(--pd-details-card-header)] mb-2">Details</div>
            <dl class="grid grid-cols-[140px_1fr] gap-y-1.5 text-[var(--pd-details-card-text)]">
              <dt class="opacity-70">Name</dt><dd class="truncate">{res.name}</dd>
              <dt class="opacity-70">Kind</dt><dd>{s.label}{#if s.ext} · via {s.ext.name}{/if}</dd>
              <dt class="opacity-70">Connection</dt><dd class="flex items-center gap-1.5"><ConnIcon connId={c.id} size={14} ring="var(--pd-details-card-bg)" />{c.name} <span class="opacity-60">({c.product})</span></dd>
              <dt class="opacity-70">Status</dt><dd>{res.status}</dd>
              <dt class="opacity-70">Created</dt><dd>{res.age} ago</dd>
              {#if res.group}<dt class="opacity-70">Group</dt><dd>{res.group}</dd>{/if}
              <dt class="opacity-70">Info</dt><dd class="truncate">{res.sub}</dd>
            </dl>
          </div>
          <div class="rounded-lg bg-[var(--pd-details-card-bg)] p-4">
            <div class="text-lg font-semibold text-[var(--pd-details-card-header)] mb-2">Activity</div>
            <div class="flex items-end gap-1 h-16">
              {#each Array.from({ length: 36 }, (_, i) => 20 + ((i * 37 + res.name.length * 11) % 70)) as h, i (i)}
                <span class="flex-1 rounded-sm bg-[var(--pd-tab-highlight)] opacity-70" style:height="{h}%"></span>
              {/each}
            </div>
          </div>
        </div>
      {/if}
      {#if view !== 'summary'}
        <pre class="m-0 min-w-0 overflow-auto rounded-lg p-4 font-mono text-[12px] leading-5 bg-[var(--pd-code-block-bg)] text-[var(--pd-code-block-text)] border border-[var(--pd-code-block-border)]">{inspectJson()}</pre>
      {/if}
    </div>
  </div>
{:else if target.kind === 'connection' && c}
  <div class="h-full overflow-auto">
    <div class="flex items-center gap-3 px-5 pt-4 pb-3">
      <ConnIcon connId={c.id} size={36} ring="var(--pd-content-bg)" />
      <div>
        <h1 class="text-xl font-bold text-[var(--pd-content-header)]">{c.name}</h1>
        <div class="text-sm text-[var(--pd-content-sub-header)]">{c.product} · {c.detail} · {c.status}</div>
      </div>
      <span class="flex-1"></span>
      <Button icon={c.status === 'running' ? faStop : faPlay}>{c.status === 'running' ? 'Stop' : 'Start'}</Button>
    </div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 px-5 pb-5">
      {#each c.sections as sec (sec.id)}
        <button type="button" class="flex flex-col items-start gap-1 p-3 rounded-lg bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left" onclick={(): void => onopen({ kind: 'list', connId: c.id, sectionId: sec.id }, {})}>
          <span class="flex items-center gap-2 text-[var(--pd-content-card-icon)]"><AppIcon icon={sec.icon} size="18px" />{#if sec.ext}<AppIcon icon={sec.ext.icon} size="12px" />{/if}</span>
          <span class="text-3xl font-semibold text-[var(--pd-content-card-header-text)]">{sec.count}</span>
          <span class="text-sm text-[var(--pd-content-card-text)]">{sec.label}</span>
        </button>
      {/each}
    </div>
  </div>
{:else if target.kind === 'tool'}
  {@const t = findTool(target.toolId)}
  {#if t}
    <div class="h-full overflow-auto">
      <div class="flex items-center gap-3 px-5 pt-4 pb-3">
        <AppIcon icon={t.icon} size="36px" />
        <div class="flex-1">
          <h1 class="text-xl font-bold text-[var(--pd-content-header)]">{t.name}</h1>
          <div class="text-sm text-[var(--pd-content-sub-header)]">{t.description} · {t.category}</div>
        </div>
        <Button icon={faPlus} onclick={(): void => lab.openCreate(`New in ${t.name}`)}>New…</Button>
      </div>
      <div class="flex gap-4 px-5 border-b border-[var(--pd-content-divider)] text-sm">
        {#each ['Overview', 'Recipes', 'Runs', 'Settings'] as tb, i (tb)}
          <span class="py-2 border-b-2" class:border-[var(--pd-tab-highlight)]={i === 0} class:text-[var(--pd-tab-text-highlight)]={i === 0} class:border-transparent={i !== 0} class:text-[var(--pd-tab-text)]={i !== 0}>{tb}</span>
        {/each}
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-5">
        {#each Array.from({ length: 9 }, (_, i) => i) as i (i)}
          <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 flex flex-col gap-2">
            <div class="h-3 w-2/3 rounded bg-[var(--pd-content-card-inset-bg)]"></div>
            <div class="h-2 w-full rounded bg-[var(--pd-content-card-inset-bg)] opacity-70"></div>
            <div class="h-2 w-4/5 rounded bg-[var(--pd-content-card-inset-bg)] opacity-70"></div>
            <div class="text-sm text-[var(--pd-content-card-text)]">{t.name} item {i + 1}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
{:else if target.kind === 'dashboard'}
  <div class="h-full overflow-auto">
    {@render header('Dashboard', `${CONNECTIONS.length} connections · ${CONNECTIONS.filter(x => x.status === 'running').length} running · ${TOOLS.length} tools`)}
    {#each CONN_GROUPS as g (g)}
      <div class="px-5 pb-1 text-lg font-semibold text-[var(--pd-content-card-header-text)]">{g}</div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 px-5 pb-4">
        {#each CONNECTIONS.filter(x => x.group === g) as cc (cc.id)}
          <button type="button" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left" onclick={(): void => onopen({ kind: 'connection', connId: cc.id }, {})}>
            <ConnIcon connId={cc.id} size={28} ring="var(--pd-content-card-bg)" />
            <span class="min-w-0">
              <span class="block font-semibold truncate text-[var(--pd-content-card-header-text)]">{cc.name}</span>
              <span class="block text-sm truncate text-[var(--pd-content-card-text)]">{cc.product} · {cc.status}</span>
            </span>
          </button>
        {/each}
      </div>
    {/each}
  </div>
{:else if target.kind === 'tools' || target.kind === 'extensions'}
  <div class="h-full overflow-auto">
    {@render header(target.kind === 'tools' ? 'Tools' : 'Extensions', `${TOOLS.length} installed`)}
    {#each TOOL_CATEGORIES as cat (cat)}
      <div class="px-5 pb-1 text-lg font-semibold text-[var(--pd-content-card-header-text)]">{cat}</div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 px-5 pb-4">
        {#each TOOLS.filter(x => x.category === cat) as t (t.id)}
          <button type="button" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left" onclick={(): void => onopen({ kind: 'tool', toolId: t.id }, {})}>
            <AppIcon icon={t.icon} size="28px" />
            <span class="min-w-0">
              <span class="block font-semibold truncate text-[var(--pd-content-card-header-text)]">{t.name}</span>
              <span class="block text-sm truncate text-[var(--pd-content-card-text)]">{t.description}</span>
            </span>
          </button>
        {/each}
      </div>
    {/each}
  </div>
{:else if target.kind === 'workflow'}
  {@const w = WORKFLOWS.find(x => x.id === target.workflowId)}
  <div class="h-full overflow-auto">
    {@render header(w?.name ?? 'Workflow', `${w?.steps} steps`)}
    <ol class="px-5 flex flex-col gap-2">
      {#each Array.from({ length: w?.steps ?? 3 }, (_, i) => i) as i (i)}
        <li class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
          <StatusDotIcon status={i < 2 ? 'running' : i === 2 ? 'starting' : 'created'} />
          <span>Step {i + 1}</span>
        </li>
      {/each}
    </ol>
  </div>
{:else}
  <div class="h-full overflow-auto">
    {@render header(info.title)}
    <div class="grid grid-cols-[200px_1fr] gap-4 px-5">
      <div class="flex flex-col gap-1 text-sm">
        {#each ['Resources', 'Proxy', 'Registries', 'Authentication', 'CLI tools', 'Kubernetes', 'Experimental', 'Preferences'] as it, i (it)}
          <span class="px-3 py-1.5 rounded" class:bg-[var(--pd-secondary-nav-selected-bg)]={i === 0}>{it}</span>
        {/each}
      </div>
      <div class="flex flex-col gap-2">
        {#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
          <div class="h-12 rounded-lg bg-[var(--pd-content-card-bg)]"></div>
        {/each}
      </div>
    </div>
  </div>
{/if}
