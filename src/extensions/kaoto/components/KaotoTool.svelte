<script lang="ts">
/**
 * Kaoto tool (P3): files of ~/dev/acme-integrations, the visual route canvas
 * (or the YAML DSL source), step properties, and the Camel JBang runtime
 * (`camel run --dev`, `camel ps`, `camel get route`, `camel export`).
 */
import { faCode, faDiagramProject, faFileCode, faFileExport, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { runTask, world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { CAMEL_VERSION, type CamelFile, camelAge, ensureWorkspace, type FlowStep, KAOTO_EXT, type RunningIntegration, WORKSPACE, workspace } from '../data.ts';

let selectedFile = $state('orders-to-kafka.camel.yaml');
let selectedStep = $state<string | undefined>('from');
let view = $state<'design' | 'source'>('design');
let now = $state(Date.now());

const ws = $derived(workspace());
const file = $derived(ws.files.find(f => f.file === selectedFile) ?? ws.files[0]);
const step = $derived(file?.steps.find(s => s.id === selectedStep));
const name = $derived(file ? file.file.replace(/\.(camel|pipe)\.yaml$/, '') : '');
const running = $derived(ws.running.find(r => r.name === name));
const launching = $derived(!!file && world.tasks.some(t => t.ext === KAOTO_EXT && t.status === 'in-progress' && t.name === `camel run ${file.file} --dev`));
const routes = $derived(ws.running.flatMap(r => r.routes.map(route => ({ r, route }))));

$effect(() => {
  const timer = setInterval(() => {
    now = Date.now();
  }, 1000);
  return (): void => clearInterval(timer);
});

function selectFile(f: CamelFile): void {
  selectedFile = f.file;
  selectedStep = f.steps[0]?.id;
}

function selectStep(s: FlowStep): void {
  selectedStep = s.id;
}

function showDesign(): void {
  view = 'design';
}

function showSource(): void {
  view = 'source';
}

function run(): void {
  if (!file) return;
  const f = file;
  const integration = name;
  const from = f.steps[0]?.detail ?? '';
  runTask({
    // the task ends when the route is up (it keeps running): name it after that, not after the command
    name: `Start ${integration}`,
    ext: KAOTO_EXT,
    steps: [
      { label: 'Resolving dependencies', ms: 1400, log: [`[jbang] Resolving dependencies...`, `[jbang]    org.apache.camel:camel-jbang-core:${CAMEL_VERSION}`, `[jbang] Dependencies resolved`] },
      {
        label: `camel run ${f.file} --dev`,
        ms: 1600,
        log: [
          `Apache Camel ${CAMEL_VERSION} (${integration}) is starting`,
          ...(f.file.startsWith('orders') && f.kind === 'Route' ? ['Property placeholder kafka.brokers resolved to localhost:9092 (service acme-kafka)', 'HTTP endpoints summary: http://0.0.0.0:8080/orders (POST) (accept:application/json)'] : []),
          `Routes startup (total:1 started:1)`,
          `    Started ${f.id} (${from.startsWith('rest:') ? 'rest://post:/orders' : from})`,
          `Apache Camel ${CAMEL_VERSION} (${integration}) started in 812ms (build:0ms init:0ms start:812ms)`,
          'Live reload enabled: watching for changes in ~/dev/acme-integrations',
        ],
      },
    ],
    onDone: () => {
      const w = ensureWorkspace();
      if (w.running.some(r => r.name === integration)) return;
      w.running.unshift({
        pid: w.running.some(r => r.pid === 48211) ? Math.max(...w.running.map(r => r.pid)) + 137 : 48211,
        name: integration,
        file: f.file,
        ready: '1/1',
        status: 'Running',
        started: Date.now(),
        total: 0,
        fail: 0,
        inflight: 0,
        routes: [{ id: f.id, from: from.startsWith('rest:') ? 'rest://post:/orders' : from, status: 'Started', total: 0, fail: 0, meanMs: 0, minMs: 0, maxMs: 0 }],
      });
    },
  });
}

function stop(r: RunningIntegration): void {
  r.status = 'Stopping';
  runTask({
    name: `camel stop ${r.name}`,
    ext: KAOTO_EXT,
    steps: [{ label: `camel stop ${r.name}`, ms: 900, log: [`Stopping running Camel integration (pid: ${r.pid})`, `Apache Camel ${CAMEL_VERSION} (${r.name}) shutdown in 41ms (uptime:${camelAge(r.started, Date.now())})`] }],
    onDone: () => {
      const w = ensureWorkspace();
      w.running = w.running.filter(x => x.pid !== r.pid);
    },
  });
}

function stopSelected(): void {
  if (running) stop(running);
}

function exportQuarkus(): void {
  if (!file) return;
  const f = file;
  runTask({
    name: `Export ${f.file} to Quarkus`,
    ext: KAOTO_EXT,
    steps: [
      { label: 'camel export --runtime=quarkus --gav=com.acme:acme-integrations:1.0.0 --directory=export/quarkus', ms: 1800, log: ['Generating fresh run data', 'Exporting as Quarkus project to: export/quarkus'] },
      { label: 'Writing project', ms: 1400, log: ['export/quarkus/pom.xml (quarkus-bom 3.27.x, camel-quarkus 3.27.x.redhat)', `export/quarkus/src/main/resources/camel/${f.file}`, 'export/quarkus/src/main/resources/application.properties', 'export/quarkus/src/main/docker/Dockerfile.jvm'] },
    ],
    onDone: () => {
      const w = ensureWorkspace();
      if (!w.exported.includes(f.file)) w.exported.push(f.file);
    },
  });
}
</script>

<NavPage title="Kaoto" searchEnabled={false}>
  {#snippet additionalActions()}
    <div class="flex rounded-md overflow-hidden" role="group" aria-label="View">
      <Button type="tab" icon={faDiagramProject} selected={view === 'design'} onclick={showDesign} aria-label="Design">Design</Button>
      <Button type="tab" icon={faCode} selected={view === 'source'} onclick={showSource} aria-label="Source">Source</Button>
    </div>
    <Button type="secondary" icon={faFileExport} onclick={exportQuarkus} disabled={!file || file.kind !== 'Route'}>Export to Quarkus</Button>
    {#if running}
      <Button type="secondary" icon={faStop} onclick={stopSelected} disabled={running.status !== 'Running'} aria-label="Stop selected integration">Stop</Button>
    {:else}
      <Button icon={faPlay} onclick={run} inProgress={launching} disabled={!file || launching}>Run with Camel JBang</Button>
    {/if}
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col w-full h-full overflow-auto px-5 pb-4 gap-3">
      <div class="grid grid-cols-[220px_minmax(0,1fr)_280px] gap-3 min-h-[420px]">
        <nav class="rounded-lg bg-[var(--pd-content-card-bg)] p-2 text-[var(--pd-content-card-text)]" aria-label="Integration files">
          <div class="px-2 py-1 text-xs font-mono font-semibold text-[var(--pd-table-header-text)] truncate" title={WORKSPACE}>{WORKSPACE}</div>
          {#each ws.files as f (f.file)}
            <button
              class="w-full flex items-start gap-2 rounded-md px-2 py-2 text-left {f.file === file?.file ? 'bg-[var(--pd-content-card-selected-bg)]' : 'hover:bg-[var(--pd-content-card-hover-bg)]'}"
              aria-current={f.file === file?.file ? 'true' : undefined}
              onclick={selectFile.bind(undefined, f)}>
              <AppIcon icon={faFileCode} class="mt-0.5" />
              <span class="flex flex-col min-w-0">
                <span class="truncate text-[var(--pd-content-card-header-text)]">{f.file}</span>
                <span class="text-xs opacity-80">{f.kind}{ws.running.some(r => r.file === f.file) ? ' · running' : ''}</span>
              </span>
            </button>
          {/each}
        </nav>

        <section class="rounded-lg bg-[var(--pd-content-card-inset-bg)] overflow-auto" aria-label={view === 'design' ? 'Route canvas' : 'Source'}>
          {#if file}
            <div class="flex items-center gap-2 px-4 pt-3 text-sm text-[var(--pd-content-text)]">
              <span class="font-semibold text-[var(--pd-content-header)]">{file.id}</span>
              <Pill label={file.kind} tone="info" />
              {#if running}<Pill label={running.status} tone="running" />{/if}
              {#if ws.exported.includes(file.file)}<Pill label="Exported to Quarkus" tone="success" />{/if}
              <span class="grow"></span>
              <span class="text-xs opacity-80">{file.description}</span>
            </div>
            {#if view === 'design'}
              <ol class="flex flex-col items-center py-6" aria-label="Steps of {file.id}">
                {#each file.steps as s, i (s.id)}
                  {#if i > 0}
                    <li class="w-px h-6 bg-[var(--pd-content-divider)]" aria-hidden="true"></li>
                  {/if}
                  <li>
                    <button
                      class="flex items-center gap-3 w-72 rounded-lg px-3 py-2 text-left border-2 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] {s.id === selectedStep ? 'border-[var(--pd-content-card-border-selected)] bg-[var(--pd-content-card-selected-bg)]' : 'border-[var(--pd-content-card-border)] hover:bg-[var(--pd-content-card-hover-bg)]'}"
                      aria-pressed={s.id === selectedStep}
                      aria-label="{s.name} step"
                      onclick={selectStep.bind(undefined, s)}>
                      <span class="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--pd-content-card-inset-bg)] text-[var(--pd-content-card-header-text)]"><AppIcon icon={s.icon} /></span>
                      <span class="flex flex-col min-w-0">
                        <span class="text-xs uppercase opacity-70">{s.category}</span>
                        <span class="font-semibold text-[var(--pd-content-card-header-text)]">{s.name}</span>
                        <span class="text-xs truncate font-mono" title={s.detail}>{s.detail}</span>
                      </span>
                    </button>
                  </li>
                {/each}
              </ol>
            {:else}
              <pre class="m-4 p-3 rounded-md text-xs font-mono leading-5 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] overflow-auto" aria-label="YAML DSL of {file.file}">{file.yaml}</pre>
            {/if}
          {/if}
        </section>

        <aside class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 text-[var(--pd-content-card-text)]" aria-label="Step properties">
          {#if step}
            <div class="flex items-center gap-2 mb-1">
              <AppIcon icon={step.icon} />
              <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">{step.name}</h2>
            </div>
            <p class="text-xs opacity-80 mb-3">{step.category}</p>
            <KeyValue labelWidth="w-28" rows={step.properties} />
          {:else}
            <p class="text-sm">Select a step to see its properties.</p>
          {/if}
        </aside>
      </div>

      <Card title="Running integrations" subtitle="camel ps · Camel JBang {CAMEL_VERSION}">
        {#if ws.running.length === 0}
          <p class="text-sm">No integration is running. Use "Run with Camel JBang" to start the selected route in dev mode.</p>
        {:else}
          <div class="rounded-md overflow-hidden bg-[var(--pd-content-card-inset-bg)]" role="table" aria-label="Running integrations">
            <div class="grid grid-cols-[80px_1.5fr_70px_100px_80px_70px_60px_80px_90px] gap-2 px-3 py-2 text-xs uppercase text-[var(--pd-table-header-text)] font-semibold" role="row">
              <span role="columnheader">PID</span><span role="columnheader">Name</span><span role="columnheader">Ready</span><span role="columnheader">Status</span><span role="columnheader">Age</span><span role="columnheader">Total</span><span role="columnheader">Fail</span><span role="columnheader">Inflight</span><span role="columnheader" class="text-right">Actions</span>
            </div>
            {#each ws.running as r (r.pid)}
              <div class="grid grid-cols-[80px_1.5fr_70px_100px_80px_70px_60px_80px_90px] gap-2 px-3 py-2 items-center text-sm border-t border-[var(--pd-content-divider)] text-[var(--pd-table-body-text)] tabular-nums" role="row">
                <span role="cell">{r.pid}</span>
                <span role="cell" class="truncate text-[var(--pd-table-body-text-highlight)]">{r.name}</span>
                <span role="cell">{r.ready}</span>
                <span role="cell"><Pill label={r.status} tone={r.status === 'Running' ? 'running' : 'warning'} /></span>
                <span role="cell">{camelAge(r.started, now)}</span>
                <span role="cell">{r.total}</span>
                <span role="cell" class={r.fail > 0 ? 'text-[var(--pd-state-error)]' : ''}>{r.fail}</span>
                <span role="cell">{r.inflight}</span>
                <span role="cell" class="flex justify-end"><Button type="secondary" icon={faStop} onclick={stop.bind(undefined, r)} disabled={r.status !== 'Running'} aria-label="Stop {r.name}">Stop</Button></span>
              </div>
            {/each}
          </div>
          <p class="text-sm mt-3 mb-1">camel get route</p>
          <div class="rounded-md overflow-hidden bg-[var(--pd-content-card-inset-bg)]" role="table" aria-label="Routes">
            <div class="grid grid-cols-[70px_1fr_1fr_1.6fr_80px_70px_60px_50px] gap-2 px-3 py-2 text-xs uppercase text-[var(--pd-table-header-text)] font-semibold" role="row">
              <span role="columnheader">PID</span><span role="columnheader">Name</span><span role="columnheader">ID</span><span role="columnheader">From</span><span role="columnheader">Status</span><span role="columnheader">Age</span><span role="columnheader">Total</span><span role="columnheader">Fail</span>
            </div>
            {#each routes as { r, route } (`${r.pid}-${route.id}`)}
              <div class="grid grid-cols-[70px_1fr_1fr_1.6fr_80px_70px_60px_50px] gap-2 px-3 py-2 text-sm border-t border-[var(--pd-content-divider)] text-[var(--pd-table-body-text)] tabular-nums" role="row">
                <span role="cell">{r.pid}</span>
                <span role="cell" class="truncate">{r.name}</span>
                <span role="cell" class="truncate">{route.id}</span>
                <span role="cell" class="truncate font-mono" title={route.from}>{route.from}</span>
                <span role="cell">{route.status}</span>
                <span role="cell">{camelAge(r.started, now)}</span>
                <span role="cell">{route.total}</span>
                <span role="cell">{route.fail}</span>
              </div>
            {/each}
          </div>
        {/if}
      </Card>
    </div>
  {/snippet}
</NavPage>
