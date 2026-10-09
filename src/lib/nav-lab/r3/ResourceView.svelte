<script lang="ts">
/**
 * Compact resource tab (P13, also used by Content for P5/P12/P14): one-line
 * header (icon, name, status pill, connection chip, Summary | Inspect | Logs
 * (+ extension views), actions start/stop · restart · terminal · logs ·
 * delete · ⋮), dense key-value grids, no breadcrumbs.
 */
import {
  faAlignLeft,
  faArrowUpRightFromSquare,
  faEllipsisVertical,
  faPlay,
  faRotateRight,
  faStop,
  faTerminal,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { type LabConnection, type LabResource, type LabSection, type LabTarget, resourcesOf, STATUS_DOT } from '../data.ts';
import ActBtn from './ActBtn.svelte';
import { containerInfo, hash, imageInfo, inspectText, isKube, kubeConditions, kubeEvents, relatedPods } from './details.ts';
import { ext } from './exts.ts';
import Head from './Head.svelte';
import { can, deleteRes, extViews, isUp, live, logLine, openMenu, openTerminal, resActions, resStatus, restartRes, showLogs, startRes, stopRes } from './live.svelte.ts';

interface Props {
  res: LabResource;
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { res, c, s, onopen }: Props = $props();

// svelte-ignore state_referenced_locally
let view = $state(live.view[res.id] ?? 'summary');
let logs = $state<string[]>([]);

$effect(() => {
  const v = live.view[res.id];
  if (v) {
    view = v;
    delete live.view[res.id];
  }
});

const st = $derived(resStatus(res));
const up = $derived(isUp(st));
const deleted = $derived(live.deleted.includes(res.id));
const hasLogsView = $derived(['containers', 'pods', 'kpods'].includes(s.id));
const xviews = $derived(extViews(s.id));
const views = $derived<[string, string][]>([
  ['summary', 'Summary'],
  ['inspect', 'Inspect'],
  ...(hasLogsView ? ([['logs', 'Logs']] as [string, string][]) : []),
  ...xviews.map(v => [v.id, v.label] as [string, string]),
]);
const h = $derived(hash(res.name));
const icon = $derived(s.ext?.icon ?? s.icon);

$effect(() => {
  if (view !== 'logs') return;
  logs = Array.from({ length: 14 }, (_, i) => logLine(res.name, i));
  if (!up) return;
  const t = setInterval(() => {
    logs.push(logLine(res.name, logs.length));
  }, 800);
  return (): void => clearInterval(t);
});

function openRes(r: LabResource): void {
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}
</script>

{#snippet kv(k: string, v: string | number | undefined)}
  <div class="flex gap-2 min-w-0 leading-5"><dt class="w-24 shrink-0 text-[var(--pd-content-sub-header)] truncate">{k}</dt><dd class="truncate text-[var(--pd-details-card-text)]" title={String(v ?? '')}>{v ?? '—'}</dd></div>
{/snippet}

{#snippet block(title: string)}
  <div class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">{title}</div>
{/snippet}

{#snippet bars(values: number[], color = 'var(--pd-tab-highlight)')}
  <span class="flex items-end gap-px h-4 w-24">{#each values as v, i (i)}<span class="flex-1 rounded-[1px]" style:height="{Math.min(100, v * 2)}%" style:background={color}></span>{/each}</span>
{/snippet}

{#snippet resRow(r: LabResource, detail: string)}
  <button type="button" class="w-full flex items-center gap-2 h-6 px-3 text-left hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => openRes(r)}>
    <span class="w-1.5 h-1.5 rounded-full shrink-0 {STATUS_DOT[resStatus(r)] ?? STATUS_DOT.running}"></span>
    <span class="truncate">{r.name}</span><span class="text-xs text-[var(--pd-content-sub-header)] truncate">{detail}</span>
  </button>
{/snippet}

{#snippet table(rows: string[][], head: string[])}
  <table class="w-full text-sm">
    <thead><tr class="text-left text-[var(--pd-content-sub-header)]">{#each head as hd (hd)}<th class="font-normal px-3 h-6">{hd}</th>{/each}</tr></thead>
    <tbody>
      {#each rows as row, i (i)}
        <tr class="border-t border-[var(--pd-content-divider)]">{#each row as cell, j (j)}<td class="px-3 h-6 truncate max-w-[360px]" class:text-[var(--pd-status-degraded)]={cell === 'Warning' || cell === 'False'}>{cell}</td>{/each}</tr>
      {/each}
    </tbody>
  </table>
{/snippet}

{#snippet actions()}
  {#if up}
    <ActBtn icon={faStop} label="Stop" disabled={!can.start(s.id)} onclick={(): void => stopRes(res)} />
  {:else}
    <ActBtn icon={faPlay} label="Start" disabled={!can.start(s.id)} onclick={(): void => startRes(res)} />
  {/if}
  <ActBtn icon={faRotateRight} label="Restart" disabled={!can.start(s.id) || !up} onclick={(): void => restartRes(res)} />
  <ActBtn icon={faTerminal} label="Open terminal" disabled={!can.terminal(s.id) || !up} onclick={(): void => openTerminal(res)} />
  <ActBtn icon={faAlignLeft} label="Show logs" disabled={!can.logs(s.id)} onclick={(): void => showLogs(res)} />
  <ActBtn icon={faTrash} label="Delete" danger onclick={(): void => deleteRes(res)} />
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, resActions(res, onopen))} />
{/snippet}

<div class="flex flex-col h-full min-h-0 bg-[var(--pd-details-bg)]">
  <Head
    {icon}
    title={res.name}
    status={deleted ? 'deleted' : st}
    connId={c.id}
    onconn={(): void => onopen({ kind: 'connection', connId: c.id }, {})}
    sub={s.ext ? `${s.label} · ${s.ext.name}` : s.label}
    {views}
    {view}
    onview={(v): void => {
      view = v;
    }}
    actions={deleted ? undefined : actions} />
  {#if deleted}
    <div class="flex-1 flex items-center justify-center text-[var(--pd-details-empty-sub-header)]">{res.name} was deleted.</div>
  {:else if view === 'inspect'}
    <pre data-testid="inspect" class="flex-1 m-0 min-h-0 overflow-auto px-4 py-3 font-mono text-[12px] leading-5 bg-[var(--pd-code-block-bg)] text-[var(--pd-code-block-text)]">{inspectText({ ...res, status: st }, s.label)}</pre>
  {:else if view === 'logs'}
    <div class="flex items-center gap-2 h-7 px-3 text-xs text-[var(--pd-content-sub-header)] border-b border-[var(--pd-content-divider)]">
      <span class="w-1.5 h-1.5 rounded-full {up ? 'bg-[var(--pd-status-running)] animate-pulse' : 'bg-[var(--pd-status-stopped)]'}"></span>{up ? 'Following' : 'Stopped, last lines'}
      <span class="flex-1"></span>
      <button type="button" class="flex items-center gap-1 hover:text-[var(--pd-content-header)]" onclick={(): void => showLogs(res)}><AppIcon icon={faArrowUpRightFromSquare} size="xs" />Open in panel</button>
    </div>
    <div data-testid="tab-logs" class="flex-1 min-h-0 overflow-auto px-4 py-2 font-mono text-[12px] leading-5 bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)]">
      {#each logs as line, i (i)}<div class="whitespace-pre" class:text-[var(--pd-status-degraded)]={/WARN/.test(line)} class:text-[var(--pd-status-dead)]={/ERROR/.test(line)}>{line}</div>{/each}
    </div>
  {:else if view === 'layers'}
    {@const im = imageInfo(res)}
    <div class="flex-1 min-h-0 overflow-auto py-1">
      {@render block(`${im.layers.length} layers · via Layers explorer`)}
      {@render table(im.layers.map(l => [l.id, l.size, l.cmd]), ['Layer', 'Size', 'Created by'])}
    </div>
  {:else if view === 'vulns'}
    <div class="flex-1 min-h-0 overflow-auto py-1">
      {@render block('Vulnerabilities · via Grype')}
      {@render table(
        [
          ['CVE-2026-1234', 'High', 'openssl', '3.5.1-4', '3.5.1-5'],
          ['CVE-2026-0042', 'Medium', 'glibc', '2.39-12', '2.39-14'],
          ['CVE-2025-9911', 'Low', 'zlib', '1.3.1', '—'],
        ].slice(0, 1 + (h % 3)),
        ['ID', 'Severity', 'Package', 'Installed', 'Fixed in'],
      )}
    </div>
  {:else}
    <div data-testid="summary" class="flex-1 min-h-0 overflow-auto pb-3 text-sm">
      {#if s.id === 'containers'}
        {@const ci = containerInfo(res)}
        {@const image = resourcesOf(c.id, 'images').find(i => i.name === ci.image || ci.image.startsWith(i.name.split(':')[0]))}
        <dl class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 px-3 pt-2">
          <div class="flex gap-2 min-w-0 leading-5">
            <dt class="w-24 shrink-0 text-[var(--pd-content-sub-header)]">Image</dt>
            <dd class="truncate">{#if image}<button type="button" class="text-[var(--pd-link)] hover:underline truncate" onclick={(): void => openRes(image)}>{ci.image}</button>{:else}{ci.image}{/if}</dd>
          </div>
          <div class="flex gap-2 min-w-0 leading-5">
            <dt class="w-24 shrink-0 text-[var(--pd-content-sub-header)]">Ports</dt>
            <dd class="flex gap-2 truncate">{#each ci.ports as p (p)}<a class="text-[var(--pd-link)] hover:underline" href="http://localhost:{p}" target="_blank" rel="noreferrer">{p}→{p % 1000 === 443 ? 8443 : 8080}/tcp</a>{:else}<span class="opacity-60">none</span>{/each}</dd>
          </div>
          {@render kv('Command', ci.command)}
          {@render kv('Environment', `${ci.env.length} variables`)}
          {@render kv('Mounts', ci.mounts.join(', '))}
          {@render kv('Networks', ci.networks.join(', '))}
          {@render kv('Created', `${res.age} ago`)}
          {@render kv('Started', up ? `${res.age} ago` : '—')}
          {@render kv('Restart policy', ci.restart)}
          {#if res.group}{@render kv('Compose / pod', res.group)}{/if}
        </dl>
        <div class="flex items-center gap-5 px-3 pt-2 text-xs text-[var(--pd-content-sub-header)]">
          <span class="flex items-center gap-2">CPU {@render bars(up ? ci.cpu : ci.cpu.map(() => 0))}<span class="tabular-nums w-8">{up ? `${ci.cpu.at(-1)}%` : '0%'}</span></span>
          <span class="flex items-center gap-2">Memory {@render bars(up ? ci.cpu.map(v => 20 + (v % 12)) : ci.cpu.map(() => 0), 'var(--pd-status-running)')}<span class="tabular-nums">{up ? `${ci.mem} MB` : '0 MB'}</span></span>
        </div>
        <details class="px-3 pt-2">
          <summary class="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Labels ({ci.labels.length})</summary>
          <dl class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-x-6 pt-1">{#each ci.labels as [k, v] (k)}{@render kv(k, v)}{/each}</dl>
        </details>
        <details class="px-3 pt-1">
          <summary class="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Environment ({ci.env.length})</summary>
          <div class="pt-1 font-mono text-xs leading-5">{#each ci.env as e (e)}<div>{e}=<span class="opacity-60">•••</span></div>{/each}</div>
        </details>
      {:else if s.id === 'images'}
        {@const im = imageInfo(res)}
        <dl class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 px-3 pt-2">
          {@render kv('Size', im.size)}
          {@render kv('Layers', im.layers.length)}
          {@render kv('Tags', im.tags.join(', '))}
          {@render kv('Created', `${res.age} ago`)}
          {@render kv('Architecture', `linux/${im.arch}`)}
          {@render kv('Digest', im.digest)}
        </dl>
        {@render block(`Used by (${im.usedBy.length})`)}
        {#each im.usedBy as u (u.id)}{@render resRow(u, resStatus(u))}{:else}<div class="px-3 text-[var(--pd-content-sub-header)]">Not used by any container.</div>{/each}
      {:else if s.id === 'pods'}
        {@const names = [`${res.name}-infra`, `${res.name}-app`, `${res.name}-sidecar`].slice(0, 2 + (h % 2))}
        <dl class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 px-3 pt-2">
          {@render kv('Containers', names.length)}
          {@render kv('Infra', names[0])}
          {@render kv('Created', `${res.age} ago`)}
          {@render kv('Ports', `${8000 + (h % 90)}→8080/tcp`)}
          {@render kv('Network', 'podman')}
          {@render kv('Cgroup', 'user.slice')}
        </dl>
        {@render block(`Containers (${names.length})`)}
        {#each names as n (n)}
          <div class="flex items-center gap-2 h-6 px-3"><span class="w-1.5 h-1.5 rounded-full {up ? STATUS_DOT.running : STATUS_DOT.exited}"></span>{n}<span class="text-xs text-[var(--pd-content-sub-header)]">{n.endsWith('infra') ? 'localhost/podman-pause:5.6' : `quay.io/acme/${res.name}:1.0`}</span></div>
        {/each}
      {:else if isKube(s.id)}
        {@const replicas = (h % 4) + 1}
        {@const ready = up && st !== 'degraded' ? replicas : Math.max(0, replicas - 1)}
        <dl class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 px-3 pt-2">
          {@render kv('Namespace', c.id.includes('ocp') ? 'checkout' : 'default')}
          {#if s.id === 'deployments'}{@render kv('Replicas', `${ready}/${replicas} ready`)}{@render kv('Strategy', 'RollingUpdate 25%')}{/if}
          {#if s.id === 'kpods'}{@render kv('Node', res.sub.split('node ')[1])}{@render kv('Pod IP', `10.128.${h % 9}.${h % 250}`)}{@render kv('Restarts', st === 'degraded' ? 7 : 0)}{@render kv('QoS', 'Burstable')}{/if}
          {#if s.id === 'services'}{@render kv('Type', 'ClusterIP')}{@render kv('Cluster IP', res.sub.split(' ')[1])}{@render kv('Ports', '8080/TCP')}{@render kv('Selector', `app=${res.name}`)}{/if}
          {@render kv('Created', `${res.age} ago`)}
          {@render kv('Labels', `app=${res.name.split('-')[0]}`)}
          {#if s.ext}{@render kv('Provided by', s.ext.name)}{/if}
        </dl>
        {#if s.id === 'deployments'}
          {@const pods = relatedPods(res)}
          {@render block(`Pods (${pods.length})`)}
          {#each pods as p (p.id)}{@render resRow(p, p.sub)}{:else}<div class="px-3 text-[var(--pd-content-sub-header)]">No pods.</div>{/each}
        {/if}
        {#if s.id === 'kpods'}
          {@render block('Containers')}
          {@render table([['app', `quay.io/acme/${res.name.split('-')[0]}:2.3`, st === 'degraded' ? 'CrashLoopBackOff' : 'Running', st === 'degraded' ? '7' : '0']], ['Name', 'Image', 'State', 'Restarts'])}
        {/if}
        {@render block('Conditions')}
        {@render table(kubeConditions(st), ['Type', 'Status', 'Reason'])}
        {@render block('Events')}
        {@render table(kubeEvents({ ...res, status: st }), ['Type', 'Reason', 'Message', 'Age'])}
      {:else}
        <dl class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 px-3 pt-2">
          {@render kv('Kind', s.label)}
          {@render kv('Status', st)}
          {@render kv('Created', `${res.age} ago`)}
          {@render kv('Info', res.sub)}
          {#if res.group}{@render kv('Group', res.group)}{/if}
          {#if s.ext}
            <div class="flex gap-2 min-w-0 leading-5"><dt class="w-24 shrink-0 text-[var(--pd-content-sub-header)]">Provided by</dt><dd class="flex items-center gap-1 truncate"><AppIcon icon={s.ext.icon} size="12px" />{ext(s.ext.id)?.name ?? s.ext.name}</dd></div>
          {/if}
        </dl>
      {/if}
    </div>
  {/if}
</div>
