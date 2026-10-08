<script lang="ts">
/**
 * Mockup chrome: a single lime pill holding Scenario, Theme, Inspect
 * integrations, Speed and Reset. Hidden with `?chrome=off`.
 */
import { faChevronDown, faFlask } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import Popover from '#lib/components/Popover.svelte';
import SlideToggle from '#lib/components/SlideToggle.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ScenarioId } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { ALL_SCENARIO_IDS, SCENARIOS, scenarioLabel } from '#lib/scenarios.ts';
import { ui } from '#lib/ui.svelte.ts';

let open = $state(false);
let anchor = $state<HTMLButtonElement>();

const isEverything = $derived(registry.scenarios.length === ALL_SCENARIO_IDS.length);

function toggleOpen(): void {
  open = !open;
}

function close(): void {
  open = false;
}

function toggleScenario(id: ScenarioId, checked: boolean): void {
  const next = checked ? [...registry.scenarios, id] : registry.scenarios.filter(s => s !== id);
  registry.setScenarios(ALL_SCENARIO_IDS.filter(s => next.includes(s)));
}

function setEverything(checked: boolean): void {
  registry.setScenarios(checked ? [...ALL_SCENARIO_IDS] : ['community']);
}

function setDark(): void {
  ui.setTheme('dark');
}

function setLight(): void {
  ui.setTheme('light');
}

function setSpeed1(): void {
  ui.setSpeed(1);
}

function setSpeed5(): void {
  ui.setSpeed(5);
}

function onInspect(checked: boolean): void {
  ui.setInspect(checked);
}

function resetExtensions(): void {
  registry.resetExtensions();
}

function resetWorld(): void {
  registry.resetWorld();
  navigate('/');
}

function showWelcome(): void {
  open = false;
  ui.welcomeOpen = true;
}

const segment =
  'px-2 py-0.5 rounded-sm text-sm border border-[var(--pd-content-divider)] text-[var(--pd-content-text)]';
const segmentOn = 'bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-text)] border-transparent';
</script>

<button
  bind:this={anchor}
  class="flex items-center gap-1.5 h-[22px] px-2.5 rounded-full bg-[var(--pdn-mockup-bg)] text-[var(--pdn-mockup-text)] text-sm font-semibold shadow-sm hover:brightness-95 max-w-[260px]"
  aria-label="Mockup controls"
  aria-expanded={open}
  title="Mockup controls (not part of the product)"
  onclick={toggleOpen}>
  <Icon icon={faFlask} size="xs" />
  <span class="truncate">Mockup · {scenarioLabel(registry.scenarios)}</span>
  {#if ui.inspect}<span class="rounded-full bg-[var(--pdn-mockup-text)] text-[var(--pdn-mockup-bg)] px-1 text-[9px]">INSPECT</span>{/if}
  <Icon icon={faChevronDown} size="xs" />
</button>

<Popover {open} {anchor} placement="bottom-end" surface="modal" onclose={close} class="w-[340px] p-4 text-[var(--pd-modal-text)] space-y-4">
  <section aria-label="Scenario">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-base font-semibold text-[var(--pd-modal-header-text)]">Scenario</h2>
      <Checkbox checked={isEverything} onclick={setEverything} title="Everything (scaling stress test)">Everything</Checkbox>
    </div>
    <ul class="space-y-1.5">
      {#each SCENARIOS as scenario (scenario.id)}
        <li class="flex items-center gap-2">
          <Checkbox
            checked={registry.scenarios.includes(scenario.id)}
            onclick={toggleScenario.bind(undefined, scenario.id)}
            title={scenario.description}>
            <span class="flex items-center gap-2">
              <AppIcon icon={scenario.icon} size="16px" />
              <span>{scenario.label}</span>
              <span class="text-xs text-[var(--pd-content-sub-header)] truncate">{scenario.persona}</span>
            </span>
          </Checkbox>
        </li>
      {/each}
    </ul>
    <p class="mt-2 text-xs text-[var(--pd-content-sub-header)]">
      {registry.extensions.length} of {registry.installed.length} installed extensions enabled · combine scenarios for a union.
    </p>
  </section>

  <section aria-label="Display" class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
    <span class="font-semibold">Theme</span>
    <div class="flex gap-1">
      <button class="{segment} {ui.theme === 'dark' ? segmentOn : ''}" onclick={setDark}>Dark</button>
      <button class="{segment} {ui.theme === 'light' ? segmentOn : ''}" onclick={setLight}>Light</button>
    </div>
    <span class="font-semibold">Speed</span>
    <div class="flex gap-1">
      <button class="{segment} {ui.speed === 1 ? segmentOn : ''}" onclick={setSpeed1}>1×</button>
      <button class="{segment} {ui.speed === 5 ? segmentOn : ''}" onclick={setSpeed5}>5×</button>
    </div>
    <span class="font-semibold">Inspect</span>
    <SlideToggle id="inspect-toggle" checked={ui.inspect} onchange={onInspect} aria-label="Inspect integrations">
      Inspect integrations
    </SlideToggle>
  </section>

  <section aria-label="Reset" class="flex flex-wrap gap-2 pt-1 border-t border-[var(--pd-content-divider)] pt-3">
    <Button type="secondary" onclick={resetExtensions} title="Restore the scenario's extension preset">Reset extensions</Button>
    <Button type="secondary" onclick={resetWorld} title="Wipe and re-seed the simulated world">Reset world</Button>
    <Button type="link" onclick={showWelcome}>Show welcome</Button>
  </section>
</Popover>
