<script lang="ts">
/** Accounts – PD's PreferencesAuthenticationProvidersRendering: one row per auth provider (P16). */
import { faArrowRightFromBracket, faArrowRightToBracket, faCircleUser } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { AuthProviderDef, Contributed } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { runTask, toast, world } from '#lib/world.svelte.ts';

import SettingsPage from './settings/SettingsPage.svelte';

function signedIn(a: Contributed<AuthProviderDef>): boolean {
  return world.accounts[a.id] ?? a.signedInByDefault ?? false;
}

function signIn(a: Contributed<AuthProviderDef>): void {
  runTask({
    name: `Sign in to ${a.label}`,
    ext: a.ext.id,
    steps: [{ label: 'Waiting for browser sign-in', ms: 1500 }, { label: 'Exchanging token', ms: 500 }],
    onDone: () => (world.accounts[a.id] = true),
  });
}

function signOut(a: Contributed<AuthProviderDef>): void {
  world.accounts[a.id] = false;
  toast({ type: 'info', title: `Signed out of ${a.label}` });
}

function catalog(): void {
  navigate('/extensions?tab=catalog');
}
</script>

<SettingsPage title="Accounts">
  {#snippet subtitle()}<span>Authentication providers contributed by extensions.</span>{/snippet}
  {#if registry.accounts.length === 0}
    <EmptyScreen icon={faCircleUser} title="No authentication providers" message="Install an extension that provides sign-in, such as Red Hat Authentication or GitHub.">
      <Button onclick={catalog}>Browse the catalog</Button>
    </EmptyScreen>
  {/if}
  {#each registry.accounts as a (a.ext.id + a.id)}
    {@const on = signedIn(a)}
    <Contribution ext={a.ext} kind="account" api="P16">
      <div class="bg-[var(--pd-invert-content-card-bg)] mb-5 rounded-md p-3 flex items-center gap-4" role="region" aria-label={a.label}>
        <AppIcon icon={a.icon ?? a.ext.icon} size="36px" />
        <div class="grow min-w-0 text-[var(--pd-invert-content-card-text)]">
          <div class="font-semibold text-[var(--pd-invert-content-card-header-text)]">{a.label}</div>
          {#if on}
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-running)]"></span>Signed in as {a.account}</div>
            {#if a.scopes?.length}<div class="text-xs opacity-80 truncate">Scopes: {a.scopes.join(', ')}</div>{/if}
          {:else}
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-stopped)]"></span>Logged out</div>
          {/if}
        </div>
        {#if on}
          <Button type="secondary" icon={faArrowRightFromBracket} onclick={signOut.bind(undefined, a)}>Sign out</Button>
        {:else}
          <Button icon={faArrowRightToBracket} onclick={signIn.bind(undefined, a)}>Sign in</Button>
        {/if}
      </div>
    </Contribution>
  {/each}
  <div class="text-sm text-[var(--pd-invert-content-card-text)] flex items-center gap-1"><Icon icon={faCircleUser} />Accounts are shared with every extension that declares the provider as a dependency.</div>
</SettingsPage>
