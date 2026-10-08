<script lang="ts">
/** In-page tabs with ui-svelte Tab styling (buttons instead of links). */
interface Props {
  tabs: { id: string; label: string; count?: number }[];
  current: string;
  onselect: (id: string) => void;
  label?: string;
}

let { tabs, current, onselect, label = 'Tabs' }: Props = $props();
</script>

<div class="flex flex-row" role="tablist" aria-label={label}>
  {#each tabs as t (t.id)}
    <div
      class="pb-1 border-b-[3px] whitespace-nowrap"
      class:border-[var(--pd-tab-highlight)]={current === t.id}
      class:border-transparent={current !== t.id}
      class:hover:border-[var(--pd-tab-hover)]={current !== t.id}>
      <button
        role="tab"
        aria-selected={current === t.id}
        class="px-4 py-2 text-[var(--pd-tab-text)]"
        class:text-[var(--pd-tab-text-highlight)]={current === t.id}
        onclick={onselect.bind(undefined, t.id)}>
        {t.label}{#if t.count !== undefined}<span class="ml-1.5 text-xs opacity-70">{t.count}</span>{/if}
      </button>
    </div>
  {/each}
</div>
