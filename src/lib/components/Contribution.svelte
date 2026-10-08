<script lang="ts">
/**
 * Wraps every UI element contributed by an extension. When the mockup's
 * "Inspect integrations" toggle is on, it draws a dashed outline and a small
 * "<extension> · <kind> · P#" label so designers can see the scaling mechanics.
 * When off it renders as `display: contents` (no layout impact).
 */
import type { Snippet } from 'svelte';

import { getExtension } from '#lib/ext/registry.svelte.ts';
import type { ExtensionMeta } from '#lib/ext/types.ts';
import { ui } from '#lib/ui.svelte.ts';

interface Props {
  ext: ExtensionMeta;
  /** Contribution point, e.g. "navSection". */
  kind: string;
  /** P# this contribution represents (defaults to the extension's first P#). */
  api?: string;
  /** Extra classes applied when inspecting (layout of the wrapper). */
  class?: string;
  children: Snippet;
}

let { ext, kind, api, class: className = '', children }: Props = $props();

const label = $derived(`${ext.displayName} · ${kind}${api ? ` · ${api}` : ''}`);
const tooltip = $derived(
  `Contributed by ${ext.displayName} (${ext.id})\nContribution point: ${kind}${api ? `\nPlatform API: ${api}` : ''}\nExtension P#: ${(getExtension(ext.id)?.pApis ?? []).join(', ')}`,
);
</script>

{#if ui.inspect}
  <div
    class="relative outline-1 outline-dashed outline-[var(--pdn-inspect-outline)] -outline-offset-1 rounded-sm {className}"
    data-contribution={kind}
    data-extension={ext.id}
    title={tooltip}>
    {@render children()}
    <span
      class="pointer-events-none absolute -top-[7px] right-1 z-30 max-w-[90%] truncate rounded-sm bg-[var(--pdn-mockup-bg)] px-1 text-[9px] leading-[12px] font-medium text-[var(--pdn-mockup-text)]"
      >{label}</span>
  </div>
{:else}
  <div class="contents" data-contribution={kind} data-extension={ext.id}>
    {@render children()}
  </div>
{/if}
