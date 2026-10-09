<script lang="ts">
/**
 * v3: the home page IS the P13 navigation (no redirect, no v1 shell). The v1
 * shell routes (`#/c/…`, `#/settings`…) stay reachable; v1 itself is at /v1/.
 */
import MockupApp from '#lib/nav-lab/MockupApp.svelte';
</script>

<MockupApp />
