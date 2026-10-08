<script lang="ts">
/** Small label chip (PD Label tokens). Tone maps to the label-* token families. */
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@podman-desktop/ui-svelte/icons';

interface Props {
  label: string;
  tone?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'success' | 'warning' | 'error';
  icon?: IconDefinition;
  title?: string;
}

let { label, tone = 'default', icon, title }: Props = $props();

const CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
  primary: 'bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]',
  secondary: 'bg-[var(--pd-label-secondary-bg)] text-[var(--pd-label-secondary-text)]',
  tertiary: 'bg-[var(--pd-label-tertiary-bg)] text-[var(--pd-label-tertiary-text)]',
  quaternary: 'bg-[var(--pd-label-quaternary-bg)] text-[var(--pd-label-quaternary-text)]',
  success: 'bg-[var(--pd-label-bg)] text-[var(--pd-state-success)]',
  warning: 'bg-[var(--pd-label-bg)] text-[var(--pd-state-warning)]',
  error: 'bg-[var(--pd-label-bg)] text-[var(--pd-state-error)]',
};
</script>

<span class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap {CLASSES[tone]}" {title} aria-label={label}>
  {#if icon}<Icon {icon} size="0.8x" />{/if}
  {label}
</span>
