<script lang="ts">
// Copied from podman-desktop packages/renderer/src/lib/ui/ProviderInfoCircle.svelte (Apache-2.0)
const providerColors: Record<string, string> = {
  podman: 'bg-(--pd-provider-podman)',
  docker: 'bg-(--pd-provider-docker)',
  kubernetes: 'bg-(--pd-provider-kubernetes)',
  unknown: 'bg-(--pd-provider-unknown)',
};

interface Props {
  type?: string;
}

let { type }: Props = $props();
let color = $derived(providerColors[type ?? 'unknown'] ?? providerColors.unknown);
</script>

<div aria-label="Provider info circle" class="min-w-2 min-h-2 {color} rounded-full"></div>
