<script lang="ts">
/**
 * P13 Accounts tab. Signed out: empty state + "Sign in with Red Hat" (Red
 * Hat Authentication) and other authentication extensions. Signed in: the
 * Red Hat account (org, account number, sign out), subscription status,
 * activation keys (ModernTable) with the connections using them, and what
 * the account configured (registry.redhat.io, Developer Sandbox).
 */
import { faRightFromBracket, faUser } from '@fortawesome/free-solid-svg-icons';

import { conn, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import LabIcon from '../ui/LabIcon.svelte';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import type { LabRow } from './cells/types.ts';
import ExtCards from './ExtCards.svelte';
import { ACTIVATION_KEYS, flows, openModal, signOut, SUBSCRIPTIONS } from './flows.svelte.ts';
import Head from './Head.svelte';
import KV from './KV.svelte';
import ModernTable from './ModernTable.svelte';
import ResourcesCard from './ResourcesCard.svelte';
import Section from './Section.svelte';

interface Props {
  onopen?: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { onopen }: Props = $props();
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');

const keys = $derived<LabRow[]>(
  ACTIVATION_KEYS.map(k => {
    const used = [...k.usedBy, ...Object.entries(flows.registered).filter(([, v]) => v === k.name).map(([c]) => c)].filter((x, i, a) => a.indexOf(x) === i);
    return { name: k.name, status: 'RUNNING', icon: faUser, title: k.name, sub: [], cols: { role: k.role, usage: k.usage, sla: k.sla, used: used.join(', ') || '—' }, buttons: [] };
  }),
);

const subs = $derived<LabRow[]>(SUBSCRIPTIONS.map(([n, sku, used, end, st]) => ({ name: sku, status: st === 'Active' ? 'RUNNING' : 'DEGRADED', icon: faUser, title: n, sub: [], cols: { sku, used, end, st }, buttons: [] })));

/** Connections and settings the account is used by (reference chips, rule F25). */
const usedBy = $derived<[string, () => void][]>([
  ['registry.redhat.io', (): void => onopen?.({ kind: 'settings' }, {})],
  ...[...new Set([...ACTIVATION_KEYS.flatMap(k => k.usedBy), ...Object.keys(flows.registered), 'sandbox'])]
    .filter(id => conn(id))
    .map((id): [string, () => void] => [conn(id)?.name ?? id, (): void => onopen?.({ kind: 'connection', connId: id }, {})]),
]);
</script>

{#snippet actions()}
  {#if flows.account}<Btn icon={faRightFromBracket} testid="rh-signout" onclick={signOut}>Sign out</Btn>{/if}
{/snippet}

<div data-testid="accounts-view" class="flex flex-col h-full min-h-0">
  <Head icon={faUser} title="Accounts" sub={flows.account ? `Red Hat · ${flows.account.email}` : undefined} {actions} />
  <div class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
    {#if flows.account}
      <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
        <Card title="Red Hat account" testid="rh-account">
          <div class="flex items-center gap-3 pb-3">
            <span class="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold text-white bg-[#ee0000]">AD</span>
            <div>
              <div class="text-[14px] font-semibold text-[var(--pd-content-header)]">{flows.account.name}</div>
              <div class="text-[12px] text-[var(--pd-table-body-text)]">{flows.account.email}</div>
            </div>
          </div>
          <KV rows={[{ k: 'Organization ID', v: flows.account.org }, { k: 'Account number', v: flows.account.account }, { k: 'Session', v: 'sso.redhat.com · expires in 9 h' }, { k: 'Scopes', v: 'api.console, api.rhsm, api.iam.service_accounts' }]} />
        </Card>
        <Card title="Subscription status" testid="rh-subscription">
          <div class="flex items-center gap-2 pb-2 text-[13px] text-[var(--pd-content-header)]"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-running)]"></span>Active · Simple Content Access enabled</div>
          <KV rows={[{ k: 'Main subscription', v: SUBSCRIPTIONS[0][0] }, { k: 'Systems', v: `${SUBSCRIPTIONS[0][2]} used` }, { k: 'Renews', v: SUBSCRIPTIONS[0][3] }]} />
          <div class="flex flex-wrap gap-1.5 pt-3" data-testid="rh-used-by">
            <span class="text-[12px] text-[var(--pd-table-body-text)] pr-1">Used by</span>
            {#each usedBy as [label, go] (label)}
              <button type="button" class="h-6 px-2 rounded-full border border-[var(--pd-content-divider)] text-[12px] text-[var(--pd-table-body-text)] hover:text-[var(--pd-content-header)] hover:bg-[var(--pd-action-button-details-bg)]" onclick={go}>{label}</button>
            {/each}
          </div>
        </Card>
      </div>
      <Section title="Activation keys" count={keys.length} testid="rh-keys">
        <ModernTable rows={keys} {variant} readonly initialSort="" cols={[['Role', 'role', 'minmax(12rem, 2fr)'], ['Usage', 'usage', '140px'], ['Service level', 'sla', '120px'], ['Used by', 'used', 'minmax(8rem, 1fr)']]} />
      </Section>
      <Section title="Subscriptions" count={subs.length} testid="rh-subs">
        <ModernTable rows={subs} {variant} readonly initialSort="" cols={[['SKU', 'sku', '100px'], ['Systems', 'used', '100px'], ['Ends', 'end', '110px'], ['Status', 'st', '120px']]} />
      </Section>
      <ResourcesCard id="redhat-account" />
    {:else}
      <div class="flex flex-col items-center py-8 text-center">
        <span class="text-[var(--pd-details-empty-icon)]"><LabIcon icon={faUser} size={48} /></span>
        <div class="pt-4 text-[16px] font-semibold text-[var(--pd-details-empty-header)]">No accounts</div>
        <div class="pt-1 text-[13px] text-[var(--pd-details-empty-sub-header)]">Sign in to Red Hat to pull from registry.redhat.io, register RHEL machines and use the Developer Sandbox.</div>
        <div class="pt-4"><Btn kind="primary" icon="icons/redhat.redhat-authentication.png" testid="accounts-signin" onclick={(): void => openModal('rh-signin')}>Sign in with Red Hat</Btn></div>
      </div>
      <ExtCards ids={['redhat-account', 'aap', 'sandbox']} title="Authentication extensions" />
    {/if}
  </div>
</div>
