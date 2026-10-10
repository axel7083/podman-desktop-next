<script lang="ts">
/**
 * "Kompose · <source>" tab (Kompose extension): convert a compose project, a
 * pod, a quadlet or selected containers into Kubernetes resources.
 * Header: target cluster, namespace and generator pickers, Export ▾, Dry run,
 * primary Deploy. Views: Services (per-service controller, replicas, Service
 * type, expose host, PVC, image strategy, edited from the row menu) |
 * Manifests (generated files + YAML with find, diff state vs the cluster) |
 * Warnings (dropped / lossy compose features).
 */
import { faCode, faFileExport, faPlay, faRocket } from '@fortawesome/free-solid-svg-icons';

import { CONNECTIONS, conn, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import Btn from './Btn.svelte';
import type { LabRow } from './cells/types.ts';
import CodeView from './CodeView.svelte';
import { isInstalled } from './exts.ts';
import Head from './Head.svelte';
import { dryRun, deploy, editService, exposeKind, hostOf, KOMPOSE_ICON, kompose, manifestsOf, servicesOf, sourceLabel, sourcesOf, warningsOf, type KService } from './kompose.svelte.ts';
import { namespacesOf, selectedNs } from './kube-ns.svelte.ts';
import { connStatus, type MenuItem, openMenu } from './live.svelte.ts';
import ModernTable from './ModernTable.svelte';
import PromoEmpty from './PromoEmpty.svelte';
import { runTask } from './flows.svelte.ts';

interface Props {
  key: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { key, onopen }: Props = $props();

const src = $derived(sourcesOf(key));
const srcConn = $derived(src[0]?.connId);
const clusters = $derived(CONNECTIONS.filter(c => c.group === 'Kubernetes'));
// svelte-ignore state_referenced_locally
let target = $state(kompose.deployed[key]?.connId ?? 'kind-dev');
// svelte-ignore state_referenced_locally
let ns = $state(kompose.deployed[key]?.ns ?? 'default');
let generator = $state('kompose');
let view = $state('services');
let file = $state(0);
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');

const svcs = $derived(servicesOf(key));
const files = $derived(manifestsOf(key, target, ns, generator));
const warnings = $derived(warningsOf(key));
const dep = $derived(kompose.deployed[key]);
const onTarget = $derived(!!dep && dep.connId === target && dep.ns === ns);

function setTarget(id: string): void {
  target = id;
  const all = namespacesOf(id);
  const sel = selectedNs(id).filter(x => x !== '*');
  ns = id === 'kind-dev' ? 'default' : (sel[0] ?? all[0] ?? 'default');
}

const STRAT = { keep: 'Keep (pull from registry)', quay: 'Push to Quay', load: 'Load into the cluster' };

function svcMenu(s: KService): MenuItem[] {
  const e = (patch: Partial<KService>) => (): void => editService(key, s.name, patch);
  return [
    ...(['Deployment', 'StatefulSet', 'DaemonSet'] as const).map(c => ({ label: `${s.controller === c ? '✓ ' : ''}${c}`, run: e({ controller: c }) })),
    { label: 'Replicas +1', run: e({ replicas: s.replicas + 1 }), sep: true },
    { label: 'Replicas −1', disabled: s.replicas <= 1, run: e({ replicas: s.replicas - 1 }) },
    ...(['ClusterIP', 'NodePort', 'LoadBalancer'] as const).map((t, i) => ({ label: `${s.type === t ? '✓ ' : ''}Service ${t}`, run: e({ type: t }), sep: i === 0 })),
    { label: s.expose ? `Don't expose (no ${exposeKind(target)})` : `Expose with an ${exposeKind(target)}`, disabled: !s.port, run: e({ expose: !s.expose }), sep: true },
    ...(Object.keys(STRAT) as KService['strategy'][]).map((k, i) => ({ label: `${s.strategy === k ? '✓ ' : ''}Image: ${STRAT[k]}`, run: e({ strategy: k }), sep: i === 0 })),
  ];
}

const rows = $derived<LabRow[]>(
  svcs.map(s => ({
    name: s.name,
    status: dep && onTarget ? (dep.drifted ? 'DEGRADED' : 'RUNNING') : '',
    icon: KOMPOSE_ICON,
    title: s.name,
    sub: [],
    cols: {
      controller: s.controller,
      replicas: s.controller === 'DaemonSet' ? 'per node' : String(s.replicas),
      type: s.port ? `${s.type} :${s.port}` : '—',
      expose: s.expose && s.port ? `${exposeKind(target)} ${hostOf(s.name, target, ns)}` : '—',
      pvc: s.volume ? `${s.volume.name} · ${s.volume.size} · ${s.volume.storageClass}` : '—',
      image: STRAT[s.strategy],
    },
    buttons: [],
    menu: (): MenuItem[] => svcMenu(s),
  })),
);

const fileRows = $derived<LabRow[]>(
  files.map((f, i) => ({
    name: f.file,
    status: !dep || !onTarget ? 'CREATED' : dep.drifted && /deployment|statefulset|daemonset|service/.test(f.file) ? 'DEGRADED' : 'RUNNING',
    icon: faCode,
    title: f.file,
    sub: [],
    cols: { kind: f.kind, lines: String(f.lines.length), diff: !dep || !onTarget ? 'New' : dep.drifted && /deployment|statefulset|daemonset|service/.test(f.file) ? 'Modified' : 'Unchanged' },
    open: (): void => void (file = i),
    buttons: [],
  })),
);

const warnRows = $derived<LabRow[]>(warnings.map(([feature, svc, sev, msg], i) => ({ name: `${i}`, status: sev === 'warn' ? 'DEGRADED' : 'CREATED', icon: KOMPOSE_ICON, title: feature, sub: [], cols: { svc, sev: sev === 'warn' ? 'Warning' : 'Info', msg }, buttons: [] })));

function exportMenu(e: MouseEvent): void {
  const ex = (label: string, cmd: string, out: string) => (): void => {
    lab.panel = true;
    runTask({ title: `Export ${sourceLabel(key)}`, connId: srcConn ?? target, icon: KOMPOSE_ICON, cmd, lines: [`✔ ${label} written to ${out}`] });
  };
  openMenu(e, [
    { label: 'Helm chart', run: ex('Helm chart', `kompose convert -f compose.yaml --chart -o ${sourceLabel(key)}-chart/`, `~/projects/${sourceLabel(key)}-chart/ (Chart.yaml, values.yaml, templates/)`) },
    { label: 'Kustomize base + overlay', run: ex('Kustomize', `kompose convert -o k8s/base && kustomize create --autodetect`, `~/projects/k8s/{base,overlays/${target}}`) },
    { label: 'Raw YAML', run: ex('Manifests', `kompose convert -f compose.yaml -o k8s/`, `~/projects/k8s/ (${files.length} files)`) },
    { label: 'Quadlet .kube', run: ex('Quadlet', `kompose convert --stdout > ${sourceLabel(key)}.yaml`, `~/.config/containers/systemd/${sourceLabel(key)}.kube (+ .yaml)`) },
  ]);
}
</script>

{#snippet pickers()}
  <select aria-label="Target cluster" data-testid="kompose-target" class="sel" value={target} onchange={(e): void => setTarget(e.currentTarget.value)}>
    {#each clusters as c (c.id)}<option value={c.id}>{c.name} · {connStatus(c)}</option>{/each}
  </select>
  <select aria-label="Namespace" data-testid="kompose-ns" class="sel" bind:value={ns}>
    {#each [...new Set([ns, ...namespacesOf(target)])] as n (n)}<option value={n}>{n}</option>{/each}
  </select>
  <select aria-label="Generator" data-testid="kompose-generator" class="sel" bind:value={generator}>
    <option value="kompose">Kompose 1.38</option>
    <option value="podman">podman generate kube</option>
    <option value="score">Score (score-k8s)</option>
  </select>
{/snippet}

{#snippet actions()}
  <Btn icon={faFileExport} testid="kompose-export" onclick={exportMenu}>Export ▾</Btn>
  <Btn icon={faPlay} testid="kompose-dryrun" onclick={(): void => dryRun(key, target, ns, generator)}>Dry run</Btn>
  <Btn kind="primary" icon={faRocket} testid="kompose-deploy" onclick={(): void => deploy(key, target, ns, generator)}>{onTarget ? 'Redeploy' : 'Deploy'}</Btn>
{/snippet}

<div data-testid="kompose-view" class="flex flex-col h-full min-h-0">
  {#if !isInstalled('kompose')}
    <Head icon={KOMPOSE_ICON} title="Kompose · {sourceLabel(key)}" connId={srcConn} onconn={(): void => onopen({ kind: 'connection', connId: srcConn }, {})} />
    <PromoEmpty icon={KOMPOSE_ICON} title="Convert to Kubernetes" description="Kompose turns a compose project, a pod or containers into Deployments, Services, PVCs and Routes / Ingresses, shows the YAML and the dropped features, then deploys them to a cluster." extId="kompose" info="kompose.io" onbrowse={(): void => onopen({ kind: 'extensions' }, {})} />
  {:else}
    <Head
      icon={KOMPOSE_ICON}
      title="Kompose · {sourceLabel(key)}"
      status={dep ? (dep.drifted ? 'degraded' : 'running') : undefined}
      connId={srcConn}
      onconn={(): void => onopen({ kind: 'connection', connId: srcConn }, {})}
      sub={dep ? `${dep.drifted ? 'Drifted' : 'Synced'} · ${dep.connId}/${dep.ns}` : `${svcs.length} services → ${conn(target)?.name}/${ns}`}
      provenance="Kompose"
      views={[['services', `Services (${svcs.length})`], ['manifests', `Manifests (${files.length})`], ['warnings', `Warnings (${warnings.length})`]]}
      {view}
      onview={(v): void => void (view = v)}
      filters={pickers}
      {actions} />
    {#if view === 'manifests'}
      <div data-testid="kompose-manifests" class="flex flex-1 min-h-0">
        <div class="flex w-[26rem] shrink-0 min-h-0 overflow-auto border-r border-[var(--pd-content-divider)]">
          <ModernTable rows={fileRows} {variant} readonly initialSort="" cols={[['Kind', 'kind', '120px'], ['Diff', 'diff', '90px']]} />
        </div>
        <div class="flex flex-1 min-w-0 min-h-0"><CodeView lines={files[file]?.lines ?? []} lang="yaml" numbered testid="kompose-yaml" /></div>
      </div>
    {:else if view === 'warnings'}
      <div data-testid="kompose-warnings" class="flex flex-1 min-h-0 overflow-auto">
        <ModernTable rows={warnRows} {variant} readonly initialSort="" cols={[['Service', 'svc', '140px'], ['Severity', 'sev', '90px'], ['Detail', 'msg', 'minmax(16rem, 4fr)']]} />
      </div>
    {:else}
      <div data-testid="kompose-services" class="flex flex-1 min-h-0 overflow-auto">
        <ModernTable
          {rows}
          {variant}
          readonly
          initialSort=""
          cols={[['Controller', 'controller', '110px'], ['Replicas', 'replicas', '80px'], ['Service', 'type', '130px'], ['Expose', 'expose', 'minmax(10rem, 1.5fr)'], ['Volume (PVC)', 'pvc', 'minmax(10rem, 1.2fr)'], ['Image', 'image', '170px']]} />
      </div>
    {/if}
  {/if}
</div>

<style>
.sel {
  height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 12px;
  background: var(--pd-select-bg);
  color: var(--pd-content-header);
  border: 1px solid var(--pd-input-field-stroke);
  max-width: 11rem;
}
</style>
