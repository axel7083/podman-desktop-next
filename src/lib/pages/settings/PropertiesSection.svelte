<script lang="ts">
/** Generic settings section from SettingProperty[] – PD's PreferencesRenderingItem rows. */
import { Dropdown, Input } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';

import type { SettingProperty } from '#lib/ext/types.ts';
import { world } from '#lib/world.svelte.ts';

interface Props {
  properties: SettingProperty[];
  /** Called when a value changes (e.g. theme). */
  onchange?: (id: string, value: string | number | boolean) => void;
}

let { properties, onchange }: Props = $props();

function value(p: SettingProperty): string | number | boolean {
  return world.settings[p.id] ?? p.default;
}

function set(p: SettingProperty, v: string | number | boolean): void {
  world.settings[p.id] = v;
  onchange?.(p.id, v);
}

function onInput(p: SettingProperty, e: Event): void {
  set(p, (e.currentTarget as HTMLInputElement).value);
}
</script>

<div class="bg-[var(--pd-invert-content-card-bg)] rounded-md p-3 divide-y divide-[var(--pd-content-divider)]">
  {#each properties as p (p.id)}
    <div class="flex flex-col px-2 py-3 w-full text-[color:var(--pd-invert-content-card-text)]">
      <div class="flex flex-row justify-between items-center gap-4">
        <div class="flex flex-col {p.type === 'string' && !p.enum ? 'w-full' : ''}">
          <span class="font-semibold">{p.title}</span>
          {#if p.description}<span class="pt-1 text-[color:var(--pd-invert-content-card-text)] opacity-80">{p.description}</span>{/if}
          {#if p.type === 'string' && !p.enum}
            <div class="mt-2 max-w-[600px]"><Input value={String(value(p))} oninput={onInput.bind(undefined, p)} aria-label={p.title} placeholder={String(p.default) || 'Not set'} /></div>
          {/if}
        </div>
        {#if p.type === 'boolean'}
          <Checkbox checked={Boolean(value(p))} onclick={set.bind(undefined, p)} title={p.title} />
        {:else if p.type === 'enum' && p.enum}
          <div class="w-48"><Dropdown value={String(value(p))} options={p.enum.map(o => ({ value: o, label: o }))} onChange={set.bind(undefined, p)} ariaLabel={p.title} /></div>
        {:else if p.type === 'number'}
          <div class="w-32"><Input type="number" value={String(value(p))} oninput={onInput.bind(undefined, p)} aria-label={p.title} /></div>
        {/if}
      </div>
    </div>
  {/each}
</div>
