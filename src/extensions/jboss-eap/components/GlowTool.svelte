<script lang="ts">
/**
 * Tools › JBoss EAP: "Containerize WAR" wizard. WildFly Glow scans the WAR
 * for the Galleon layers it needs, eap:image provisions a trimmed EAP 8.1
 * server image, then the image runs as a container on podman-machine-default.
 */
import { faArrowUpRightFromSquare, faCircleCheck, faFolderOpen, faHammer, faMagnifyingGlass, faPlay } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, FormPage, Input } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';
import { tick } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { href, navigate, appUrl } from '#lib/nav.ts';
import { humanSize, world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import { ENGINE } from '../../_appdev/services.ts';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import {
  ADD_ONS,
  appContainer,
  buildImage,
  builtImage,
  CONTEXTS,
  DEFAULT_WAR,
  FULL_IMAGE_SIZE,
  type GlowContext,
  glow,
  IMAGE_SIZE,
  openConsole,
  runServer,
  scan,
  SERVER_VERSIONS,
  type ServerVersion,
} from '../data.ts';

// start from the last scan (if any) so returning to the page keeps its settings
const previous = glow().scan;
let war = $state(appUrl().searchParams.get('war') ?? previous?.war ?? DEFAULT_WAR);
let serverVersion = $state<ServerVersion>(previous?.serverVersion ?? 'eap-8.1');
let context = $state<GlowContext>(previous?.context ?? 'cloud');
let addOns = $state<string[]>(previous ? [...previous.enabledAddOns] : []);
let scanTaskId = $state<string>();
let buildTaskId = $state<string>();
let runTaskId = $state<string>();

const result = $derived(glow().scan);
const image = $derived(builtImage());
const container = $derived(appContainer());
const scanning = $derived(isRunning(scanTaskId));
const building = $derived(isRunning(buildTaskId));
const starting = $derived(isRunning(runTaskId));
const stale = $derived(
  !!result && (result.war !== war || result.serverVersion !== serverVersion || result.context !== context || [...result.enabledAddOns].sort().join() !== [...addOns].sort().join()),
);
const canBuild = $derived(!!result && result.errors.length === 0 && !stale && !building && !scanning);
const saved = $derived(FULL_IMAGE_SIZE - IMAGE_SIZE);

let resultCard = $state<HTMLElement>();
let builtShown = false;

// a fresh build: bring its result (at the top of the page) into view
$effect(() => {
  if (image && buildTaskId && !builtShown) {
    builtShown = true;
    tick().then(() => resultCard?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
});

function openImages(): void {
  navigate(`/c/${ENGINE}/images`);
}

function isRunning(id: string | undefined): boolean {
  return !!id && world.tasks.find(t => t.id === id)?.status === 'in-progress';
}

function onWar(e: Event): void {
  war = (e.currentTarget as HTMLInputElement).value;
}

function browse(): void {
  war = DEFAULT_WAR;
}

function onVersion(v: string): void {
  serverVersion = v === 'wildfly-39' ? 'wildfly-39' : 'eap-8.1';
}

function onContext(v: string): void {
  context = v === 'bare-metal' ? 'bare-metal' : 'cloud';
}

function toggleAddOn(id: string, checked: boolean): void {
  addOns = checked ? [...addOns.filter(a => a !== id), id] : addOns.filter(a => a !== id);
}

function doScan(): void {
  scanTaskId = scan(war.trim(), serverVersion, context, addOns);
}

function enableAddOn(id: string): void {
  toggleAddOn(id, true);
  doScan();
}

function doBuild(): void {
  if (result) buildTaskId = buildImage(result);
}

function doRun(): void {
  runTaskId = runServer();
}

function openContainer(): void {
  if (container) navigate(`/c/${ENGINE}/containers/${container.id}/summary`);
}

function close(): void {
  navigate('/');
}

function versionLabel(v: ServerVersion): string {
  return SERVER_VERSIONS.find(s => s.value === v)?.label ?? v;
}
</script>

<FormPage title="Containerize WAR" breadcrumbLeftPart="JBoss EAP" breadcrumbRightPart="Containerize WAR" inProgress={scanning || building || starting} onclose={close} onbreadcrumbClick={close}>
  {#snippet icon()}<AppIcon icon="icons/redhat.jboss-eap.png" size="40px" />{/snippet}
  {#snippet content()}
    <div class="px-5 pb-5 min-w-full max-w-[960px] space-y-4 text-[var(--pd-content-card-text)]">
      {#if image && buildTaskId && !building}
        <div bind:this={resultCard} class="scroll-mt-4 rounded-lg p-4 border border-[var(--pd-state-success)] bg-[var(--pd-content-card-bg)] flex items-center gap-4" role="region" aria-label="Image built">
          <span class="text-[var(--pd-state-success)]"><Icon icon={faCircleCheck} size="1.5x" /></span>
          <div class="grow min-w-0">
            <div class="font-semibold text-base text-[var(--pd-content-card-header-text)]">Image built: <span class="font-mono">{image.name}:{image.tag}</span></div>
            <div class="text-sm tabular-nums">{humanSize(image.size)} · {humanSize(saved)} smaller than the full EAP 8.1 server image ({humanSize(FULL_IMAGE_SIZE)}) · {(result?.layers.length ?? 0) + 1} Galleon layers</div>
          </div>
          <Button type="secondary" onclick={openImages}>Open image</Button>
          <Button icon={faPlay} onclick={doRun} inProgress={starting} disabled={starting}>{container ? 'Run again' : 'Run'}</Button>
        </div>
      {/if}
      <div class="bg-[var(--pd-content-card-bg)] py-6 px-8 rounded-lg space-y-5" role="form" aria-label="Containerize WAR">
        <p>WildFly Glow scans your deployment and provisions only the Galleon layers it needs, then builds a trimmed JBoss EAP image with the eap-maven-plugin.</p>

        <div class="flex flex-col gap-1.5">
          <label for="eap-war" class="block text-base font-semibold text-[var(--pd-content-card-header-text)]">Deployment (WAR)</label>
          <div class="flex gap-2">
            <Input id="eap-war" value={war} oninput={onWar} disabled={scanning} class="grow" />
            <Button type="secondary" icon={faFolderOpen} onclick={browse} disabled={scanning}>Browse…</Button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="eap-version" class="block text-base font-semibold text-[var(--pd-content-card-header-text)]">Server version</label>
            <Dropdown id="eap-version" value={serverVersion} options={SERVER_VERSIONS} onChange={onVersion} disabled={scanning} ariaLabel="Server version" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eap-context" class="block text-base font-semibold text-[var(--pd-content-card-header-text)]">Execution context</label>
            <Dropdown id="eap-context" value={context} options={CONTEXTS} onChange={onContext} disabled={scanning} ariaLabel="Execution context" />
          </div>
        </div>

        <fieldset class="flex flex-col gap-1.5">
          <legend class="block text-base font-semibold text-[var(--pd-content-card-header-text)] mb-1.5">Add-ons</legend>
          {#each ADD_ONS as a (a.id)}
            <Checkbox checked={addOns.includes(a.id)} onclick={toggleAddOn.bind(undefined, a.id)} disabled={scanning} title={a.description}>
              <span><code>{a.id}</code> · {a.description}</span>
            </Checkbox>
          {/each}
        </fieldset>

        <TaskLog taskId={scanTaskId} label="Scan progress" />

        <div class="flex justify-end gap-2">
          <Button icon={faMagnifyingGlass} onclick={doScan} inProgress={scanning} disabled={scanning || !war.trim()}>Scan</Button>
        </div>
      </div>

      {#if result}
        <Card title="Scan result" subtitle="{result.command} · {versionLabel(result.serverVersion)} · context {result.context}">
          {#snippet actions()}
            {#if stale}<Pill label="Settings changed, scan again" tone="warning" />{/if}
          {/snippet}
          <div class="space-y-4">
            <div aria-label="Feature packs">
              <h3 class="text-sm font-semibold text-[var(--pd-content-card-header-text)] mb-1">Feature packs</h3>
              <ul class="font-mono text-sm space-y-0.5">
                {#each result.featurePacks as f (f)}<li>{f}</li>{/each}
              </ul>
            </div>
            <div aria-label="Galleon layers">
              <h3 class="text-sm font-semibold text-[var(--pd-content-card-header-text)] mb-1.5">Galleon layers ({result.layers.length + 1})</h3>
              <div class="flex flex-wrap gap-1.5">
                <Pill label="{result.baseLayer} (base)" tone="info" />
                {#each result.layers as l (l)}<Pill label={l} />{/each}
              </div>
            </div>
            {#if result.errors.length}
              <div class="space-y-2" aria-label="Identified errors">
                <h3 class="text-sm font-semibold text-[var(--pd-state-error)]">Identified errors ({result.errors.length})</h3>
                {#each result.errors as e (e.message)}
                  <div class="rounded-md border border-[var(--pd-state-error)] px-3 py-2 flex items-center gap-3">
                    <div class="grow">
                      <div class="font-mono text-sm text-[var(--pd-state-error)]">{e.message}</div>
                      <div class="text-sm">{e.fix}</div>
                    </div>
                    {#if e.addOn}
                      <Button type="secondary" onclick={enableAddOn.bind(undefined, e.addOn)} disabled={scanning}>Enable {e.addOn}</Button>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
            {#if result.warnings.length}
              <div class="space-y-1" aria-label="Warnings">
                <h3 class="text-sm font-semibold text-[var(--pd-state-warning)]">Warnings</h3>
                {#each result.warnings as w (w)}<p class="text-sm">{w}</p>{/each}
              </div>
            {/if}
            <p class="text-sm opacity-80">Enabled add-ons: {result.enabledAddOns.join(', ') || 'none'} · suggested: {result.suggestedAddOns.join(', ') || 'none'}</p>
          </div>
        </Card>

        <Card title="Build image" subtitle="eap:image provisions the server in target/server and builds localhost/inventory-service:eap81 with Podman.">
          {#snippet actions()}
            <Button icon={faHammer} onclick={doBuild} inProgress={building} disabled={!canBuild}>Build image</Button>
          {/snippet}
          {#if result.errors.length}
            <p class="text-sm">Fix the identified errors before building.</p>
          {/if}
          <TaskLog taskId={buildTaskId} label="Build progress" />
          {#if image}
            <div class="flex items-center gap-3 mt-2" aria-label="Built image">
              <a class="font-mono text-[var(--pd-link)] hover:underline" href={href(`/c/${ENGINE}/images`)}>{image.name}:{image.tag}</a>
              <span class="tabular-nums">{humanSize(image.size)}</span>
              <Pill label="{humanSize(saved)} smaller than the full EAP 8.1 image ({humanSize(FULL_IMAGE_SIZE)})" tone="success" />
            </div>
          {/if}
        </Card>

        {#if image}
          <Card title="Run" subtitle="Runs the image on {ENGINE} with ports 8080 (HTTP) and 9990 (management).">
            {#snippet actions()}
              <Button icon={faPlay} onclick={doRun} inProgress={starting} disabled={starting}>{container ? 'Run again' : 'Run'}</Button>
            {/snippet}
            <TaskLog taskId={runTaskId} label="Run progress" />
            {#if container}
              <div class="flex items-center gap-3 mt-2" aria-label="Running server">
                <Pill label={container.state} tone={container.state === 'RUNNING' ? 'running' : 'neutral'} />
                <Button type="link" onclick={openContainer}>Open container {container.name}</Button>
                <Button type="link" icon={faArrowUpRightFromSquare} onclick={openConsole}>Open management console</Button>
              </div>
            {/if}
          </Card>
        {/if}
      {/if}
    </div>
  {/snippet}
</FormPage>
