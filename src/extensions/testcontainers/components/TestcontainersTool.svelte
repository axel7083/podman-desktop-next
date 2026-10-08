<script lang="ts">
/**
 * Tools › Testcontainers: environment checklist (with fixes as tasks),
 * ~/.testcontainers.properties, live sessions (active / leaked) and a
 * simulated `mvn verify` run whose containers Ryuk reaps at the end.
 */
import { faBroom, faCheck, faCircleExclamation, faPlay, faWrench } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import { navigate } from '#lib/nav.ts';
import { deleteContainer, later, runTask, toast, world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { ENGINE, envChecks, type EnvCheck, markFixed, reusable, type SessionView, sessions, TC_EXT, tcContainer } from '../data.ts';

let taskId = $state<string>();
const checks = $derived(envChecks());
const list = $derived(sessions());
const leaked = $derived(list.filter(s => s.state === 'leaked'));
const reused = $derived(reusable());

function fix(c: EnvCheck): void {
  taskId = runTask({
    name: c.fix ?? 'Fix',
    ext: TC_EXT,
    steps: [
      { label: 'Writing ~/.testcontainers.properties', ms: 700, log: ['docker.host=unix:///run/user/1000/podman/podman.sock', 'testcontainers.reuse.enable=true'] },
      { label: 'Exporting TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE in ~/.bashrc', ms: 600 },
      { label: 'Smoke test (testcontainers/ryuk:0.14.0, alpine:3.17)', ms: 1500, log: ['Ryuk started - will monitor and terminate Testcontainers containers on JVM exit', 'Container alpine:3.17 started in PT1.2S'] },
    ],
    onDone: () => markFixed(c.id),
  });
}

function clean(): void {
  const ids = leaked.flatMap(s => s.containers.map(c => c.id));
  withConfirmation(
    () => {
      taskId = runTask({
        name: `Remove ${ids.length} leaked containers`,
        ext: TC_EXT,
        steps: [{ label: 'Removing containers whose Ryuk is gone', ms: 1200 }],
        onDone: () => ids.forEach(deleteContainer),
      });
    },
    `remove ${ids.length} leaked containers (reusable containers are kept)`,
    'Clean leaked containers?',
    'Clean',
  );
}

function simulate(): void {
  const id = crypto.randomUUID();
  const short = id.slice(0, 8);
  taskId = runTask({
    name: './mvnw verify (acme-orders)',
    ext: TC_EXT,
    steps: [
      { label: 'Starting Ryuk', ms: 600, log: [`Ryuk started - session ${id}`] },
      { label: 'Starting postgres:18 and kafka:4.2.0', ms: 1200, log: ['Container docker.io/library/postgres:18 started in PT1.8S', 'Container docker.io/apache/kafka:4.2.0 started in PT2.3S'] },
      { label: 'Running tests', ms: 2000, log: ['[INFO] Tests run: 42, Failures: 0, Errors: 0, Skipped: 1', '[INFO] BUILD SUCCESS'] },
    ],
    onDone: () => {
      later(4000, () => {
        const ids = world.containers.filter(c => c.labels['org.testcontainers.sessionId'] === id).map(c => c.id);
        world.containers = world.containers.filter(c => !ids.includes(c.id));
        toast({ type: 'info', title: `Session ${short} ended`, body: `Ryuk removed ${ids.length} containers` });
      });
    },
  });
  later(700, () => {
    world.containers.push(
      tcContainer(id, { name: `testcontainers-ryuk-${short}`, image: 'docker.io/testcontainers/ryuk:0.14.0', ryuk: true, upM: 0 }),
      tcContainer(id, { name: 'jolly_meitner', image: 'docker.io/library/postgres:18', ports: [[32811, 5432]], upM: 0 }),
      tcContainer(id, { name: 'gifted_hamilton', image: 'docker.io/apache/kafka:4.2.0', ports: [[32813, 9092]], upM: 0 }),
    );
  });
}

function openContainers(): void {
  navigate(`/c/${ENGINE}/containers`);
}

function sessionLabel(s: SessionView): string {
  return s.meta ? `${s.meta.command} · ${s.meta.project}` : 'unknown project';
}
</script>

<NavPage title="Testcontainers" searchEnabled={false}>
  {#snippet additionalActions()}
    <Button type="secondary" icon={faPlay} onclick={simulate}>Run ./mvnw verify</Button>
    <Button icon={faBroom} onclick={clean} disabled={leaked.length === 0}>Clean leaked containers</Button>
  {/snippet}
  {#snippet content()}
    <div class="w-full h-full overflow-auto px-5 py-4 space-y-3">
      <div class="grid grid-cols-[1.3fr_1fr] gap-3">
        <Card title="Environment" subtitle="Testcontainers 2.0.5 (Java) on podman-machine-default">
          {#each checks as c (c.id)}
            <div class="flex items-start gap-3 py-1.5 border-t first:border-t-0 border-[var(--pd-content-divider)]">
              <span class="pt-0.5 {c.ok ? 'text-[var(--pd-state-success)]' : 'text-[var(--pd-state-warning)]'}"><Icon icon={c.ok ? faCheck : faCircleExclamation} /></span>
              <div class="grow min-w-0">
                <div class="font-medium text-[var(--pd-content-card-header-text)]">{c.label}</div>
                <div class="text-xs font-mono wrap-anywhere">{c.detail}</div>
              </div>
              {#if !c.ok && c.fix}<Button type="secondary" icon={faWrench} onclick={fix.bind(undefined, c)}>Fix</Button>{/if}
            </div>
          {/each}
        </Card>
        <Card title="~/.testcontainers.properties">
          <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-bg)] overflow-auto">docker.host=unix:///run/user/1000/podman/podman.sock
testcontainers.reuse.enable=true
ryuk.container.privileged=true
ryuk.container.timeout=30
pull.timeout=120</pre>
        </Card>
      </div>
      <Card title="Sessions ({list.length})">
        {#snippet actions()}<Button type="link" onclick={openContainers}>Show in containers</Button>{/snippet}
        {#each list as s (s.sessionId)}
          <div class="flex items-center gap-3 py-2 border-t first:border-t-0 border-[var(--pd-content-divider)]" role="row">
            <span class="font-mono text-sm w-28 text-[var(--pd-content-card-header-text)]">{s.sessionId.slice(0, 8)}</span>
            {#if s.state === 'active'}<Pill label="Active" tone="running" />{:else}<Pill label="Leaked" tone="warning" title="No live Ryuk for this session" />{/if}
            <span class="grow truncate text-sm">{sessionLabel(s)}</span>
            <span class="text-sm">{s.containers.length} containers</span>
          </div>
        {/each}
        {#each reused as c (c.id)}
          <div class="flex items-center gap-3 py-2 border-t border-[var(--pd-content-divider)]" role="row">
            <span class="font-mono text-sm w-28 text-[var(--pd-content-card-header-text)]">reusable</span>
            <Pill label="Kept" tone="info" title="Has org.testcontainers.hash and no session: Ryuk never removes it" />
            <span class="grow truncate text-sm">{c.name} · {c.image.replace('docker.io/library/', '')}</span>
            <span class="text-xs font-mono">{c.labels['org.testcontainers.hash'].slice(0, 12)}</span>
          </div>
        {/each}
      </Card>
      <TaskLog {taskId} label="Testcontainers task" />
    </div>
  {/snippet}
</NavPage>
