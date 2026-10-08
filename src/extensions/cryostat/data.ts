/**
 * Mock Cryostat 4.2 data, shaped like the REST API (`/api/v4/targets`,
 * `/api/v4/targets/{id}/recordings`, `/api/v4/recordings`, `/api/v4/rules`,
 * event templates) plus the automated analysis report.
 *
 * Read accessors are pure (safe in `$derived`); every write lives in an
 * action function called from a handler, a task or the seed.
 */
import type { Container } from '#lib/world.svelte.ts';
import { ago, extData, later, runTask, toast, world } from '#lib/world.svelte.ts';

export const CRYOSTAT_EXT = 'redhat.cryostat';
export const CRYOSTAT_URL = 'http://localhost:8181';
export const DISCOVERY_LABEL = 'io.cryostat.discovery';
export const JMX_PORT_LABEL = 'io.cryostat.jmxPort';

/** `jdk.jfr.RecordingState`. */
export type RecordingState = 'NEW' | 'DELAYED' | 'RUNNING' | 'STOPPED' | 'CLOSED';

export interface KeyValueLabel {
  key: string;
  value: string;
}

export interface Target {
  id: number;
  jvmId: string;
  alias: string;
  connectUrl: string;
  agent: boolean;
  labels: KeyValueLabel[];
  annotations: { platform: Record<string, string>; cryostat: Record<string, string> };
  /** Backing container when it exists in the world (mock only). */
  containerId?: string;
  engineId?: string;
}

export interface ActiveRecording {
  id: number;
  remoteId: number;
  name: string;
  /** Target alias (container name). */
  target: string;
  state: RecordingState;
  /** ms, 0 = continuous. */
  duration: number;
  startTime: number;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
  archiveOnStop: boolean;
  metadata: { labels: KeyValueLabel[] };
  /** Simulated recording time elapsed, in ms (mock only, drives the countdown). */
  elapsed: number;
  /** Archive created from this recording. */
  archive?: string;
}

export interface RuleScore {
  rule: string;
  score: number;
  severity: 'ok' | 'info' | 'warning';
  summary: string;
}

export interface FlameFrame {
  depth: number;
  /** Percent of samples, from the left. */
  start: number;
  width: number;
  frame: string;
}

export interface Allocation {
  type: string;
  percent: number;
  bytes: string;
  topFrame: string;
}

export interface Report {
  rules: RuleScore[];
  flame: FlameFrame[];
  allocations: Allocation[];
}

export interface ArchivedRecording {
  name: string;
  jvmId: string;
  target: string;
  size: number;
  archivedTime: number;
  downloadUrl: string;
  reportUrl: string;
  report: Report;
}

export interface EventTemplate {
  name: string;
  type: 'TARGET' | 'CUSTOM' | 'PRESET';
  provider: string;
  description: string;
}

export interface AutomatedRule {
  name: string;
  description: string;
  enabled: boolean;
  matchExpression: string;
  eventSpecifier: string;
  archivalPeriodSeconds: number;
  initialDelaySeconds: number;
  preservedArchives: number;
  maxAgeSeconds: number;
  maxSizeBytes: number;
}

interface CryostatStore {
  recordings: ActiveRecording[];
  archives: ArchivedRecording[];
  /** Target alias → archive name shown in the JFR tab analysis view. */
  analysed: Record<string, string>;
  nextId: number;
}

/* ------------------------------------------------------------------ */
/* Static sample data (dossier §5)                                     */
/* ------------------------------------------------------------------ */

export const EVENT_TEMPLATES: EventTemplate[] = [
  { name: 'Continuous', type: 'TARGET', provider: 'Oracle', description: 'Low overhead configuration safe for continuous use in production environments, typically less than 1 % overhead.' },
  { name: 'Profiling', type: 'TARGET', provider: 'Oracle', description: 'Low overhead configuration for profiling, typically around 2 % overhead.' },
  { name: 'ALL', type: 'TARGET', provider: 'Cryostat', description: 'Enable all available events in the target JVM, with default option values.' },
  { name: 'acme-gc-lock', type: 'CUSTOM', provider: 'Maya', description: 'GC + JavaMonitorEnter, 20 ms threshold' },
];

export const RULES: AutomatedRule[] = [
  {
    name: 'orders-continuous',
    description: 'Always-on recording for acme-orders',
    enabled: true,
    matchExpression: "target.labels.exists(l, l.key == 'app' && l.value == 'acme-orders')",
    eventSpecifier: 'template=Continuous,type=TARGET',
    archivalPeriodSeconds: 600,
    initialDelaySeconds: 30,
    preservedArchives: 6,
    maxAgeSeconds: 3600,
    maxSizeBytes: 104857600,
  },
  {
    name: 'inventory-startup',
    description: 'Profile the first two minutes of inventory-service',
    enabled: false,
    matchExpression: "target.alias == 'inventory-service'",
    eventSpecifier: 'template=Profiling,type=TARGET',
    archivalPeriodSeconds: 0,
    initialDelaySeconds: 0,
    preservedArchives: 1,
    maxAgeSeconds: 120,
    maxSizeBytes: 0,
  },
];

const STATIC_TARGETS: Target[] = [
  {
    id: 4,
    jvmId: '9a8b7c6d-inventory',
    alias: 'inventory-service',
    connectUrl: 'http://inventory-service:9977',
    agent: true,
    labels: [{ key: 'app', value: 'inventory-service' }],
    annotations: { platform: {}, cryostat: { REALM: 'CryostatAgent', JAVA_MAIN: 'jboss-modules.jar' } },
  },
  {
    id: 1,
    jvmId: '00aa11bb-cryostat',
    alias: 'cryostat',
    connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:0/jmxrmi',
    agent: false,
    labels: [],
    annotations: { platform: {}, cryostat: { REALM: 'Custom Targets' } },
  },
];

const LOAD_TEST_REPORT: Report = {
  rules: [
    { rule: 'Hot Methods', score: 78, severity: 'warning', summary: 'OrderResource.create accounts for 34 % of sampled CPU time, mostly in HashMap.resize via OrderMapper.toEntity.' },
    { rule: 'Thread contention', score: 41, severity: 'info', summary: 'executor-thread-3 blocked 1.2 s on org.hibernate.engine.jdbc.connections pool lock.' },
    { rule: 'Allocated classes', score: 36, severity: 'info', summary: 'byte[] and java.lang.String account for 55 % of allocations (JSON serialization).' },
    { rule: 'Heap Content', score: 25, severity: 'ok', summary: 'Live set stable at 142 MB after GC, no leak suspect.' },
    { rule: 'GC Pressure', score: 12, severity: 'ok', summary: 'G1 spent 1.8 % of the recording in pauses (max 9 ms).' },
    { rule: 'Exceptions thrown', score: 4, severity: 'ok', summary: '12 exceptions per minute (jakarta.ws.rs.NotFoundException).' },
  ],
  flame: [
    { depth: 0, start: 0, width: 100, frame: 'java.lang.Thread.run' },
    { depth: 1, start: 0, width: 82, frame: 'io.netty.util.concurrent.FastThreadLocalRunnable.run' },
    { depth: 1, start: 82, width: 18, frame: 'org.jboss.threads.EnhancedQueueExecutor$ThreadBody.run' },
    { depth: 2, start: 0, width: 82, frame: 'io.vertx.core.impl.ContextImpl.emit' },
    { depth: 2, start: 82, width: 18, frame: 'io.agroal.pool.ConnectionPool.housekeeping' },
    { depth: 3, start: 0, width: 80, frame: 'io.quarkus.vertx.http.runtime.VertxHttpRecorder$1.handle' },
    { depth: 4, start: 0, width: 78, frame: 'org.jboss.resteasy.reactive.server.handlers.InvocationHandler.handle' },
    { depth: 5, start: 0, width: 52, frame: 'com.acme.orders.OrderResource.create' },
    { depth: 5, start: 52, width: 26, frame: 'com.acme.orders.OrderResource.list' },
    { depth: 6, start: 0, width: 34, frame: 'com.acme.orders.OrderMapper.toEntity' },
    { depth: 6, start: 34, width: 18, frame: 'org.hibernate.internal.SessionImpl.persist' },
    { depth: 6, start: 52, width: 26, frame: 'com.fasterxml.jackson.databind.ObjectWriter.writeValue' },
    { depth: 7, start: 0, width: 29, frame: 'java.util.HashMap.resize' },
    { depth: 7, start: 34, width: 18, frame: 'org.hibernate.engine.jdbc.internal.ResultSetReturnImpl.executeUpdate' },
    { depth: 7, start: 52, width: 17, frame: 'java.lang.StringLatin1.newString' },
  ],
  allocations: [
    { type: 'byte[]', percent: 38, bytes: '1.9 GB', topFrame: 'io.netty.buffer.PooledByteBufAllocator.newHeapBuffer' },
    { type: 'java.lang.String', percent: 17, bytes: '860 MB', topFrame: 'com.fasterxml.jackson.core.json.ReaderBasedJsonParser.getText' },
    { type: 'java.util.HashMap$Node[]', percent: 12, bytes: '610 MB', topFrame: 'java.util.HashMap.resize' },
    { type: 'com.acme.orders.OrderEntity', percent: 7, bytes: '352 MB', topFrame: 'com.acme.orders.OrderMapper.toEntity' },
    { type: 'java.lang.Object[]', percent: 5, bytes: '251 MB', topFrame: 'java.util.ArrayList.grow' },
  ],
};

const STARTUP_REPORT: Report = {
  rules: [
    { rule: 'Class loading', score: 54, severity: 'info', summary: '11 482 classes loaded in 1.4 s during startup.' },
    { rule: 'Hot Methods', score: 31, severity: 'info', summary: 'io.quarkus.arc.impl.ArcContainerImpl.init dominates the first 2 s.' },
    { rule: 'GC Pressure', score: 9, severity: 'ok', summary: 'No full GC; 3 young collections.' },
    { rule: 'Heap Content', score: 6, severity: 'ok', summary: 'Heap grew to 96 MB, then stable.' },
  ],
  flame: [
    { depth: 0, start: 0, width: 100, frame: 'io.quarkus.bootstrap.runner.QuarkusEntryPoint.main' },
    { depth: 1, start: 0, width: 100, frame: 'io.quarkus.runtime.Application.start' },
    { depth: 2, start: 0, width: 61, frame: 'io.quarkus.arc.impl.ArcContainerImpl.init' },
    { depth: 2, start: 61, width: 39, frame: 'io.quarkus.hibernate.orm.runtime.JPAConfig.startAll' },
    { depth: 3, start: 61, width: 39, frame: 'org.hibernate.boot.internal.SessionFactoryBuilderImpl.build' },
  ],
  allocations: [
    { type: 'byte[]', percent: 31, bytes: '210 MB', topFrame: 'java.util.zip.InflaterInputStream.read' },
    { type: 'java.lang.String', percent: 22, bytes: '149 MB', topFrame: 'jdk.internal.loader.BuiltinClassLoader.loadClass' },
  ],
};

/* ------------------------------------------------------------------ */
/* Read accessors (pure)                                               */
/* ------------------------------------------------------------------ */

const EMPTY: CryostatStore = { recordings: [], archives: [], analysed: {}, nextId: 30 };

function store(): CryostatStore {
  return (world.ext[CRYOSTAT_EXT]?.store as CryostatStore | undefined) ?? EMPTY;
}

export function isDiscoverable(c: Container): boolean {
  return c.labels[DISCOVERY_LABEL] === 'true';
}

/** Images that look like a JVM workload (offer "Make discoverable"). */
export function looksJava(c: Container): boolean {
  return /quarkus|openjdk|eap|acme|java|jboss|wildfly|spring/i.test(c.image);
}

export function connectUrlOf(c: Container): string {
  return c.labels['io.cryostat.jmxUrl'] ?? `service:jmx:rmi:///jndi/rmi://${c.labels['io.cryostat.jmxHost'] ?? c.name}:${c.labels[JMX_PORT_LABEL] ?? '9091'}/jmxrmi`;
}

export function javaMainOf(c: Container): string {
  if (/eap|jboss|wildfly/i.test(c.image)) return 'jboss-modules.jar';
  return 'io.quarkus.bootstrap.runner.QuarkusEntryPoint';
}

export function targetOf(c: Container, id: number): Target {
  return {
    id,
    jvmId: `${c.id.slice(0, 8)}-${c.name}`,
    alias: c.name,
    connectUrl: connectUrlOf(c),
    agent: false,
    labels: Object.entries(c.labels)
      .filter(([k]) => k.startsWith('io.cryostat') || k === 'app')
      .map(([key, value]) => ({ key, value })),
    annotations: {
      platform: { PODMAN_CONTAINER: c.name },
      cryostat: { REALM: 'Podman', HOST: c.name, PORT: c.labels[JMX_PORT_LABEL] ?? '9091', JAVA_MAIN: javaMainOf(c) },
    },
    containerId: c.id,
    engineId: c.engineId,
  };
}

/** Targets Cryostat discovers over the Podman socket + agent / custom targets. */
export function targets(): Target[] {
  const discovered = world.containers.filter(c => isDiscoverable(c) && c.state === 'RUNNING').map((c, i) => targetOf(c, 3 + i * 2));
  const aliases = new Set(discovered.map(t => t.alias));
  return [...discovered, ...STATIC_TARGETS.filter(t => !aliases.has(t.alias))];
}

export function recordings(target?: string): ActiveRecording[] {
  const all = store().recordings;
  return target ? all.filter(r => r.target === target) : all;
}

export function archives(target?: string): ArchivedRecording[] {
  const all = store().archives;
  return target ? all.filter(a => a.target === target) : all;
}

export function analysedArchive(target: string): ArchivedRecording | undefined {
  const name = store().analysed[target];
  return name ? store().archives.find(a => a.name === name) : undefined;
}

export function activeRecordings(): ActiveRecording[] {
  return store().recordings.filter(r => r.state === 'RUNNING');
}

export function templateOf(r: ActiveRecording): string {
  return r.metadata.labels.find(l => l.key === 'template.name')?.value ?? (r.metadata.labels.some(l => l.key === 'rule') ? 'Continuous' : 'Profiling');
}

export function remainingSeconds(r: ActiveRecording): number {
  return Math.max(0, Math.round((r.duration - r.elapsed) / 1000));
}

export function grafanaUrl(a: ArchivedRecording): string {
  return `http://localhost:3000/d/CazTaLnVk/jfr-dashboard?var-recording=${encodeURIComponent(a.name)}&from=${a.archivedTime - 300000}&to=${a.archivedTime}`;
}

/* ------------------------------------------------------------------ */
/* Actions (writes)                                                    */
/* ------------------------------------------------------------------ */

function writable(): CryostatStore {
  return extData<CryostatStore>(CRYOSTAT_EXT, 'store', { recordings: [], archives: [], analysed: {}, nextId: 30 });
}

export function seedStore(): void {
  const s = writable();
  if (s.recordings.length) return;
  s.recordings.push(
    {
      id: 20,
      remoteId: 1,
      name: 'auto_orders-continuous',
      target: 'acme-orders-dev',
      state: 'RUNNING',
      duration: 0,
      startTime: ago({ m: 62 }),
      continuous: true,
      toDisk: true,
      maxSize: 104857600,
      maxAge: 3600000,
      archiveOnStop: false,
      metadata: { labels: [{ key: 'rule', value: 'orders-continuous' }, { key: 'template.name', value: 'Continuous' }] },
      elapsed: 0,
    },
    {
      id: 17,
      remoteId: 3,
      name: 'startup-profile',
      target: 'acme-orders-dev',
      state: 'STOPPED',
      duration: 60000,
      startTime: ago({ h: 2, m: 10 }),
      continuous: false,
      toDisk: true,
      maxSize: 0,
      maxAge: 0,
      archiveOnStop: false,
      metadata: { labels: [{ key: 'template.name', value: 'Profiling' }, { key: 'template.type', value: 'TARGET' }] },
      elapsed: 60000,
      archive: 'acme-orders-dev_startup-profile_20261008T074600Z.jfr',
    },
  );
  s.archives.push({
    name: 'acme-orders-dev_startup-profile_20261008T074600Z.jfr',
    jvmId: 'f1e2d3c4-acme-orders',
    target: 'acme-orders-dev',
    size: 13002752,
    archivedTime: ago({ h: 2, m: 8 }),
    downloadUrl: '/api/v4/download/YWNtZS1vcmRlcnMtZGV2X3N0YXJ0dXAtcHJvZmlsZQ',
    reportUrl: '/api/v4/reports/YWNtZS1vcmRlcnMtZGV2X3N0YXJ0dXAtcHJvZmlsZQ',
    report: STARTUP_REPORT,
  });
}

/** Recordings currently ticked by a timer (not persisted). */
const ticking = new Set<number>();
/** Simulated seconds of recording per real (speed-scaled) second: a 60 s recording lasts ~6 s. */
const SIM_FACTOR = 10;

function tick(id: number): void {
  const r = writable().recordings.find(x => x.id === id);
  if (r?.state !== 'RUNNING' || r.continuous) {
    ticking.delete(id);
    return;
  }
  r.elapsed = Math.min(r.duration, r.elapsed + 1000 * SIM_FACTOR);
  if (r.elapsed >= r.duration) {
    ticking.delete(id);
    r.state = 'STOPPED';
    toast({ type: 'info', title: `Recording ${r.name} stopped`, body: `${Math.round(r.duration / 1000)} s of JFR data on ${r.target}` });
    if (r.archiveOnStop) archiveAndAnalyse(r.id);
    return;
  }
  later(1000, tick.bind(undefined, id));
}

/** Restart countdown timers after a reload (called from the JFR tab / dashboard effect). */
export function resumeRecordings(): void {
  for (const r of store().recordings) {
    if (r.state === 'RUNNING' && !r.continuous && !ticking.has(r.id)) {
      ticking.add(r.id);
      later(1000, tick.bind(undefined, r.id));
    }
  }
}

export function startRecording(target: string, name: string, template: string, durationS: number, archiveOnStop: boolean): void {
  const s = writable();
  const id = s.nextId++;
  s.recordings.unshift({
    id,
    remoteId: s.recordings.filter(r => r.target === target).length + 1,
    name,
    target,
    state: 'RUNNING',
    duration: durationS * 1000,
    startTime: Date.now(),
    continuous: false,
    toDisk: true,
    maxSize: 0,
    maxAge: 0,
    archiveOnStop,
    metadata: { labels: [{ key: 'template.name', value: template }, { key: 'template.type', value: template === 'acme-gc-lock' ? 'CUSTOM' : 'TARGET' }] },
    elapsed: 0,
  });
  ticking.add(id);
  later(1000, tick.bind(undefined, id));
  toast({ type: 'success', title: `Recording ${name} started`, body: `Template ${template}, ${durationS} s on ${target}` });
}

export function stopRecording(id: number): void {
  const r = writable().recordings.find(x => x.id === id);
  if (r?.state !== 'RUNNING') return;
  r.state = 'STOPPED';
  r.elapsed = r.continuous ? Date.now() - r.startTime : r.elapsed;
  ticking.delete(id);
  toast({ type: 'info', title: `Recording ${r.name} stopped` });
}

export function deleteRecording(id: number): void {
  const s = writable();
  const r = s.recordings.find(x => x.id === id);
  s.recordings = s.recordings.filter(x => x.id !== id);
  ticking.delete(id);
  if (r) toast({ type: 'success', title: `Recording ${r.name} deleted` });
}

/** "Archive and analyse": upload the .jfr to the archive bucket and generate the automated report. */
export function archiveAndAnalyse(id: number): string | undefined {
  const r = writable().recordings.find(x => x.id === id);
  if (!r || r.archive) return undefined;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const name = `${r.target}_${r.name}_${stamp}.jfr`;
  r.archive = name;
  return runTask({
    name: `Archive and analyse ${r.name}`,
    ext: CRYOSTAT_EXT,
    steps: [
      { label: `Saving ${r.name} from ${r.target}`, ms: 700, log: [`PATCH /api/v4/targets/3/recordings/${r.remoteId} SAVE`] },
      { label: 'Uploading 12.4 MB to archivedrecordings', ms: 1500, log: [`PUT s3://archivedrecordings/${r.target}/${name} (12.4 MB)`] },
      { label: 'Generating automated analysis report', ms: 1600, log: ['cryostat-reports: evaluating 42 rules', 'Hot Methods: 78 (warning)', 'GC Pressure: 12 (ok)'] },
    ],
    action: { label: 'Open in Cryostat', href: '/tools/cryostat?tab=archives' },
    onDone: (): void => {
      const s = writable();
      s.archives.unshift({
        name,
        jvmId: `f1e2d3c4-${r.target}`,
        target: r.target,
        size: 13002752,
        archivedTime: Date.now(),
        downloadUrl: `/api/v4/download/${btoa(name).slice(0, 34)}`,
        reportUrl: `/api/v4/reports/${btoa(name).slice(0, 34)}`,
        report: LOAD_TEST_REPORT,
      });
      s.analysed[r.target] = name;
    },
  });
}

export function showReport(target: string, archive: string): void {
  writable().analysed[target] = archive;
}

export function deleteArchive(name: string): void {
  const s = writable();
  s.archives = s.archives.filter(a => a.name !== name);
  for (const [k, v] of Object.entries(s.analysed)) if (v === name) delete s.analysed[k];
  toast({ type: 'success', title: `Archive ${name} deleted` });
}

/** Recreate a container with the JMX options + discovery labels. */
export function makeDiscoverable(c: Container): void {
  const containerId = c.id;
  runTask({
    name: `Recreate ${c.name} with JMX`,
    ext: CRYOSTAT_EXT,
    steps: [
      { label: `Stopping ${c.name}`, ms: 700, log: [`podman stop ${c.name}`] },
      {
        label: `Recreating ${c.name} with JMX on port 9091`,
        ms: 1300,
        log: [
          `podman rm ${c.name}`,
          `podman run -d --name ${c.name} --label ${DISCOVERY_LABEL}=true --label ${JMX_PORT_LABEL}=9091 -e JAVA_TOOL_OPTIONS="-Dcom.sun.management.jmxremote.port=9091 -Dcom.sun.management.jmxremote.rmi.port=9091 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Djava.rmi.server.hostname=${c.name}" ${c.image}`,
        ],
      },
      { label: 'Waiting for Cryostat discovery', ms: 1200, log: ['ContainerDiscovery (Podman): polling every 10s', `Target FOUND: ${c.name}`] },
    ],
    onDone: (): void => {
      const target = world.containers.find(x => x.id === containerId);
      if (!target) return;
      target.labels = { ...target.labels, [DISCOVERY_LABEL]: 'true', [JMX_PORT_LABEL]: '9091' };
      target.env = [
        ...(target.env ?? []).filter(e => !e.startsWith('JAVA_TOOL_OPTIONS=')),
        `JAVA_TOOL_OPTIONS=-Dcom.sun.management.jmxremote.port=9091 -Dcom.sun.management.jmxremote.rmi.port=9091 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Djava.rmi.server.hostname=${target.name}`,
      ];
      target.state = 'RUNNING';
      target.startedAt = Date.now();
      toast({ type: 'success', title: `Target FOUND: ${target.name}`, body: 'Cryostat discovered the JVM over the Podman socket.', action: { label: 'Open JFR', href: `/c/${target.engineId}/containers/${target.id}/jfr` } });
    },
  });
}
