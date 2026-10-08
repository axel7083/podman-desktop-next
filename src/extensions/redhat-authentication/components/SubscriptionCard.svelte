<script lang="ts">
/** Dashboard card (P17): subscription usage of the signed-in organization. */
import AppIcon from '#lib/components/AppIcon.svelte';

import { SESSION, SUBSCRIPTIONS } from '../data.ts';
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3">
    <AppIcon icon="icons/redhat.redhat-authentication.png" size="32px" />
    <div class="flex flex-col">
      <span class="text-lg text-[var(--pd-content-card-header-text)]">Red Hat subscriptions</span>
      <span class="text-sm text-[var(--pd-content-card-title)]">{SESSION.account.label} · org {SESSION.organizationId}</span>
    </div>
  </div>
  {#each SUBSCRIPTIONS as s (s.sku)}
    <div class="flex flex-col gap-1 text-sm text-[var(--pd-content-card-text)]">
      <div class="flex justify-between gap-2"><span class="truncate" title={s.name}>{s.name}</span><span class="shrink-0 tabular-nums">{s.consumed} of {s.quantity}</span></div>
      <div class="h-1.5 rounded-full bg-[var(--pd-content-card-inset-bg)] overflow-hidden" role="progressbar" aria-label="{s.name} usage" aria-valuenow={s.consumed} aria-valuemax={s.quantity}>
        <div class="h-full bg-[var(--pd-status-running)]" style:width="{Math.round((s.consumed / s.quantity) * 100)}%"></div>
      </div>
      <span class="text-xs text-[var(--pd-content-card-title)]">{s.status} · renews {s.endDate}</span>
    </div>
  {/each}
</div>
