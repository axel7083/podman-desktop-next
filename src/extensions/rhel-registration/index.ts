/**
 * redhat.rhel-registration – activation keys, subscriptions and system
 * registration (subscription-manager) for RHEL machines and VMs.
 * The SSO part lives in redhat.redhat-authentication (other wave); this
 * extension owns everything RHSM: Settings › RHEL registration, the
 * connection "Subscription" tab (P14) and a dashboard card (P17).
 */
import { faIdCard } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { ago } from '#lib/world.svelte.ts';

import { REG_EXT, type ActivationKey, type Registration, type Subscription } from './store.ts';

const KEYS: ActivationKey[] = [
  { id: '38291', name: 'podman-desktop', role: 'Red Hat Enterprise Linux Workstation', usage: 'Development/Test', serviceLevel: 'Self-Support', releaseVersion: '', additionalRepositories: [] },
  { id: '38292', name: 'ci-runners', role: 'Red Hat Enterprise Linux Server', usage: 'Production', serviceLevel: 'Standard', releaseVersion: '9.6', additionalRepositories: [{ repositoryLabel: 'codeready-builder-for-rhel-9-x86_64-rpms' }] },
  { id: '38407', name: 'edge-lab', role: 'Red Hat Enterprise Linux Server', usage: 'Development/Test', serviceLevel: 'Self-Support', releaseVersion: '10.0', additionalRepositories: [] },
  { id: '38512', name: 'satellite-dc1', role: 'Red Hat Enterprise Linux Server', usage: 'Production', serviceLevel: 'Premium', releaseVersion: '', additionalRepositories: [] },
];

const SUBSCRIPTIONS: Subscription[] = [
  { sku: 'RH00798', name: 'Red Hat Developer Subscription for Individuals', quantity: 16, consumed: 5, startDate: '2026-03-02', endDate: '2027-03-02', status: 'Active' },
  { sku: 'RH00003', name: 'Red Hat Enterprise Linux Server, Standard', quantity: 50, consumed: 41, startDate: '2025-11-01', endDate: '2026-10-31', status: 'Expiring soon' },
];

const extension: MockExtension = {
  id: REG_EXT,
  displayName: 'RHEL registration',
  publisher: 'redhat',
  description: 'Activation keys, subscriptions and subscription-manager registration for RHEL Podman machines and VMs.',
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
    dashboardCards: [{ id: 'rh-subscriptions', title: 'Red Hat subscriptions', component: () => import('./components/SubscriptionsCard.svelte') }],
    commands: [
      { id: 'rhel.keys', title: 'Manage activation keys', category: 'RHEL', run: (): void => navigate('/settings/rhel-registration') },
      { id: 'rhel.register', title: 'Register a RHEL system', category: 'RHEL', run: (): void => navigate('/settings/rhel-registration') },
    ],
  },
  seed(world): void {
    const registrations: Record<string, Registration> = {
      'podman-machine-default': { status: 'Current', target: 'rhsm', key: 'podman-desktop', org: '19830412', consumerUuid: '6f1c2e7a-0b9d-4f6e-9d3c-1a2b3c4d5e6f', registeredAt: ago({ d: 40 }) },
      'rhel-9': { status: 'Current', target: 'rhsm', key: 'podman-desktop', org: '19830412', consumerUuid: 'a83b51f0-77c2-4f0e-8e11-6e2f4a9b0c21', registeredAt: ago({ d: 26 }) },
      'rhel10-dev': { status: 'Current', target: 'rhsm', key: 'podman-desktop', org: '19830412', consumerUuid: 'c0ffee00-1234-4abc-9def-00aa11bb22cc', registeredAt: ago({ d: 20 }) },
      'rhel9-db': { status: 'Not registered', target: 'rhsm' },
    };
    world.ext[REG_EXT] = { registrations, activationKeys: KEYS, subscriptions: SUBSCRIPTIONS };
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
