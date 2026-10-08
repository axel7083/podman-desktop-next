<script lang="ts">
/** Read-only value with a copy button (copies to the clipboard and toasts). */
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import { toast } from '#lib/world.svelte.ts';

interface Props {
  label?: string;
  value: string;
  toastTitle?: string;
}

let { label, value, toastTitle }: Props = $props();

function copy(): void {
  navigator.clipboard?.writeText(value).catch(() => undefined);
  toast({ type: 'success', title: toastTitle ?? `Copied ${label ?? 'value'} to the clipboard` });
}
</script>

<div class="flex flex-col gap-1">
  {#if label}<span class="text-sm text-[var(--pd-content-card-text)]">{label}</span>{/if}
  <div class="flex items-center gap-2">
    <code class="grow min-w-0 truncate rounded-md px-2 py-1.5 text-sm font-mono bg-[var(--pd-content-card-inset-bg)] text-[var(--pd-content-card-text)]" title={value}>{value}</code>
    <Button type="secondary" icon={faCopy} onclick={copy} aria-label="Copy {label ?? 'value'}" title="Copy">Copy</Button>
  </div>
</div>
