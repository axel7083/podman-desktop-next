<script lang="ts">
/**
 * Resource tab (P13, also used by Content for P5/P12/P14): the shared header
 * (icon, name, status, connection chip, quick actions) with the details views
 * as a segmented control (Summary | Inspect | Kube…, images: Summary | History
 * | Inspect | Check). Summary is always the default (rule E18): key/value
 * cards, then related collections as tables (compose services, image used by,
 * pod containers, deployment pods, conditions, events). Every reference opens
 * its tab (rule F25). Logs and terminals open in the bottom panel.
 */
import {
  faAlignLeft,
  faEllipsisVertical,
  faRocket,
  faKeyboard,
  faPlay,
  faRotateRight,
  faStop,
  faTerminal,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { type LabConnection, type LabResource, type LabSection, type LabTarget, resourcesOf } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ActBtn from './ActBtn.svelte';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import type { LabRow } from './cells/types.ts';
import CodeView from './CodeView.svelte';
import { composeDir, composeFile, composeServices, composeVolumes, composeYaml, containerInfo, hash, imageInfo, inspectText, isKube, kubeConditions, kubeEvents, relatedPods } from './details.ts';
import { ext, installExt, isInstalled } from './exts.ts';
import { altFor, cveTotal, HB_CONN, hbImage, mb } from './hb-data.ts';
import { openAlternative } from './hummingbird.ts';
import { chainOf, flows, openModal } from './flows.svelte.ts';
import Timeline, { type TimelineStep } from './Timeline.svelte';
import Head from './Head.svelte';
import KV from './KV.svelte';
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
import ModernTable from './ModernTable.svelte';
import Section from './Section.svelte';
import LabIcon from '../ui/LabIcon.svelte';

interface Props {
  res: LabResource;
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { res, c, s, onopen }: Props = $props();

// svelte-ignore state_referenced_locally
let view = $state(live.view[res.id] ?? 'summary');

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
  ['summary', 'Summary'],
  ...(isImage ? ([['history', 'History']] as [string, string][]) : []),
  ['inspect', isKube(s.id) ? 'YAML' : isCompose ? 'compose.yaml' : 'Inspect'],
  ...(s.id === 'containers' || s.id === 'pods' ? ([['kube', 'Kube']] as [string, string][]) : []),
  ...(isImage ? ([['check', 'Check']] as [string, string][]) : []),
  ...xviews.map(v => [v.id, v.label] as [string, string]),
]);
const h = $derived(hash(res.name));
/** Hummingbird: hardened alternative of this image (only computed on the Hummingbird connection). */
const hbAlt = $derived(isImage && c.id === HB_CONN ? altFor(res.name) : undefined);
const hbAltImg = $derived(hbImage(hbAlt?.hb));
const icon = $derived(s.ext?.icon ?? s.icon);
const repoTag = $derived(res.name.split(/:(?=[^:/]+$)/));
const shortId = $derived((h * 2654435761).toString(16).slice(0, 12).padEnd(12, '0'));
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');

function openRes(r: LabResource): void {
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

function upper(x: string): string {
  return x === 'ready' ? 'RUNNING' : x === 'error' ? 'DEGRADED' : x.toUpperCase();
}

/** Table row for a related resource: status dot, name, columns, quick actions, menu, opens its tab. */
function refRow(r: LabResource, title: string, cols: Record<string, string>, real = true): LabRow {
  const cst = resStatus(r);
  const cup = isUp(cst);
  return {
    name: r.id,
    r,
    status: upper(cst),
    icon,
    title,
    sub: [],
    cols,
    open: real ? (): void => openRes(r) : undefined,
    pin: real ? (): void => openRes(r) : undefined,
    buttons: can.start(r.sectionId)
      ? [
          cup ? { title: 'Stop', icon: faStop, run: (): void => stopRes(r) } : { title: 'Start', icon: faPlay, run: (): void => startRes(r) },
          ...(can.logs(r.sectionId) ? [{ title: 'See logs', icon: faAlignLeft, run: (): void => showLogs(r) }] : []),
        ]
      : can.logs(r.sectionId)
        ? [{ title: 'See logs', icon: faAlignLeft, run: (): void => showLogs(r) }]
        : [],
    menu: real ? (): ReturnType<typeof resActions> => resActions(r, onopen) : undefined,
  };
}

/** Read-only text rows (conditions, events, checks, layers). */
function textRows(rows: string[][], keys: string[], status?: (r: string[]) => string): LabRow[] {
  return rows.map((r, i) => ({
    name: `${i}:${r.join('|')}`,
    status: status?.(r) ?? '',
    icon,
    title: r[0],
    sub: [],
    cols: Object.fromEntries(keys.map((k, j) => [k, r[j + 1] ?? ''])),
    buttons: [],
  }));
}

const serviceRows = $derived.by((): LabRow[] => {
  void live.status;
  return services
    .filter(x => !live.deleted.includes(x.ctr.id))
    .map(x => {
      const ci = containerInfo(x.ctr);
      const row = refRow(x.ctr, x.service, { ctr: x.ctr.name, image: ci.image, ports: ci.ports.map(p => `${p}→8080`).join(', '), uptime: isUp(resStatus(x.ctr)) ? x.ctr.age : '' }, x.real);
      return { ...row, buttons: [...row.buttons, { title: 'Delete', icon: faTrash, danger: true, run: (): void => deleteRes(x.ctr) }] };
    });
});
const upCount = $derived(services.filter(x => isUp(resStatus(x.ctr))).length);

function composeLogs(): void {
  showGroupLogs(res.name, c.id, services.map(x => x.ctr), { kind: 'resource', connId: c.id, sectionId: s.id, resId: res.id }, icon);
}

/** Compose project or pod a container belongs to (reference row). */
const groupRef = $derived.by((): LabResource | undefined => {
  if (!res.group) return undefined;
  return resourcesOf(c.id, 'compose').find(x => x.name === res.group) ?? resourcesOf(c.id, 'pods').find(x => x.name === res.group);
});

/** Image provenance (rule F25 deep links): built → scanned → signed → pushed → deployed. */
const provenance = $derived.by((): TimelineStep[] => {
  const ev = chainOf(res.name);
  const at = (step: string) => ev.filter(e => e.step === step);
  const built = at('built')[0];
  const scanned = at('scanned')[0];
  const signed = at('signed')[0];
  const pushed = at('pushed')[0];
  const deployed = at('deployed');
  const local = res.name.startsWith('quay.io/acme/') || res.name.startsWith('localhost/') || res.name.includes('hummingbird');
  const showHistory = (): void => void (view = 'history');
  return [
    { id: 'built', label: built?.title ?? (local ? 'Built' : 'Pulled'), state: 'done', detail: built?.detail ?? (local ? 'podman build · Containerfile' : res.name.split('/')[0]), at: built?.at ?? `${res.age} ago`, icon: built ? ext('hummingbird')?.icon : undefined, onopen: showHistory },
    scanned
      ? { id: 'scanned', label: 'Scanned', state: 'done', detail: scanned.detail, at: scanned.at, icon: ext('grype')?.icon, onopen: (): void => scanRes(res, onopen) }
      : { id: 'scanned', label: 'Scanned', state: 'todo', icon: ext('grype')?.icon, action: { label: 'Scan', run: (): void => scanRes(res, onopen) } },
    signed
      ? { id: 'signed', label: 'Signed', state: 'done', detail: signed.detail, at: signed.at, icon: 'icons/redhat.trusted-artifact-signer.png', href: signed.href }
      : { id: 'signed', label: 'Signed', state: 'todo', icon: 'icons/redhat.trusted-artifact-signer.png', action: { label: 'Push and sign', run: (): void => openModal('push-quay', { resId: res.id }) } },
    pushed
      ? { id: 'pushed', label: 'Pushed', state: 'done', detail: pushed.detail, at: pushed.at, icon: 'icons/redhat.quay.png', href: pushed.href }
      : { id: 'pushed', label: 'Pushed', state: 'todo', icon: 'icons/redhat.quay.png', action: { label: 'Push to Quay', run: (): void => openModal('push-quay', { resId: res.id }) } },
    deployed.length
      ? { id: 'deployed', label: deployed.at(-1)!.title, state: 'done', detail: deployed.at(-1)!.detail, at: deployed.length > 1 ? `${deployed.length} deployments` : deployed.at(-1)!.at, onopen: (): void => onopen(deployed.at(-1)!.target!, {}) }
      : { id: 'deployed', label: 'Deployed', state: 'todo', action: { label: 'Deploy to…', run: (): void => openModal('deploy', { resId: res.id }) } },
  ];
});

/** RHEL / UBI content: promote the Red Hat account (Vanilla: install it). */
const rhContent = $derived(isImage && /registry\.(redhat|access\.redhat)\.(io|com)|ubi\d|rhel/.test(res.name) && !flows.account);

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

{#snippet imageExtra()}
  <span class="text-[12px] font-mono text-[var(--pd-table-body-text)] shrink-0">{shortId}</span>
  <span class="px-1.5 rounded text-[11px] bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] shrink-0">{repoTag[1] ?? 'latest'}</span>
{/snippet}

{#snippet actions()}
  {#if isImage}
    <ActBtn icon={faPlay} label="Run image" onclick={(): void => lab.openCreate(`Run ${res.name}`)} />
    {#if hbAlt && isInstalled('hummingbird')}<ActBtn icon={ext('hummingbird')?.icon ?? faTrash} label="Rebase on Hummingbird (find hardened alternative)" onclick={(): void => openAlternative(res.name, c.id, onopen)} />{/if}
    <ActBtn icon={ext('grype')?.icon ?? faTrash} label="Scan vulnerabilities" onclick={(): void => scanRes(res, onopen)} />
    <ActBtn icon="icons/redhat.quay.png" label="Push to Quay" onclick={(): void => openModal('push-quay', { resId: res.id })} />
    <ActBtn icon={faRocket} label="Deploy to…" onclick={(): void => openModal('deploy', { resId: res.id })} />
    <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, [...imageMenu(res, onopen), { label: 'Delete image', icon: faTrash, danger: true, sep: true, run: (): void => deleteRes(res) }])} />
  {:else if isCompose}
    <ActBtn icon={faAlignLeft} label="See logs" onclick={composeLogs} />
    {#if upCount}
      <ActBtn icon={faStop} label="Stop all" onclick={(): void => services.forEach(x => stopRes(x.ctr))} />
    {:else}
      <ActBtn icon={faPlay} label="Start all" onclick={(): void => services.forEach(x => startRes(x.ctr))} />
    {/if}
    <ActBtn icon={faRotateRight} label="Restart all" disabled={!upCount} onclick={(): void => services.forEach(x => restartRes(x.ctr))} />
    <ActBtn icon={faTrash} label="Delete" danger onclick={(): void => deleteRes(res)} />
    <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, resActions(res, onopen))} />
  {:else}
    {#if can.start(s.id)}
      {#if up}
        <ActBtn icon={faStop} label="Stop" onclick={(): void => stopRes(res)} />
      {:else}
        <ActBtn icon={faPlay} label="Start" onclick={(): void => startRes(res)} />
      {/if}
      <ActBtn icon={faRotateRight} label="Restart" disabled={!up} onclick={(): void => restartRes(res)} />
    {/if}
    {#if can.logs(s.id)}<ActBtn icon={faAlignLeft} label="See logs" onclick={(): void => showLogs(res)} />{/if}
    {#if can.terminal(s.id)}<ActBtn icon={faTerminal} label="Open terminal" disabled={!up} onclick={(): void => openTerminal(res)} />{/if}
    {#if hasTty(res)}<ActBtn icon={faKeyboard} label="Attach TTY" disabled={!up} onclick={(): void => openTty(res)} />{/if}
    <ActBtn icon={faTrash} label="Delete" danger onclick={(): void => deleteRes(res)} />
    <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, resActions(res, onopen))} />
  {/if}
{/snippet}

<div class="flex flex-col h-full min-h-0 bg-[var(--pd-content-bg)]">
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
    <div class="flex-1 flex items-center justify-center text-[13px] text-[var(--pd-table-body-text)]">{res.name} was deleted.</div>
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
    <div data-testid="check" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
      <Section title="Image checks · OpenShift checker" count={4}>
        <ModernTable
          {variant}
          readonly
          initialSort=""
          rows={textRows(
            [
              ['Image has a non-root USER', 'Passed'],
              ['Image exposes ports below 1024 only when root', 'Passed'],
              ['Image size below 1 GB', h % 2 ? 'Warning' : 'Passed'],
              ['Image has OCI labels (source, version)', h % 3 ? 'Passed' : 'Warning'],
            ],
            ['result'],
            r => (r[1] === 'Passed' ? 'RUNNING' : 'DEGRADED'),
          )}
          cols={[['Result', 'result', '120px']]} />
      </Section>
      <Card title="Hardened alternative · Hummingbird">
        <div data-testid="check-hb" class="flex items-center gap-3 text-[13px]">
          {#if !isInstalled('hummingbird')}
            <span class="flex-1 text-[var(--pd-table-body-text)]">Install Hummingbird to find a minimal, zero-CVE Red Hat Hardened Image for this image.</span>
            <Btn icon={ext('hummingbird')?.icon} testid="check-hb-install" onclick={(): void => installExt('hummingbird')}>Install Hummingbird</Btn>
          {:else if hbAlt && hbAltImg}
            <span class="w-2 h-2 rounded-full shrink-0 bg-[var(--pd-status-degraded)]"></span>
            <span class="flex-1 text-[var(--pd-content-header)]">hummingbird/{hbAltImg.name}:{hbAltImg.tags[0]} available · CVEs {cveTotal(hbAlt)} → 0 · size {mb(hbAlt.sizeMB)} → {mb(hbAltImg.sizeMB)}</span>
            <Btn icon={ext('hummingbird')?.icon} testid="check-hb-compare" onclick={(): void => openAlternative(res.name, c.id, onopen)}>Compare</Btn>
          {:else if res.name.includes('hummingbird')}
            <span class="w-2 h-2 rounded-full shrink-0 bg-[var(--pd-status-running)]"></span>
            <span class="flex-1 text-[var(--pd-content-header)]">Already built on a hardened image.</span>
          {:else}
            <span class="flex-1 text-[var(--pd-table-body-text)]">No hardened alternative in the catalog for this image.</span>
          {/if}
        </div>
      </Card>
      <Card title="Vulnerabilities · Grype">
        <div class="flex items-center gap-3 text-[13px]">
          <span class="flex-1 text-[var(--pd-table-body-text)]">Scan the OS packages and language dependencies of this image for known CVEs.</span>
          <Btn icon={ext('grype')?.icon} testid="check-scan" onclick={(): void => scanRes(res, onopen)}>Scan vulnerabilities</Btn>
        </div>
      </Card>
    </div>
  {:else if view === 'layers'}
    {@const im = imageInfo(res)}
    <div class="flex-1 min-h-0 overflow-auto px-5 py-4">
      <Section title="Layers · Layers explorer" count={im.layers.length}>
        <ModernTable {variant} readonly initialSort="" mono={['size']} rows={textRows(im.layers.map(l => [l.id, l.size, l.cmd]), ['size', 'cmd'])} cols={[['Size', 'size', '90px'], ['Created by', 'cmd', 'minmax(12rem, 3fr)']]} />
      </Section>
    </div>
  {:else}
    <div data-testid="summary" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
        {#if isCompose}
          <Card title="Project">
            <KV
              rows={[
                { k: 'Project', v: res.name },
                { k: 'Working directory', v: composeDir(res), mono: true },
                { k: 'Config file', v: composeFile(res), mono: true },
                { k: 'Services', v: `${services.length} (${upCount} running)` },
                { k: 'Networks', v: `${res.name}_default` },
                { k: 'Volumes', v: composeVolumes(res).join(', ') || '—' },
                { k: 'Engine', v: `${c.product} · ${c.name}`, onclick: (): void => onopen({ kind: 'connection', connId: c.id }, {}) },
              ]} />
          </Card>
        {:else if s.id === 'containers'}
          {@const ci = containerInfo(res)}
          {@const image = resourcesOf(c.id, 'images').find(i => i.name === ci.image || ci.image.startsWith(i.name.split(':')[0]))}
          <Card title="Details">
            <KV
              rows={[
                { k: 'Name', v: res.name },
                { k: 'ID', v: `${(h * 2654435761).toString(16)}${(h * 97).toString(16)}`.padEnd(64, '0').slice(0, 64), mono: true },
                { k: 'Engine', v: `${c.product} · ${c.name}`, onclick: (): void => onopen({ kind: 'connection', connId: c.id }, {}) },
                { k: 'Image', v: ci.image, onclick: image ? (): void => openRes(image) : undefined },
                { k: 'Command', v: ci.command, mono: true },
                { k: 'Created', v: `${res.age} ago` },
                { k: 'Started', v: up ? `${res.age} ago` : '—' },
                { k: 'Restart policy', v: ci.restart },
                ...(res.group ? [{ k: groupRef?.sectionId === 'pods' ? 'Pod' : 'Compose project', v: res.group, onclick: groupRef ? (): void => openRes(groupRef) : undefined }] : []),
              ]} />
          </Card>
          <Card title="Networking & storage">
            <KV
              rows={[
                ...(ci.ports.length ? ci.ports.map((p, i) => ({ k: i ? `Port ${i + 1}` : 'Ports', v: `${p} → 8080/tcp`, href: `http://localhost:${p}` })) : [{ k: 'Ports', v: 'none' }]),
                { k: 'Networks', v: ci.networks.join(', ') },
                { k: 'Mounts', v: ci.mounts.join(', ') },
                { k: 'CPU', v: up ? `${ci.cpu.at(-1)}%` : '0%' },
                { k: 'Memory', v: up ? `${ci.mem} MB` : '0 MB' },
              ]} />
          </Card>
          <Card title="Labels ({ci.labels.length})"><KV rows={ci.labels.map(([k, v]) => ({ k, v }))} /></Card>
          <Card title="Environment ({ci.env.length})"><KV rows={ci.env.map(e => ({ k: e, v: '•••', mono: true }))} /></Card>
        {:else if isImage}
          {@const im = imageInfo(res)}
          <Card title="Details" testid="image-details">
            <KV
              rows={[
                { k: 'Name', v: repoTag[0] },
                { k: 'ID', v: `sha256:${shortId}${(h * 31).toString(16)}`, mono: true },
                { k: 'Tags', v: im.tags.join(', ') },
                { k: 'Size', v: im.size },
                { k: 'Created', v: `${res.age} ago` },
                { k: 'Architecture', v: `linux/${im.arch}` },
                { k: 'Digest', v: im.digest, mono: true },
                { k: 'Layers', v: im.layers.length },
              ]} />
          </Card>
        {:else if s.id === 'pods'}
          <Card title="Details">
            <KV
              rows={[
                { k: 'Name', v: res.name },
                { k: 'Containers', v: 2 + (h % 2) },
                { k: 'Infra container', v: `${res.name}-infra` },
                { k: 'Created', v: `${res.age} ago` },
                { k: 'Ports', v: `${8000 + (h % 90)} → 8080/tcp` },
                { k: 'Network', v: 'podman' },
                { k: 'Engine', v: `${c.product} · ${c.name}`, onclick: (): void => onopen({ kind: 'connection', connId: c.id }, {}) },
              ]} />
          </Card>
        {:else if isKube(s.id)}
          {@const replicas = (h % 4) + 1}
          {@const ready = up && st !== 'degraded' ? replicas : Math.max(0, replicas - 1)}
          <Card title="Details">
            <KV
              rows={[
                { k: 'Name', v: res.name },
                { k: 'Namespace', v: c.id.includes('ocp') ? 'checkout' : 'default' },
                ...(s.id === 'deployments' ? [{ k: 'Replicas', v: `${ready}/${replicas} ready` }, { k: 'Strategy', v: 'RollingUpdate 25%' }] : []),
                ...(s.id === 'kpods' ? [{ k: 'Node', v: res.sub.split('node ')[1] }, { k: 'Pod IP', v: `10.128.${h % 9}.${h % 250}` }, { k: 'Restarts', v: st === 'degraded' ? 7 : 0 }] : []),
                ...(s.id === 'services' ? [{ k: 'Type', v: 'ClusterIP' }, { k: 'Cluster IP', v: res.sub.split(' ')[1] }, { k: 'Ports', v: '8080/TCP' }] : []),
                { k: 'Created', v: `${res.age} ago` },
                { k: 'Labels', v: `app=${res.name.split('-')[0]}` },
                { k: 'Cluster', v: c.name, onclick: (): void => onopen({ kind: 'connection', connId: c.id }, {}) },
                ...(s.ext ? [{ k: 'Provided by', v: s.ext.name }] : []),
              ]} />
          </Card>
        {:else}
          <Card title="Details">
            <KV
              rows={[
                { k: 'Name', v: res.name },
                { k: 'Kind', v: s.label },
                { k: 'Status', v: st },
                { k: 'Created', v: `${res.age} ago` },
                { k: 'Info', v: res.sub },
                ...(res.group ? [{ k: 'Group', v: res.group }] : []),
                { k: 'Connection', v: c.name, onclick: (): void => onopen({ kind: 'connection', connId: c.id }, {}) },
                ...(s.ext ? [{ k: 'Provided by', v: ext(s.ext.id)?.name ?? s.ext.name }] : []),
              ]} />
          </Card>
        {/if}
      </div>

      {#if isCompose}
        <Section title="Services" count={serviceRows.length} testid="compose-services">
          <ModernTable {variant} initialSort="" rows={serviceRows} cols={[['Container', 'ctr', 'minmax(8rem, 1.2fr)'], ['Image', 'image', 'minmax(8rem, 2fr)'], ['Ports', 'ports', '130px'], ['Uptime', 'uptime', '100px', true]]} />
        </Section>
      {:else if isImage}
        {@const im = imageInfo(res)}
        {#if rhContent}
          <div data-testid="rh-promo" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
            <LabIcon icon="icons/redhat.redhat-authentication.png" size={32} />
            <div class="flex-1 min-w-0">
              <div class="text-[14px] font-semibold text-[var(--pd-content-header)]">Red Hat content</div>
              <div class="text-[13px] text-[var(--pd-table-body-text)]">This image comes from Red Hat. Sign in with your Red Hat account to pull updates from registry.redhat.io and get subscribed RHEL content in builds.</div>
            </div>
            <Btn icon="icons/redhat.redhat-authentication.png" testid="rh-promo-btn" onclick={(): void => openModal('rh-signin')}>{isInstalled('redhat-account') ? 'Sign in with Red Hat' : 'Install Red Hat Authentication'}</Btn>
          </div>
        {/if}
        <Card title="Provenance" testid="provenance"><Timeline steps={provenance} testid="provenance-timeline" /></Card>
        <Section title="Used by" count={im.usedBy.length} testid="used-by">
          {#if im.usedBy.length}
            <ModernTable {variant} readonly initialSort="" rows={im.usedBy.map(u => refRow(u, u.name, { status: resStatus(u), age: u.age }))} cols={[['Status', 'status', '110px'], ['Age', 'age', '110px', true]]} />
          {:else}
            <div class="py-2 text-[13px] text-[var(--pd-table-body-text)]">Not used by any container.</div>
          {/if}
        </Section>
      {:else if s.id === 'pods'}
        {@const names = [`${res.name}-infra`, `${res.name}-app`, `${res.name}-sidecar`].slice(0, 2 + (h % 2))}
        <Section title="Containers" count={names.length} testid="pod-containers">
          <ModernTable
            {variant}
            readonly
            initialSort=""
            rows={names.map(n => ({ name: n, status: up ? 'RUNNING' : 'EXITED', icon, title: n, sub: [], cols: { image: n.endsWith('infra') ? 'localhost/podman-pause:5.6' : `quay.io/acme/${res.name}:1.0` }, buttons: [] }))}
            cols={[['Image', 'image', 'minmax(10rem, 2fr)']]} />
        </Section>
      {:else if isKube(s.id)}
        {#if s.id === 'deployments'}
          {@const pods = relatedPods(res)}
          <Section title="Pods" count={pods.length} testid="deployment-pods">
            <ModernTable {variant} readonly initialSort="" rows={pods.map(p => refRow(p, p.name, { info: p.sub, age: p.age }))} cols={[['Info', 'info', 'minmax(10rem, 2fr)'], ['Age', 'age', '100px', true]]} />
          </Section>
        {/if}
        <Section title="Conditions" count={3} testid="conditions">
          <ModernTable {variant} readonly initialSort="" rows={textRows(kubeConditions(st), ['status', 'reason'], r => (r[1] === 'True' ? 'RUNNING' : 'DEGRADED'))} cols={[['Status', 'status', '90px'], ['Reason', 'reason', 'minmax(10rem, 2fr)']]} />
        </Section>
        <Section title="Events" testid="events">
          <ModernTable {variant} readonly initialSort="" rows={textRows(kubeEvents({ ...res, status: st }).map(([t, r, m, a]) => [r, t, m, a]), ['type', 'message', 'age'], r => (r[1] === 'Warning' ? 'DEGRADED' : 'RUNNING'))} cols={[['Type', 'type', '90px'], ['Message', 'message', 'minmax(14rem, 4fr)'], ['Age', 'age', '70px']]} />
        </Section>
      {/if}
    </div>
  {/if}
</div>
