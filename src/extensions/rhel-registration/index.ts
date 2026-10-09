/**
 * redhat.rhel-registration – subscription-manager registration of RHEL
 * machines and VMs. Depends on redhat.redhat-authentication, which owns SSO,
 * activation keys and subscriptions (one owner, see docs/decisions.md P5).
 * Contributes: the connection "Subscription" tab (P14), Settings › RHEL
 * registration (systems on this computer) and a "RHEL systems" card (P17).
 */
import { faIdCard } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { ago } from '#lib/world.svelte.ts';

import { ORG_ID, REG_EXT, type Registration } from './store.ts';

const extension: MockExtension = {
  id: REG_EXT,
  displayName: 'RHEL registration',
  publisher: 'redhat',
  category: 'RHEL & image mode',
  description: 'Registers RHEL Podman machines and VMs with subscription-manager using the activation keys of your Red Hat account.',
  version: '1.3.0',
  icon: 'icons/redhat.rhel-registration.png',
  dependsOn: ['redhat.redhat-authentication'],
  tags: ['rhel', 'windows'],
  pApis: ['P14', 'P16', 'P17'],
  contributes: {
    tabs: [
      {
        id: 'subscription',
        label: 'Subscription',
        target: 'connection',
        when: ctx => !!ctx.conn.capabilities?.includes('rhel') || (ctx.conn.engineType === 'podman' && !!ctx.conn.capabilities?.includes('machine')),
        component: () => import('./components/SubscriptionTab.svelte'),
      },
    ],
    settings: [{ id: 'rhel-registration', title: 'RHEL registration', icon: faIdCard, component: () => import('./components/RegistrationSettings.svelte') }],
    dashboardCards: [{ id: 'rhel-systems', title: 'RHEL systems', component: () => import('./components/SubscriptionsCard.svelte') }],
    commands: [
      { id: 'rhel.register', title: 'Register a RHEL system', category: 'RHEL', run: (): void => navigate('/settings/rhel-registration') },
    ],
  },
  seed(world): void {
    const registrations: Record<string, Registration> = {
      'rhel-9': { status: 'Current', target: 'rhsm', key: 'podman-desktop', org: ORG_ID, consumerUuid: 'a83b51f0-77c2-4f0e-8e11-6e2f4a9b0c21', registeredAt: ago({ d: 26 }) },
      'rhel10-dev': { status: 'Current', target: 'rhsm', key: 'podman-desktop', org: ORG_ID, consumerUuid: 'c0ffee00-1234-4abc-9def-00aa11bb22cc', registeredAt: ago({ d: 20 }) },
      'rhel9-db': { status: 'Not registered', target: 'rhsm' },
    };
    world.ext[REG_EXT] = { registrations };
    world.notifications.push({
      id: 'rhsm-expiring',
      title: 'Subscription expiring soon',
      body: 'Red Hat Enterprise Linux Server, Standard (41/50 used) ends on 2026-10-31.',
      type: 'warning',
      created: ago({ h: 6 }),
      read: false,
    });
  },
};

export default extension;
