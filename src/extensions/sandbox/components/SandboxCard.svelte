<script lang="ts">
/** Dashboard card (P17): sandbox expiry at a glance. */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { navigate } from '#lib/nav.ts';

import { CONTEXT, daysLeft, QUOTA, SIGNUP } from '../data.ts';

function open(): void {
  navigate('/c/dev-sandbox?tab=sandbox');
}
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3">
    <AppIcon icon="icons/redhat.redhat-sandbox.png" size="32px" />
    <div class="flex flex-col grow">
      <span class="text-lg text-[var(--pd-content-card-header-text)]">Developer Sandbox</span>
      <span class="text-sm text-[var(--pd-content-card-title)]">{daysLeft()} days left · expires {SIGNUP.endDate.slice(0, 10)}</span>
    </div>
    <Button type="secondary" onclick={open}>Open</Button>
  </div>
  <div class="text-sm text-[var(--pd-content-card-text)]">Namespace {CONTEXT.namespace} · {QUOTA[1].used} of {QUOTA[1].hard} GiB memory used</div>
</div>
