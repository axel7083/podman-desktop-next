<script lang="ts">
/**
 * Shared gate of the Advisor / Vulnerabilities tabs: not registered →
 * Register CTA; registered but no check-in yet → waiting (populated after a
 * simulated insights-client upload); otherwise renders children.
 */
import { faArrowsRotate, faIdCard } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, Spinner } from '@podman-desktop/ui-svelte';
import type { Snippet } from 'svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { later } from '#lib/world.svelte.ts';

import { registrationOf } from '../../rhel-registration/store.ts';
import { freshHost, lsStore, mutableStore } from '../data.ts';

interface Props {
  conn: ConnectionView;
  children: Snippet;
}

let { conn, children }: Props = $props();

const reg = $derived(registrationOf(conn.id));
const checkedIn = $derived(lsStore().checkedIn.includes(conn.id));

const pending = new Set<string>();

$effect(() => {
  if (reg?.status === 'Current' && !checkedIn && !pending.has(conn.id)) {
    const id = conn.id;
    pending.add(id);
    later(6000, () => {
      const s = mutableStore();
      if (s.checkedIn.includes(id)) return;
      const fresh = freshHost(id);
      s.advisor = [...s.advisor, ...fresh.advisor];
      s.cves = [...s.cves, ...fresh.cves];
      s.checkedIn = [...s.checkedIn, id];
    });
  }
});

function register(): void {
  navigate(`/c/${conn.id}?tab=subscription`);
}
</script>

{#if reg?.status !== 'Current'}
  <EmptyScreen icon={faIdCard} title="{conn.name} is not registered" message="Red Hat Lightspeed analyses registered systems only. Register {conn.name} with an activation key to see recommendations and CVEs.">
    <Button onclick={register}>Register {conn.name}</Button>
  </EmptyScreen>
{:else if !checkedIn}
  <EmptyScreen icon={faArrowsRotate} title="Waiting for first check-in" message="insights-client is uploading the first system profile of {conn.name}. Results appear within a few minutes.">
    <div class="flex justify-center"><Spinner size="2em" /></div>
  </EmptyScreen>
{:else}
  {@render children()}
{/if}
