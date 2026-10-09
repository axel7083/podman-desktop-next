<script lang="ts" module>
import type { IconRef } from '#lib/ext/types.ts';

export interface Opt {
  id: string;
  label: string;
  sub?: string;
  icon?: IconRef;
  disabled?: boolean;
}
</script>

<script lang="ts">
/**
 * Option cards of a flow modal (radio, or checkboxes with `multi`): icon,
 * label, muted sub; a disabled option shows its reason. 8px radius, accent
 * border only on the selected one (rule C9).
 */
import LabIcon from '../../ui/LabIcon.svelte';

interface Props {
  options: Opt[];
  value: string[];
  multi?: boolean;
  cols?: number;
  testid?: string;
  onchange: (v: string[]) => void;
}

let { options, value, multi = false, cols = 2, testid, onchange }: Props = $props();

function pick(o: Opt): void {
  if (o.disabled) return;
  if (!multi) onchange([o.id]);
  else onchange(value.includes(o.id) ? value.filter(x => x !== o.id) : [...value, o.id]);
}
</script>

<div role={multi ? 'group' : 'radiogroup'} data-testid={testid} class="grid gap-2" style:grid-template-columns="repeat({cols}, minmax(0, 1fr))">
  {#each options as o (o.id)}
    {@const on = value.includes(o.id)}
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={on}
      aria-disabled={o.disabled}
      data-opt={o.id}
      class="flex items-start gap-2 p-2.5 rounded-lg border text-left {on ? 'border-[var(--pd-button-primary-bg)] bg-[color-mix(in_srgb,var(--pd-button-primary-bg)_8%,transparent)]' : 'border-[var(--pd-content-divider)] hover:bg-[var(--pd-action-button-details-bg)]'} {o.disabled ? 'opacity-60' : ''}"
      onclick={(): void => pick(o)}>
      {#if o.icon}<span class="pt-0.5"><LabIcon icon={o.icon} size={16} /></span>{/if}
      <span class="flex-1 min-w-0">
        <span class="block text-[12px] font-medium text-[var(--pd-content-header)]">{o.label}</span>
        {#if o.sub}<span class="block text-[12px] text-[var(--pd-table-body-text)]">{o.sub}</span>{/if}
      </span>
    </button>
  {/each}
</div>
