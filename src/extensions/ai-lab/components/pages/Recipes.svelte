<script lang="ts">
/** Recipe Catalog (AI Lab Recipes.svelte): intro, filters, cards per category, Start dialog. */
import { faCircleCheck, faCodeBranch, faDownload } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import Dialog from '#lib/components/Dialog.svelte';
import { toast } from '#lib/world.svelte.ts';

import { CATALOG, CATEGORIES, RECIPES } from '../../data.ts';
import { ai, type Recipe, startRecipe } from '../../shared.ts';
import Chip from '../ui/Chip.svelte';

let language = $state('all');
let framework = $state('all');
let starting = $state<Recipe | undefined>();
let chosenModel = $state('');

const languages = [...new Set(RECIPES.flatMap(r => r.languages))].sort();
const frameworks = [...new Set(RECIPES.flatMap(r => r.frameworks))].sort();
const filtered = $derived(RECIPES.filter(r => (language === 'all' || r.languages.includes(language)) && (framework === 'all' || r.frameworks.includes(framework))));
const byCategory = $derived(
  Object.entries(CATEGORIES)
    .map(([id, label]) => ({ id, label, recipes: filtered.filter(r => r.categories.includes(id)) }))
    .filter(c => c.recipes.length),
);
const runningIds = $derived(ai().apps.map(a => a.recipeId));
const modelOptions = $derived(
  CATALOG.filter(m => m.source === 'ai-lab' && (starting?.backend === 'none' || m.backend === starting?.backend)).map(m => ({
    value: m.id,
    label: `${m.name}${starting?.recommended.includes(m.id) ? ' (recommended)' : ''}${ai().downloaded.includes(m.id) ? '' : ' · will be downloaded'}`,
  })),
);

function open(r: Recipe): void {
  starting = r;
  chosenModel = r.recommended[0] ?? modelOptions[0]?.value ?? '';
}

function close(): void {
  starting = undefined;
}

function start(): void {
  if (!starting) return;
  startRecipe(starting.id, chosenModel);
  starting = undefined;
}

function browse(): void {
  toast({ type: 'info', title: 'Opening https://github.com/containers/ai-lab-recipes' });
}
</script>

<div class="flex flex-col h-full overflow-auto px-5 pt-4 pb-6">
  <h1 class="text-2xl font-bold text-[var(--pd-content-header)]">Recipe Catalog</h1>
  <p class="mt-2 max-w-4xl text-sm text-[var(--pd-content-text)]">
    Recipes help you explore and get started with a number of core AI use cases like chatbots, code generators, text summarizers, agents, and more. Each recipe comes with
    detailed explanations and runnable source code compatible with various large language models (LLMs).
  </p>
  <div class="mt-3"><Button icon={faCodeBranch} onclick={browse}>Browse Recipe Repository</Button></div>
  <div class="mt-4 grid grid-cols-2 gap-4 max-w-2xl">
    <label class="text-sm text-[var(--pd-content-text)]">Languages
      <Dropdown class="mt-1" ariaLabel="Languages" bind:value={language} options={[{ value: 'all', label: 'all' }, ...languages.map(l => ({ value: l, label: l }))]} />
    </label>
    <label class="text-sm text-[var(--pd-content-text)]">Frameworks
      <Dropdown class="mt-1" ariaLabel="Frameworks" bind:value={framework} options={[{ value: 'all', label: 'all' }, ...frameworks.map(l => ({ value: l, label: l }))]} />
    </label>
  </div>
  {#each byCategory as cat (cat.id)}
    <h2 class="mt-6 mb-3 text-base text-[var(--pd-content-header)]">{cat.label}</h2>
    <div class="grid grid-cols-3 gap-4">
      {#each cat.recipes as r (r.id)}
        <article class="flex flex-col rounded-md bg-[var(--pd-content-card-bg)] p-4 min-h-44" aria-label={r.name}>
          <div class="flex items-start gap-2">
            <div class="grow">
              <h3 class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">{r.name}</h3>
              <p class="mt-1 text-xs text-[var(--pd-content-card-text)] line-clamp-3">{r.description}</p>
            </div>
            {#if runningIds.includes(r.id)}
              <span title="Running" class="text-[var(--pd-status-running)]"><Icon icon={faCircleCheck} size="1.4x" /></span>
            {:else}
              <Button type="secondary" icon={faDownload} aria-label="Start {r.name}" title="Start recipe" onclick={open.bind(undefined, r)} />
            {/if}
          </div>
          <div class="mt-auto pt-3 flex items-center gap-1 flex-wrap">
            <Chip label={CATEGORIES[r.categories[0]]} tone="primary" />
            {#each r.languages as l (l)}<Chip label={l} />{/each}
            {#each r.frameworks.slice(0, 2) as f (f)}<Chip label={f} />{/each}
            {#if r.frameworks.length > 2}<span class="text-xs text-[var(--pd-link)]">+{r.frameworks.length - 2} more</span>{/if}
            <span class="grow"></span>
            <span class="text-xs text-[var(--pd-content-card-text)] opacity-70">v1.8.0</span>
          </div>
        </article>
      {/each}
    </div>
  {/each}
</div>

{#if starting}
  <Dialog title="Start {starting.name}" onclose={close}>
    {#snippet content()}
      <p class="text-sm mb-3">The recipe repository <span class="font-mono">containers/ai-lab-recipes@v1.8.0</span> will be cloned, the <span class="font-mono">{starting?.id}</span> image built and started in a pod with a model service.</p>
      <label class="text-sm">Model
        <Dropdown class="mt-1" ariaLabel="Model" bind:value={chosenModel} options={modelOptions} />
      </label>
    {/snippet}
    {#snippet buttons()}
      <Button type="link" onclick={close}>Cancel</Button>
      <Button onclick={start}>Start {starting?.name}</Button>
    {/snippet}
  </Dialog>
{/if}
