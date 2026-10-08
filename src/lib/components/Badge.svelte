<script lang="ts">
// Adapted from podman-desktop packages/renderer/src/lib/ui/Badge.svelte (Apache-2.0)
import type { HTMLAttributes } from 'svelte/elements';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  color?: string;
  label?: string;
}

let { color = 'bg-[var(--pd-badge-gray)]', label = '', class: className = '', ...restProps }: Props = $props();
</script>

<div
  class="text-[var(--pd-badge-text)] text-xs me-2 px-1 py-0.5 rounded-sm select-none {color} {className}"
  aria-label="badge-{label}"
  {...restProps}>
  {label}
</div>
