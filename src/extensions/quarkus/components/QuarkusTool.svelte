<script lang="ts">
/**
 * Tools › Quarkus: detected projects (P15 workspace) with dev mode, Dev
 * Services and build tasks. Starting dev mode spawns the Dev Services
 * containers; stopping removes them (like Quarkus does).
 */
import { faArrowUpRightFromSquare, faHammer, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { mkImage } from '#lib/ext/helpers.ts';
import { href, navigate } from '#lib/nav.ts';
import { runTask, toast, world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { devServiceContainer, devServicesOf, ENGINE, isDevModeRunning, PROJECTS, QUARKUS_EXT, type QuarkusProject, setDevMode } from '../data.ts';

let taskId = $state<string>();

function start(p: QuarkusProject): void {
  taskId = runTask({
    name: `quarkus dev (${p.name})`,
    ext: QUARKUS_EXT,
    steps: [
      { label: 'Compiling with Maven', ms: 1200, log: ['[INFO] Scanning for projects...', '[INFO] --- quarkus:3.33.3.redhat-00001:dev (default-cli) @ acme-orders ---'] },
      ...p.devServices.map(s => ({ label: `Starting Dev Service ${s.service}`, ms: 700, log: [s.log] })),
      { label: 'Starting application', ms: 900, log: ['Listening on: http://localhost:8080', 'Profile dev activated. Live Coding activated.'] },
    ],
    action: { label: 'Open containers', href: `/c/${ENGINE}/containers` },
    onDone: () => {
      for (const s of p.devServices) {
        if (!world.containers.some(c => c.name === s.name)) world.containers.push(devServiceContainer(p, s));
      }
      setDevMode(p, true);
      toast({ type: 'info', title: 'Dev UI ready', body: p.devMode.devUi });
    },
  });
}

function stop(p: QuarkusProject): void {
  const ids = devServicesOf(p).map(c => c.id);
  taskId = runTask({
    name: `Stop dev mode (${p.name})`,
    ext: QUARKUS_EXT,
    steps: [
      { label: 'Stopping application', ms: 500, log: ['acme-orders stopped in 0.084s'] },
      { label: `Stopping ${ids.length} Dev Services`, ms: 900, log: devServicesOf(p).map(c => `Stopped container ${c.name}`) },
    ],
    onDone: () => {
      world.containers = world.containers.filter(c => !ids.includes(c.id));
      setDevMode(p, false);
    },
  });
}

function buildImage(p: QuarkusProject): void {
  taskId = runTask({
    name: `quarkus image build podman (${p.name})`,
    ext: QUARKUS_EXT,
    steps: [
      { label: 'Packaging (mvn package -DskipTests)', ms: 1500, log: ['[INFO] Building acme-orders 1.4.0-SNAPSHOT', '[INFO] [io.quarkus.deployment.QuarkusAugmentor] Quarkus augmentation completed in 3412ms'] },
      { label: 'Building image acme/acme-orders:1.4.0-SNAPSHOT', ms: 1800, log: ['STEP 1/4: FROM registry.access.redhat.com/ubi9/openjdk-21-runtime:1.23', 'COMMIT acme/acme-orders:1.4.0-SNAPSHOT'] },
    ],
    action: { label: 'Open images', href: `/c/${ENGINE}/images` },
    onDone: () => {
      if (!world.images.some(i => i.name === 'localhost/acme/acme-orders')) {
        world.images.push(mkImage(ENGINE, { name: 'localhost/acme/acme-orders', tag: '1.4.0-SNAPSHOT', sizeMB: 402, ageD: 0, base: 'ubi9', labels: { 'io.quarkus.version': '3.33.3' } }));
      }
    },
  });
}

function devUi(p: QuarkusProject): void {
  toast({ type: 'info', title: `Opening ${p.devMode.devUi}` });
}

function openContainer(id: string): void {
  navigate(`/c/${ENGINE}/containers/${id}/quarkus`);
}
</script>

<NavPage title="Quarkus" searchEnabled={false}>
  {#snippet content()}
    <div class="w-full h-full overflow-auto px-5 py-4 space-y-3">
      {#each PROJECTS as p (p.name)}
        {@const running = isDevModeRunning(p)}
        {@const services = devServicesOf(p)}
        <Card>
          <div class="flex items-start gap-4" role="region" aria-label="Project {p.name}">
            <AppIcon icon="icons/redhat.quarkus.png" size="36px" />
            <div class="grow min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">{p.name}</h2>
                {#if running}<Pill label="Dev mode" tone="running" />{:else}<Pill label="Stopped" />{/if}
              </div>
              <div class="text-sm">{p.path} · Red Hat build of Quarkus {p.platform} · Maven</div>
              <div class="flex flex-wrap gap-1 pt-1">
                {#each p.extensions as e (e)}<span class="rounded-md px-1.5 py-0.5 text-xs bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{e}</span>{/each}
              </div>
            </div>
            <div class="flex gap-2 shrink-0">
              {#if running}
                <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={devUi.bind(undefined, p)}>Open Dev UI</Button>
                <Button type="secondary" icon={faStop} onclick={stop.bind(undefined, p)}>Stop dev mode</Button>
              {:else}
                <Button icon={faPlay} onclick={start.bind(undefined, p)}>Start dev mode</Button>
              {/if}
              <Button type="secondary" icon={faHammer} onclick={buildImage.bind(undefined, p)}>Build image</Button>
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-sm font-semibold text-[var(--pd-content-card-header-text)] mb-1">Dev Services ({services.length})</h3>
            {#if services.length}
              <div class="grid grid-cols-4 gap-2">
                {#each services as c (c.id)}
                  <button class="rounded-md p-2 text-left bg-[var(--pd-content-card-inset-surface)] hover:bg-[var(--pd-content-card-hover-inset-bg)]" onclick={openContainer.bind(undefined, c.id)}>
                    <div class="font-medium text-[var(--pd-content-card-header-text)]">{c.labels['io.quarkus.devservice']}</div>
                    <div class="text-xs truncate">{c.image.replace('docker.io/', '')}</div>
                    <div class="text-xs tabular-nums">localhost:{c.ports[0]?.host} · {c.state.toLowerCase()}</div>
                  </button>
                {/each}
              </div>
            {:else}
              <p class="text-sm">No Dev Services running. Start dev mode to provision PostgreSQL, Kafka, Keycloak and Apicurio Registry automatically.</p>
            {/if}
          </div>
          {#if running}
            <div class="mt-3 text-sm">App <a class="text-[var(--pd-link)]" href={href('/tools/quarkus')}>{p.devMode.url}</a> · Dev UI {p.devMode.devUi} · debug port {p.devMode.debugPort} · PID {p.devMode.pid}</div>
          {/if}
        </Card>
      {/each}
      <TaskLog {taskId} label="Quarkus task" />
    </div>
  {/snippet}
</NavPage>
