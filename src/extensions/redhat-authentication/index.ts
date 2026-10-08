/**
 * redhat.redhat-authentication – Red Hat SSO account shared by every Red Hat
 * extension (dependsOn). Contributes the Accounts provider (P16), the
 * registry.redhat.io service-account registry, a status-bar item, a settings
 * page (organization, activation keys, subscriptions) and a dashboard card.
 * Shared with the RHEL wave: keep it generic, extend rather than fork.
 */
import { faArrowRightToBracket, faGear } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { runTask, world } from '#lib/world.svelte.ts';

import RedHatAccountSettings from './components/RedHatAccountSettings.svelte';
import SubscriptionCard from './components/SubscriptionCard.svelte';
import { REGISTRY_SERVICE_ACCOUNT, SESSION, SSO_PROVIDER_ID } from './data.ts';

const ID = 'redhat.redhat-authentication';

/** Signed in unless the user signed out in this world. */
export function redHatSignedIn(): boolean {
  return world.accounts[SSO_PROVIDER_ID] ?? true;
}

function signIn(): void {
  runTask({
    name: 'Sign in to Red Hat',
    ext: ID,
    steps: [
      { label: 'Waiting for browser sign-in (sso.redhat.com)', ms: 1800 },
      { label: `Creating service account ${REGISTRY_SERVICE_ACCOUNT.name}`, ms: 700, log: ['POST https://access.redhat.com/hydra/rest/terms-based-registry'] },
      { label: 'Adding registry.redhat.io', ms: 500 },
    ],
    onDone: () => (world.accounts[SSO_PROVIDER_ID] = true),
  });
}

const extension: MockExtension = {
  id: ID,
  displayName: 'Red Hat Authentication',
  publisher: 'redhat',
  description: 'Sign in with Red Hat SSO; configures registry.redhat.io and registers Podman machines with a RHEL subscription.',
  version: '1.3.0',
  icon: 'icons/redhat.redhat-authentication.png',
  tags: ['openshift', 'rhel', 'platform'],
  pApis: ['P16', 'P17'],
  contributes: {
    accounts: [
      {
        id: SSO_PROVIDER_ID,
        label: 'Red Hat account',
        account: `${SESSION.account.label} (org ${SESSION.organizationId})`,
        scopes: SESSION.scopes,
        signedInByDefault: true,
      },
    ],
    registries: [
      {
        id: 'registry.redhat.io',
        name: 'Red Hat Container Registry',
        server: 'registry.redhat.io',
        icon: 'icons/redhat.redhat-authentication.png',
        user: REGISTRY_SERVICE_ACCOUNT.username,
      },
    ],
    statusItems: [
      {
        id: 'redhat-sso',
        align: 'left',
        icon: 'icons/redhat.redhat-authentication.png',
        text: (): string => (redHatSignedIn() ? SESSION.account.label : 'Sign in to Red Hat'),
        tooltip: 'Red Hat SSO',
        command: 'redhat.authentication.navigate.settings',
      },
    ],
    settings: [{ id: 'redhat-account', title: 'Red Hat account', icon: 'icons/redhat.redhat-authentication.png', component: RedHatAccountSettings }],
    dashboardCards: [{ id: 'redhat-subscription', title: 'Red Hat subscriptions', component: SubscriptionCard }],
    commands: [
      { id: 'redhat.authentication.signin', title: 'Sign in to Red Hat', category: 'Red Hat', icon: faArrowRightToBracket, run: signIn },
      {
        id: 'redhat.authentication.navigate.settings',
        title: 'Open Red Hat account settings',
        category: 'Red Hat',
        icon: faGear,
        run: (): void => navigate('/settings/redhat-account'),
      },
    ],
  },
};

export default extension;
