<script lang="ts">
/**
 * "Kompose · <source>" tab (Kompose extension): convert a compose project, a
 * pod, a quadlet or selected containers into Kubernetes resources.
 * Header: segmented Manifests | Warnings, Export ▾, Dry run, primary Deploy.
 * Target bar (second row): cluster / namespace and generator (the kompose
 * binary and its version live in Settings › CLI Tools).
 * Manifests (default): files grouped per compose service (`io.kompose.service`),
 * the group row summarizes the service and its "Options" menu edits controller,
 * replicas, Service type, expose, PVC and image strategy; YAML on the right.
 */
import { faFileExport, faPlay, faRocket, faSliders } from '@fortawesome/free-solid-svg-icons';

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
let view = $state('manifests');
let file = $state('');
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');

const svcs = $derived(servicesOf(key));
const files = $derived(manifestsOf(key, target, ns, generator));
const warnings = $derived(warningsOf(key));
const dep = $derived(kompose.deployed[key]);
const onTarget = $derived(!!dep && dep.connId === target && dep.ns === ns);
const current = $derived(files.find(f => f.file === file) ?? files[0]);

function setTarget(id: string): void {
  target = id;
  const all = namespacesOf(id);
  const sel = selectedNs(id).filter(x => x !== '*');
  ns = id === 'kind-dev' ? 'default' : (sel[0] ?? all[0] ?? 'default');
}

const STRAT = { keep: 'Keep (pull from registry)', quay: 'Push to Quay', load: 'Load into the cluster' };
const STRAT_SHORT = { keep: 'pull', quay: 'push to Quay', load: 'load' };

function svcMenu(s: KService): MenuItem[] {
  const e = (patch: Partial<KService>) => (): void => editService(key, s.name, patch);
  return [
    ...(['Deployment', 'StatefulSet', 'DaemonSet'] as const).map(c => ({ label: `${s.controller === c ? '✓ ' : ''}${c}`, run: e({ controller: c }) })),
    { label: `Replicas +1 (now ${s.replicas})`, disabled: s.controller === 'DaemonSet', run: e({ replicas: s.replicas + 1 }), sep: true },
    { label: 'Replicas −1', disabled: s.replicas <= 1 || s.controller === 'DaemonSet', run: e({ replicas: s.replicas - 1 }) },
    ...(['ClusterIP', 'NodePort', 'LoadBalancer'] as const).map((t, i) => ({ label: `${s.type === t ? '✓ ' : ''}Service ${t}`, disabled: !s.port, run: e({ type: t }), sep: i === 0 })),
    { label: s.expose ? `Don't expose (no ${exposeKind(target)})` : `Expose with an ${exposeKind(target)}`, disabled: !s.port, run: e({ expose: !s.expose }), sep: true },
    ...(s.volume
      ? [
          ...['1Gi', '5Gi', '10Gi'].map((sz, i) => ({ label: `${s.volume?.size === sz ? '✓ ' : ''}PVC ${s.volume?.name} · ${sz}`, run: e({ volume: { ...s.volume!, size: sz } }), sep: i === 0 })),
          { label: 'Drop the PVC (emptyDir)', run: e({ volume: undefined }) },
        ]
      : [{ label: 'Persist data in a PVC (1Gi)', run: e({ volume: { name: `${s.name}-data`, size: '1Gi', storageClass: 'default' } }), sep: true }]),
    ...(Object.keys(STRAT) as KService['strategy'][]).map((k, i) => ({ label: `${s.strategy === k ? '✓ ' : ''}Image: ${STRAT[k]}`, run: e({ strategy: k }), sep: i === 0 })),
  ];
}

function diffOf(f: { file: string }): string {
  if (!dep || !onTarget) return 'New';
  return dep.drifted && /deployment|statefulset|daemonset|service/.test(f.file) ? 'Modified' : 'Unchanged';
}

/** One group per compose service: summary row + its generated files. */
const groups = $derived<LabRow[]>(
  svcs.map(s => {
    const summary = [
      s.controller === 'DaemonSet' ? 'DaemonSet' : `${s.controller} ×${s.replicas}`,
      s.port ? `${s.type} :${s.port}` : 'no Service',
      ...(s.expose && s.port ? [`${exposeKind(target)} ${hostOf(s.name, target, ns)}`] : []),
      ...(s.volume ? [`PVC ${s.volume.size}`] : []),
      `image: ${STRAT_SHORT[s.strategy]}`,
    ].join(' · ');
    return {
      name: `svc:${s.name}`,
      status: '',
      icon: KOMPOSE_ICON,
      title: s.name,
      sub: [],
      agg: summary,
      cols: {},
      buttons: [{ title: 'Options', icon: faSliders, label: true, run: (e?: MouseEvent): void => void (e && openMenu(e, svcMenu(s))) }],
      menu: (): MenuItem[] => svcMenu(s),
      children: files
        .filter(f => f.svc === s.name)
        .map(f => ({
          name: f.file,
          status: '',
          icon: KOMPOSE_ICON,
          title: f.file,
          sub: [],
          cols: { kind: f.kind, diff: diffOf(f) },
          open: (): void => void (file = f.file),
          buttons: [],
        })),
    };
  }),
);

const warnRows = $derived<LabRow[]>(warnings.map(([feature, svc, sev, msg], i) => ({ name: `${i}`, status: sev === 'warn' ? 'DEGRADED' : '', dotTitle: 'Warning', icon: KOMPOSE_ICON, title: feature, sub: [], cols: { svc, sev: sev === 'warn' ? 'Warning' : 'Info', msg }, buttons: [] })));

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

{#snippet actions()}
  <Btn icon={faFileExport} testid="kompose-export" onclick={exportMenu}>Export ▾</Btn>
  <Btn icon={faPlay} testid="kompose-dryrun" onclick={(): void => dryRun(key, target, ns, generator)}>Dry run</Btn>
  <Btn kind="primary" icon={faRocket} testid="kompose-deploy" onclick={(): void => deploy(key, target, ns, generator)}>{onTarget ? 'Redeploy' : 'Deploy'}</Btn>
{/snippet}

<div data-testid="kompose-view" class="flex flex-col h-full min-h-0 min-w-0">
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
      provenance="Kompose"
      views={[['manifests', `Manifests (${files.length})`], ['warnings', `Warnings (${warnings.length})`]]}
      {view}
      onview={(v): void => void (view = v)}
      {actions} />
    <div data-testid="kompose-target-bar" class="tbar">
      <span class="lbl">Target</span>
      <select aria-label="Target cluster" data-testid="kompose-target" class="sel" value={target} onchange={(e): void => setTarget(e.currentTarget.value)}>
        {#each clusters as c (c.id)}<option value={c.id}>{c.name} · {connStatus(c)}</option>{/each}
      </select>
      <span class="opacity-50">/</span>
      <select aria-label="Namespace" data-testid="kompose-ns" class="sel" bind:value={ns}>
        {#each [...new Set([ns, ...namespacesOf(target)])] as n (n)}<option value={n}>{n}</option>{/each}
      </select>
      <span class="lbl ml-3">Generator</span>
      <select aria-label="Generator" data-testid="kompose-generator" class="sel" bind:value={generator}>
        <option value="kompose">Kompose</option>
        <option value="podman">podman generate kube</option>
        <option value="score">Score</option>
      </select>
      <span class="flex-1"></span>
      <span class="truncate min-w-0" data-testid="kompose-sub">{dep ? `${dep.drifted ? 'Drifted' : 'Synced'} · ${conn(dep.connId)?.name ?? dep.connId}/${dep.ns}` : `${svcs.length} services → ${files.length} files`}</span>
    </div>
    {#if view === 'warnings'}
      <div data-testid="kompose-warnings" class="flex flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <ModernTable rows={warnRows} {variant} readonly initialSort="" cols={[['Service', 'svc', '140px'], ['Severity', 'sev', '90px'], ['Detail', 'msg', 'minmax(10rem, 4fr)']]} />
      </div>
    {:else}
      <div data-testid="kompose-manifests" class="flex flex-1 min-h-0 min-w-0">
        <div class="flex w-[35rem] max-w-[58%] shrink-0 min-h-0 overflow-y-auto overflow-x-hidden border-r border-[var(--pd-content-divider)]">
          <ModernTable rows={groups} {variant} readonly initialSort="" cols={[['Kind', 'kind', '84px'], ['Diff', 'diff', '72px']]} />
        </div>
        <div class="flex flex-col flex-1 min-w-0 min-h-0">
          <div data-testid="kompose-file" class="flex items-center h-7 px-3 shrink-0 text-[12px] font-mono text-[var(--pd-table-body-text)] border-b border-[var(--pd-content-divider)] truncate">{current?.file ?? ''}</div>
          <CodeView lines={current?.lines ?? []} lang="yaml" numbered testid="kompose-yaml" />
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
.tbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  min-width: 0;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--pd-table-body-text);
  border-bottom: 1px solid var(--pd-content-divider);
}
.lbl {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
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
