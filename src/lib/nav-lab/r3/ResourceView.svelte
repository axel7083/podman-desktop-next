<script lang="ts">
/**
 * Resource tab (P13, also used by Content for P5/P12/P14): the shared header
 * (icon, name, status, connection chip, actions) with PD's details tabs
 * (Summary | Inspect | Kube…, images: Summary | History | Inspect | Check)
 * and PD's readable details layout (cards of label / value rows). Logs and
 * terminals are actions that open in the bottom panel.
 */
import {
  faAlignLeft,
  faArrowUp,
  faDownload,
  faEllipsisVertical,
  faKeyboard,
  faPenToSquare,
  faPlay,
  faRotateRight,
  faStop,
  faTerminal,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { type LabConnection, type LabResource, type LabSection, type LabTarget, resourcesOf, section as findSection, STATUS_DOT } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ActBtn from './ActBtn.svelte';
import CodeView from './CodeView.svelte';
import type { LabRow } from './cells/types.ts';
import { composeDir, composeFile, composeServices, composeVolumes, composeYaml, containerInfo, hash, imageInfo, inspectText, isKube, kubeConditions, kubeEvents, relatedPods } from './details.ts';
import { ext } from './exts.ts';
import Head from './Head.svelte';
import ModernTable from './ModernTable.svelte';
import {
  can,
  deleteRes,
  extViews,
  hasTty,
  imageMenu,
  isUp,
  live,
  openMenu,
  openTerminal,
  openTty,
  resActions,
  resStatus,
  restartRes,
  scanRes,
  showGroupLogs,
  showLogs,
  startRes,
  stopRes,
} from './live.svelte.ts';

interface Props {
  res: LabResource;
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { res, c, s, onopen }: Props = $props();

// svelte-ignore state_referenced_locally
let view = $state(live.view[res.id] ?? (res.sectionId === 'compose' ? 'containers' : 'summary'));

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
const isImage = $derived(s.id === 'images');
const xviews = $derived(extViews(s.id));
const isCompose = $derived(s.id === 'compose');
const services = $derived(isCompose ? composeServices(res) : []);
const views = $derived<[string, string][]>([
  ...(isCompose ? ([['containers', 'Containers']] as [string, string][]) : []),
  ['summary', 'Summary'],
  ...(isImage ? ([['history', 'History']] as [string, string][]) : []),
  ['inspect', isKube(s.id) ? 'YAML' : 'Inspect'],
  ...(s.id === 'containers' || s.id === 'pods' ? ([['kube', 'Kube']] as [string, string][]) : []),
  ...(isImage ? ([['check', 'Check']] as [string, string][]) : []),
  ...xviews.map(v => [v.id, v.label] as [string, string]),
]);
const h = $derived(hash(res.name));
const icon = $derived(s.ext?.icon ?? s.icon);
const repoTag = $derived(res.name.split(/:(?=[^:/]+$)/));
const shortId = $derived((h * 2654435761).toString(16).slice(0, 12).padEnd(12, '0'));

function openRes(r: LabResource): void {
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

function upper(x: string): string {
  return x === 'ready' ? 'RUNNING' : x === 'error' ? 'DEGRADED' : x.toUpperCase();
}

const ctrIcon = $derived(findSection(c, 'containers')?.icon ?? icon);
const serviceRows = $derived.by((): LabRow[] => {
  void live.status;
  return services
    .filter(x => !live.deleted.includes(x.ctr.id))
    .map(x => {
      const r = x.ctr;
      const cst = resStatus(r);
      const cup = isUp(cst);
      const ci = containerInfo(r);
      return {
        name: r.id,
        r,
        status: upper(cst),
        icon: ctrIcon,
        title: x.service,
        sub: [],
        cols: { ctr: r.name, image: ci.image, ports: ci.ports.map(p => `${p}→8080`).join(', '), uptime: cup ? r.age : '' },
        open: x.real ? (): void => openRes(r) : undefined,
        pin: x.real ? (): void => openRes(r) : undefined,
        buttons: [
          cup ? { title: 'Stop', icon: faStop, run: (): void => stopRes(r) } : { title: 'Start', icon: faPlay, run: (): void => startRes(r) },
          { title: 'See logs', icon: faAlignLeft, run: (): void => showLogs(r) },
          { title: 'Delete', icon: faTrash, danger: true, run: (): void => deleteRes(r) },
        ],
        menu: x.real ? (): ReturnType<typeof resActions> => resActions(r, onopen) : undefined,
      };
    });
});
const upCount = $derived(services.filter(x => isUp(resStatus(x.ctr))).length);

function composeLogs(): void {
  showGroupLogs(res.name, c.id, services.map(x => x.ctr), { kind: 'resource', connId: c.id, sectionId: s.id, resId: res.id }, icon);
}

function kubeYaml(): string[] {
  const ci = containerInfo(res);
  return [
    '# Save the output of this file and use kubectl create -f to import',
    '# it into Kubernetes.',
    '#',
    '# Created with podman-5.6.0',
    'apiVersion: v1',
    'kind: Pod',
    'metadata:',
    '  labels:',
    `    app: ${res.name}-pod`,
    `  name: ${res.name}-pod`,
    'spec:',
    '  containers:',
    `  - image: ${s.id === 'containers' ? ci.image : `quay.io/acme/${res.name}:1.0`}`,
    `    name: ${res.name}`,
    ...(ci.ports.length ? ['    ports:', ...ci.ports.flatMap(p => [`    - containerPort: 8080`, `      hostPort: ${p}`])] : []),
    '    env:',
    ...ci.env.slice(3).flatMap(e => [`    - name: ${e}`, '      value: "…"']),
    `  restartPolicy: ${ci.restart === 'always' ? 'Always' : 'Never'}`,
  ];
}
</script>

{#snippet row(k: string, v: string | number | undefined)}
  <tr><td class="pt-1.5 pr-6 w-40 align-top whitespace-nowrap text-[var(--pd-table-body-text)]">{k}</td><td class="pt-1.5 wrap-anywhere text-[var(--pd-details-card-text)]">{v ?? '—'}</td></tr>
{/snippet}

{#snippet card(title: string, body: import('svelte').Snippet)}
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-3 min-w-0">
    <div class="text-base font-semibold text-[var(--pd-table-body-text-sub-secondary)] pb-1">{title}</div>
    {@render body()}
  </section>
{/snippet}

{#snippet resRow(r: LabResource, detail: string)}
  <button type="button" class="w-full flex items-center gap-2 h-8 px-1 text-left rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => openRes(r)}>
    <span class="w-2 h-2 rounded-full shrink-0 {STATUS_DOT[resStatus(r)] ?? STATUS_DOT.running}"></span>
    <span class="truncate text-[var(--pd-table-body-text-highlight)]">{r.name}</span><span class="text-xs text-[var(--pd-table-body-text)] truncate">{detail}</span>
  </button>
{/snippet}

{#snippet table(rows: string[][], head: string[])}
  <table class="w-full text-[13px]">
    <thead><tr class="text-left text-xs uppercase text-[var(--pd-table-header-text)]">{#each head as hd (hd)}<th class="font-semibold pr-3 h-8">{hd}</th>{/each}</tr></thead>
    <tbody>
      {#each rows as r, i (i)}
        <tr class="border-t border-[var(--pd-content-divider)]">{#each r as cell, j (j)}<td class="pr-3 h-8 truncate max-w-[360px]" class:text-[var(--pd-status-degraded)]={cell === 'Warning' || cell === 'False'}>{cell}</td>{/each}</tr>
      {/each}
    </tbody>
  </table>
{/snippet}

{#snippet imageExtra()}
  <span class="text-sm text-[var(--pd-table-body-text-sub-highlight)] shrink-0">{shortId}</span>
  <span class="px-1.5 rounded text-xs bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] shrink-0">{repoTag[1] ?? 'latest'}</span>
{/snippet}

{#snippet actions()}
  {#if isImage}
    <ActBtn icon={faPlay} label="Run Image" onclick={(): void => lab.openCreate(`Run ${res.name}`)} />
    <ActBtn icon={faTrash} label="Delete Image" danger onclick={(): void => deleteRes(res)} />
    <ActBtn icon={faArrowUp} label="Push Image" onclick={(): void => lab.openCreate(`Push ${res.name}`)} />
    <ActBtn icon={faPenToSquare} label="Edit Image" onclick={(): void => lab.openCreate(`Edit ${res.name}`)} />
    <ActBtn icon={faDownload} label="Save Image" onclick={(): void => lab.openCreate(`Save ${res.name}`)} />
    <ActBtn icon={ext('grype')?.icon ?? faTrash} label="Scan vulnerabilities" onclick={(): void => scanRes(res, onopen)} />
    <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, imageMenu(res, onopen))} />
  {:else}
    {#if isCompose}
      <ActBtn icon={faAlignLeft} label="See logs" onclick={composeLogs} />
      {#if upCount}
        <ActBtn icon={faStop} label="Stop all" onclick={(): void => services.forEach(x => stopRes(x.ctr))} />
      {:else}
        <ActBtn icon={faPlay} label="Start all" onclick={(): void => services.forEach(x => startRes(x.ctr))} />
      {/if}
      <ActBtn icon={faRotateRight} label="Restart all" disabled={!upCount} onclick={(): void => services.forEach(x => restartRes(x.ctr))} />
    {/if}
    {#if can.logs(s.id)}<ActBtn icon={faAlignLeft} label="See logs" onclick={(): void => showLogs(res)} />{/if}
    {#if can.start(s.id)}
      {#if up}
        <ActBtn icon={faStop} label="Stop" onclick={(): void => stopRes(res)} />
      {:else}
        <ActBtn icon={faPlay} label="Start" onclick={(): void => startRes(res)} />
      {/if}
      <ActBtn icon={faRotateRight} label="Restart" disabled={!up} onclick={(): void => restartRes(res)} />
    {/if}
    {#if can.terminal(s.id)}<ActBtn icon={faTerminal} label="Open terminal" disabled={!up} onclick={(): void => openTerminal(res)} />{/if}
    {#if hasTty(res)}<ActBtn icon={faKeyboard} label="Attach TTY" disabled={!up} onclick={(): void => openTty(res)} />{/if}
    <ActBtn icon={faTrash} label="Delete" danger onclick={(): void => deleteRes(res)} />
    <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, resActions(res, onopen))} />
  {/if}
{/snippet}

<div class="flex flex-col h-full min-h-0 bg-[var(--pd-details-bg)]">
  <Head
    {icon}
    title={isImage ? repoTag[0] : res.name}
    extra={isImage ? imageExtra : undefined}
    status={deleted ? 'deleted' : st}
    connId={c.id}
    onconn={(): void => onopen({ kind: 'connection', connId: c.id }, {})}
    provenance={s.ext?.name}
    {views}
    {view}
    onview={(v): void => {
      view = v;
    }}
    actions={deleted ? undefined : actions} />
  {#if deleted}
    <div class="flex-1 flex items-center justify-center text-[var(--pd-details-empty-sub-header)]">{res.name} was deleted.</div>
  {:else if view === 'containers' && isCompose}
    <div data-testid="compose-containers" class="flex flex-1 min-h-0 overflow-auto">
      <ModernTable rows={serviceRows} cols={[['Container', 'ctr', 'minmax(8rem, 1.2fr)'], ['Image', 'image', 'minmax(8rem, 2fr)'], ['Ports', 'ports', '130px'], ['Uptime', 'uptime', '100px', true]]} variant={lab.table === 'grid' ? 'grid' : 'modern'} initialSort="" />
    </div>
  {:else if view === 'inspect' && isCompose}
    <CodeView lines={composeYaml(res)} lang="yaml" numbered testid="inspect" />
  {:else if view === 'inspect'}
    <CodeView lines={inspectText({ ...res, status: st }, s.label).split('\n')} lang={isKube(s.id) ? 'yaml' : 'json'} testid="inspect" />
  {:else if view === 'kube'}
    <CodeView lines={kubeYaml()} lang="yaml" testid="kube" />
  {:else if view === 'history'}
    {@const im = imageInfo(res)}
    <CodeView lines={im.layers.map(l => `${l.id}  ${l.size.padStart(8)}  ${res.age} ago  ${l.cmd}`)} numbered testid="history" />
  {:else if view === 'check'}
    <div class="flex-1 min-h-0 overflow-auto px-5 py-4 text-[13px]">
      {#snippet checks()}
        {@render table(
          [
            ['Passed', 'Image has a non-root USER', 'OpenShift checker'],
            ['Passed', 'Image exposes ports below 1024 only when root', 'OpenShift checker'],
            [h % 2 ? 'Warning' : 'Passed', 'Image size below 1 GB', 'OpenShift checker'],
            [h % 3 ? 'Passed' : 'Warning', 'Image has OCI labels (source, version)', 'OpenShift checker'],
          ],
          ['Result', 'Check', 'Provider'],
        )}
      {/snippet}
      <div class="flex flex-col gap-4">
        {@render card('Image checks', checks)}
        {#snippet vulns()}
          <div class="flex items-center gap-3 pt-1">
            <span class="flex w-6 h-6 items-center justify-center shrink-0"><AppIcon icon={ext('grype')?.icon ?? faTrash} size="20px" /></span>
            <span class="flex-1 text-[var(--pd-table-body-text)]">Scan the OS packages and language dependencies of this image for known CVEs.</span>
            <button type="button" data-testid="check-scan" class="h-7 px-3 rounded-md text-xs border border-[var(--pd-button-secondary-border,var(--pd-content-divider))] text-[var(--pd-content-header)] hover:bg-[var(--pd-action-button-details-bg)]" onclick={(): void => scanRes(res, onopen)}>Scan vulnerabilities</button>
          </div>
        {/snippet}
        {@render card('Vulnerabilities · Grype', vulns)}
      </div>
    </div>
  {:else if view === 'layers'}
    {@const im = imageInfo(res)}
    <div class="flex-1 min-h-0 overflow-auto px-5 py-4">
      {#snippet layers()}{@render table(im.layers.map(l => [l.id, l.size, l.cmd]), ['Layer', 'Size', 'Created by'])}{/snippet}
      {@render card(`${im.layers.length} layers · Layers explorer`, layers)}
    </div>
  {:else}
    <div data-testid="summary" class="flex-1 min-h-0 overflow-auto px-5 py-4 text-[13px] leading-5">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
        {#if isCompose}
          {#snippet project()}
            <table class="w-full"><tbody>
              {@render row('Project', res.name)}
              {@render row('Working directory', composeDir(res))}
              {@render row('Config file', composeFile(res))}
              {@render row('Services', `${services.length} (${upCount} running)`)}
              {@render row('Networks', `${res.name}_default`)}
              {@render row('Volumes', composeVolumes(res).join(', ') || '—')}
              {@render row('Engine', `${c.product} · ${c.name}`)}
            </tbody></table>
          {/snippet}
          {#snippet svcList()}
            {#each services as x (x.ctr.id)}
              {#if x.real}{@render resRow(x.ctr, `${x.service} · ${containerInfo(x.ctr).image}`)}{:else}<div class="flex items-center gap-2 h-8 px-1"><span class="w-2 h-2 rounded-full {STATUS_DOT[resStatus(x.ctr)] ?? STATUS_DOT.running}"></span>{x.service}<span class="text-xs text-[var(--pd-table-body-text)]">{x.ctr.sub}</span></div>{/if}
            {/each}
          {/snippet}
          {@render card('Project', project)}
          {@render card(`Services (${services.length})`, svcList)}
        {:else if s.id === 'containers'}
          {@const ci = containerInfo(res)}
          {@const image = resourcesOf(c.id, 'images').find(i => i.name === ci.image || ci.image.startsWith(i.name.split(':')[0]))}
          {#snippet details()}
            <table class="w-full"><tbody>
              {@render row('Name', res.name)}
              {@render row('ID', `${(h * 2654435761).toString(16)}${(h * 97).toString(16)}`.padEnd(64, '0').slice(0, 64))}
              {@render row('Engine', `${c.product} · ${c.name}`)}
              <tr><td class="pt-1.5 pr-6 text-[var(--pd-table-body-text)]">Image</td><td class="pt-1.5">{#if image}<button type="button" class="hover:text-[var(--pd-link)] hover:underline" onclick={(): void => openRes(image)}>{ci.image}</button>{:else}{ci.image}{/if}</td></tr>
              {@render row('Command', ci.command)}
              {@render row('Created', `${res.age} ago`)}
              {@render row('Started', up ? `${res.age} ago` : '—')}
              {@render row('Restart policy', ci.restart)}
              {#if res.group}{@render row('Compose / pod', res.group)}{/if}
            </tbody></table>
          {/snippet}
          {#snippet net()}
            <table class="w-full"><tbody>
              <tr><td class="pt-1.5 pr-6 w-40 text-[var(--pd-table-body-text)]">Ports</td><td class="pt-1.5">{#each ci.ports as p, i (p)}{#if i > 0}, {/if}<a class="hover:text-[var(--pd-link)] hover:underline" href="http://localhost:{p}" target="_blank" rel="noreferrer">{p}</a> → 8080/tcp{:else}<span class="opacity-60">none</span>{/each}</td></tr>
              {@render row('Networks', ci.networks.join(', '))}
              {@render row('Mounts', ci.mounts.join(', '))}
              {@render row('CPU', up ? `${ci.cpu.at(-1)}%` : '0%')}
              {@render row('Memory', up ? `${ci.mem} MB` : '0 MB')}
            </tbody></table>
          {/snippet}
          {#snippet labels()}
            <table class="w-full"><tbody>{#each ci.labels as [k, v] (k)}{@render row(k, v)}{/each}</tbody></table>
          {/snippet}
          {#snippet env()}
            <div class="font-mono text-xs leading-6">{#each ci.env as e (e)}<div>{e}=<span class="opacity-60">•••</span></div>{/each}</div>
          {/snippet}
          {@render card('Details', details)}
          {@render card('Networking & storage', net)}
          {@render card(`Labels (${ci.labels.length})`, labels)}
          {@render card(`Environment (${ci.env.length})`, env)}
        {:else if isImage}
          {@const im = imageInfo(res)}
          {#snippet details()}
            <table class="w-full"><tbody>
              {@render row('Name', repoTag[0])}
              {@render row('ID', `sha256:${shortId}${(h * 31).toString(16)}`)}
              {@render row('Tags', im.tags.join(', '))}
              {@render row('Size', im.size)}
              {@render row('Created', `${res.age} ago`)}
              {@render row('Architecture', `linux/${im.arch}`)}
              {@render row('Digest', im.digest)}
              {@render row('Layers', im.layers.length)}
            </tbody></table>
          {/snippet}
          {#snippet usedBy()}
            {#each im.usedBy as u (u.id)}{@render resRow(u, resStatus(u))}{:else}<div class="text-[var(--pd-table-body-text)]">Not used by any container.</div>{/each}
          {/snippet}
          {@render card('Details', details)}
          {@render card(`Used by (${im.usedBy.length})`, usedBy)}
        {:else if s.id === 'pods'}
          {@const names = [`${res.name}-infra`, `${res.name}-app`, `${res.name}-sidecar`].slice(0, 2 + (h % 2))}
          {#snippet details()}
            <table class="w-full"><tbody>
              {@render row('Name', res.name)}
              {@render row('Containers', names.length)}
              {@render row('Infra container', names[0])}
              {@render row('Created', `${res.age} ago`)}
              {@render row('Ports', `${8000 + (h % 90)} → 8080/tcp`)}
              {@render row('Network', 'podman')}
            </tbody></table>
          {/snippet}
          {#snippet ctrs()}
            {#each names as n (n)}
              <div class="flex items-center gap-2 h-8"><span class="w-2 h-2 rounded-full {up ? STATUS_DOT.running : STATUS_DOT.exited}"></span>{n}<span class="text-xs text-[var(--pd-table-body-text)]">{n.endsWith('infra') ? 'localhost/podman-pause:5.6' : `quay.io/acme/${res.name}:1.0`}</span></div>
            {/each}
          {/snippet}
          {@render card('Details', details)}
          {@render card(`Containers (${names.length})`, ctrs)}
        {:else if isKube(s.id)}
          {@const replicas = (h % 4) + 1}
          {@const ready = up && st !== 'degraded' ? replicas : Math.max(0, replicas - 1)}
          {#snippet details()}
            <table class="w-full"><tbody>
              {@render row('Name', res.name)}
              {@render row('Namespace', c.id.includes('ocp') ? 'checkout' : 'default')}
              {#if s.id === 'deployments'}{@render row('Replicas', `${ready}/${replicas} ready`)}{@render row('Strategy', 'RollingUpdate 25%')}{/if}
              {#if s.id === 'kpods'}{@render row('Node', res.sub.split('node ')[1])}{@render row('Pod IP', `10.128.${h % 9}.${h % 250}`)}{@render row('Restarts', st === 'degraded' ? 7 : 0)}{/if}
              {#if s.id === 'services'}{@render row('Type', 'ClusterIP')}{@render row('Cluster IP', res.sub.split(' ')[1])}{@render row('Ports', '8080/TCP')}{/if}
              {@render row('Created', `${res.age} ago`)}
              {@render row('Labels', `app=${res.name.split('-')[0]}`)}
              {#if s.ext}{@render row('Provided by', s.ext.name)}{/if}
            </tbody></table>
          {/snippet}
          {#snippet conds()}{@render table(kubeConditions(st), ['Type', 'Status', 'Reason'])}{/snippet}
          {#snippet events()}{@render table(kubeEvents({ ...res, status: st }), ['Type', 'Reason', 'Message', 'Age'])}{/snippet}
          {@render card('Details', details)}
          {#if s.id === 'deployments'}
            {@const pods = relatedPods(res)}
            {#snippet podList()}{#each pods as p (p.id)}{@render resRow(p, p.sub)}{:else}<div class="text-[var(--pd-table-body-text)]">No pods.</div>{/each}{/snippet}
            {@render card(`Pods (${pods.length})`, podList)}
          {/if}
          {@render card('Conditions', conds)}
          {@render card('Events', events)}
        {:else}
          {#snippet details()}
            <table class="w-full"><tbody>
              {@render row('Name', res.name)}
              {@render row('Kind', s.label)}
              {@render row('Status', st)}
              {@render row('Created', `${res.age} ago`)}
              {@render row('Info', res.sub)}
              {#if res.group}{@render row('Group', res.group)}{/if}
            </tbody></table>
            {#if s.ext}<div class="flex items-center gap-1.5 pt-2 text-xs text-[var(--pd-table-body-text)]"><AppIcon icon={s.ext.icon} size="12px" />Provided by {ext(s.ext.id)?.name ?? s.ext.name}</div>{/if}
          {/snippet}
          {@render card('Details', details)}
        {/if}
      </div>
    </div>
  {/if}
</div>
