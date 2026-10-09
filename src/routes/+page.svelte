<script lang="ts">
/**
 * v2: the home page opens the chosen navigation (nav-lab P13) directly.
 * The v1 shell stays reachable at /v1/.
 */
import { onMount } from 'svelte';

import { navigate } from '#lib/nav.ts';

onMount(() => {
  navigate('/nav-lab?p=p13&table=modern', true);
});
</script>
