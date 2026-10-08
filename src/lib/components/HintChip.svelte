<script lang="ts">
/**
 * Connection hint chip ("current", "context", "ssh"…): one look and one casing
 * rule everywhere (primary nav, dashboard, status-bar popover). The hint is
 * rendered in its authored case, never CSS-uppercased.
 */
interface Props {
  hint: string;
  tooltip?: string;
  class?: string;
}

let { hint, tooltip, class: className = '' }: Props = $props();
</script>

<span
  class="inline-block shrink-0 whitespace-nowrap rounded-sm px-1 text-[10px] leading-[14px] font-medium bg-[var(--pd-nav-hint-bg)] text-[var(--pd-nav-hint-text)] {className}"
  title={tooltip ?? hint}>{hint}</span>
