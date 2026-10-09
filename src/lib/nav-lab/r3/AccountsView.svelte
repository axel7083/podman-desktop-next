<script lang="ts">
/** P13 Accounts tab: shared header, empty state, then authentication extensions (ExtCards). */
import { faUser } from '@fortawesome/free-solid-svg-icons';

import LabIcon from '../ui/LabIcon.svelte';
import ExtCards from './ExtCards.svelte';
import Head from './Head.svelte';
</script>

<div data-testid="accounts-view" class="flex flex-col h-full min-h-0">
  <Head icon={faUser} title="Accounts" />
  <div class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
    <div class="flex flex-col items-center py-8 text-center">
      <span class="text-[var(--pd-details-empty-icon)]"><LabIcon icon={faUser} size={48} /></span>
      <div class="pt-4 text-[16px] font-semibold text-[var(--pd-details-empty-header)]">No accounts</div>
      <div class="pt-1 text-[13px] text-[var(--pd-details-empty-sub-header)]">Install an authentication extension to sign in to Red Hat, GitHub or a cloud provider.</div>
    </div>
    <ExtCards ids={['rhel', 'aap', 'sandbox']} title="Authentication extensions" />
  </div>
</div>
