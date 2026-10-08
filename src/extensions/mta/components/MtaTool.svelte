<script lang="ts">
/**
 * Tools › Migration toolkit (P3). Routes on the query string:
 * `?view=analyze[&project=…]` analyze wizard, `?report=<analysis id>` report,
 * otherwise the projects list.
 */
import { page } from '$app/state';

import { findAnalysis } from '../data.ts';
import AnalyzeForm from './AnalyzeForm.svelte';
import MtaProjects from './MtaProjects.svelte';
import MtaReport from './MtaReport.svelte';

const view = $derived(page.url.searchParams.get('view'));
const analysis = $derived(findAnalysis(page.url.searchParams.get('report')));
</script>

{#if view === 'analyze'}
  <AnalyzeForm />
{:else if analysis}
  {#key analysis.id}
    <MtaReport {analysis} />
  {/key}
{:else}
  <MtaProjects />
{/if}
