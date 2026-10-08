<script lang="ts">
/** Dashboard-card header (extension icon + product name), so cards say whose data they show. */
import AppIcon from '#lib/components/AppIcon.svelte';

interface Props {
  icon: string;
  title: string;
}

let { icon, title }: Props = $props();
</script>

<div class="flex items-center gap-2 mb-2">
  <AppIcon {icon} size="16px" />
  <h3 class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">{title}</h3>
</div>
