<script lang="ts">
/**
 * First-visit scenario picker, styled like PD's welcome/WelcomePage.svelte
 * (full-screen card background, centered logo, inset grid of choices, footer
 * button bar).
 */
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import { presetFor, registry } from '#lib/ext/registry.svelte.ts';
import type { ScenarioId } from '#lib/ext/types.ts';
import DesktopIcon from '#lib/images/DesktopIcon.svelte';
import bgImage from '#lib/images/welcome-bg.png';
import { navigate } from '#lib/nav.ts';
import { ALL_SCENARIO_IDS, SCENARIOS } from '#lib/scenarios.ts';
import { ui } from '#lib/ui.svelte.ts';

let selection = $state<ScenarioId[]>([]);
const extCount = $derived(presetFor(selection).length);
const isAll = $derived(selection.length === ALL_SCENARIO_IDS.length);

$effect(() => {
  if (ui.welcomeOpen) selection = [...registry.scenarios];
});

function toggle(id: ScenarioId): void {
  selection = selection.includes(id) ? selection.filter(s => s !== id) : [...selection, id];
}

function everything(): void {
  selection = isAll ? ['community'] : [...ALL_SCENARIO_IDS];
}

function start(): void {
  registry.setScenarios(ALL_SCENARIO_IDS.filter(s => selection.includes(s)));
  ui.welcomeOpen = false;
  navigate('/');
}

function skip(): void {
  ui.welcomeOpen = false;
}
</script>

{#if ui.welcomeOpen}
  <div
    class="flex flex-col flex-auto fixed top-0 left-0 right-0 bottom-0 bg-[var(--pd-content-card-bg)] bg-no-repeat z-50"
    style="background-image: url({bgImage}); background-position: 50% -175%; background-size: 100% 75%"
    role="dialog"
    aria-label="Welcome">
    <div class="flex flex-row flex-none backdrop-blur-sm p-6 mt-10">
      <div class="flex flex-auto text-lg font-bold text-[var(--pd-content-card-header-text)]">Get started with Podman Desktop next</div>
    </div>

    <div class="flex flex-col justify-center content-center flex-auto backdrop-blur-sm p-2 overflow-y-auto">
      <div class="flex justify-center p-2"><DesktopIcon size="80" /></div>
      <div class="flex justify-center text-lg font-bold p-2 text-[var(--pd-content-card-header-text)]">
        Welcome to Podman Desktop v2.0.0-next (interactive mockup)
      </div>
      <div class="flex flex-row justify-center">
        <div class="bg-[var(--pd-content-card-inset-surface)] px-4 pb-4 pt-2 rounded-sm max-w-[860px]">
          <div class="flex justify-center text-sm text-[var(--pd-content-card-text)] pb-2">
            Who are you? Pick one or more scenarios – the matching extensions are enabled, exactly like installing them.
          </div>
          <div aria-label="Scenario list" class="grid grid-cols-4 gap-3">
            {#each SCENARIOS as s (s.id)}
              {@const checked = selection.includes(s.id)}
              <button
                class="relative flex flex-col gap-1.5 text-left rounded-md p-3 border-2 bg-[var(--pd-content-card-bg)] hover:border-[var(--pd-button-primary-hover-bg)] {checked
                  ? 'border-[var(--pd-button-primary-bg)]'
                  : 'border-transparent'}"
                aria-pressed={checked}
                aria-label={s.label}
                onclick={toggle.bind(undefined, s.id)}>
                <div class="flex items-center gap-2">
                  <AppIcon icon={s.icon} size="28px" />
                  <span class="font-semibold text-[var(--pd-content-card-header-text)]">{s.label}</span>
                </div>
                <span class="text-sm text-[var(--pd-content-card-text)]">{s.persona}</span>
                <span class="text-xs text-[var(--pd-content-card-text)] opacity-75 line-clamp-4">{s.description}</span>
                {#if checked}
                  <span class="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-text)] flex items-center justify-center">
                    <Icon icon={faCheck} size="xs" />
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>
      <div class="flex justify-center p-2 text-sm items-center text-[var(--pd-content-card-text)] gap-1">
        Switch any time from the lime <span class="rounded-full px-1.5 bg-[var(--pdn-mockup-bg)] text-[var(--pdn-mockup-text)] font-semibold">Mockup</span> pill, or
        <Button type="link" padding="px-0" onclick={everything}>{isAll ? 'clear the selection' : 'select everything'}</Button> for the scaling stress test.
      </div>
    </div>

    <div class="flex justify-end flex-none bg-[var(--pd-content-bg)] p-8">
      <div class="flex flex-row gap-2">
        <Button type="secondary" onclick={skip}>Skip</Button>
        <Button disabled={selection.length === 0} onclick={start}>
          {isAll ? 'Start with everything' : `Start with ${selection.length} scenario${selection.length === 1 ? '' : 's'}`} · {extCount} extensions
        </Button>
      </div>
    </div>
  </div>
{/if}
