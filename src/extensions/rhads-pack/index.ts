/**
 * redhat.rhads-pack – Red Hat Advanced Developer Suite extension pack (R25).
 * Enabling it enables every member (packOf, PD `extensionPack`); it adds the
 * aggregated image "Supply chain" tab, a posture dashboard card and the
 * single "RHADS instance" account that configures RHTAS/TPA/Conforma (P16).
 */
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import PostureCard from './components/PostureCard.svelte';
import SupplyChainTab from './components/SupplyChainTab.svelte';
import { ACME_IMAGES, ensureAcmeImages } from './supply-chain.ts';

const extension: MockExtension = {
  id: 'redhat.rhads-pack',
  displayName: 'Red Hat Advanced Developer Suite',
  publisher: 'redhat',
  description: 'Trusted software supply chain on your laptop: dependency analytics, signing, SBOM analysis, policy and Developer Hub.',
  version: '1.0.0',
  icon: 'icons/redhat.rhads-pack.png',
  packOf: [
    'redhat.redhat-authentication',
    'redhat.dependency-analytics',
    'redhat.trusted-artifact-signer',
    'redhat.trusted-profile-analyzer',
    'redhat.conforma',
    'redhat.preflight',
    'redhat.rhdh-local',
    'redhat.konflux',
  ],
  tags: ['platform'],
  pApis: ['P5', 'P6', 'P14', 'P16', 'P17'],
  contributes: {
    tabs: [{ id: 'supply-chain', label: 'Supply chain', target: 'image', component: SupplyChainTab }],
    dashboardCards: [{ id: 'rhads-posture', title: 'Supply chain posture', component: PostureCard }],
    accounts: [
      {
        id: 'rhads-instance',
        label: 'RHADS instance acme-rhads',
        account: 'priya@acme-corp.com',
        scopes: ['RHTAS 1.4.3', 'TPA 2.2', 'Developer Hub', 'Conforma policy'],
        signedInByDefault: true,
      },
    ],
    commands: [
      {
        id: 'rhads.supply-chain',
        title: 'Show supply chain of payments-api:1.5.0',
        category: 'RHADS',
        icon: faShieldHalved,
        run: (): void => navigate(`/c/podman-machine-default/images?q=${encodeURIComponent(ACME_IMAGES.payments)}`),
      },
    ],
  },
  seed(world): void {
    ensureAcmeImages(world);
  },
};

export default extension;
