<script lang="ts">
import { page } from '$app/state';

import Section from '#lib/pages/settings/Section.svelte';
</script>

{#key page.params.section}
  <Section section={page.params.section ?? 'resources'} />
{/key}
