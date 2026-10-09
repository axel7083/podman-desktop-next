/**
 * redhat.satellite – company Satellite as container registry and as the
 * registration target of RHEL machines/VMs (disconnected-friendly).
 * Registries (P17), account (P16), Settings › Satellite.
 */
import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

const extension: MockExtension = {
  id: 'redhat.satellite',
  displayName: 'Red Hat Satellite',
  publisher: 'redhat',
  category: 'RHEL & image mode',
  description: 'Use your company Satellite as container registry and as the subscription/registration target for RHEL machines and VMs.',
  version: '0.1.0',
  icon: 'icons/redhat.satellite.svg',
  tags: ['rhel'],
  pApis: ['P14', 'P16', 'P18'],
  contributes: {
    registries: [{ id: 'satellite.acme.corp', name: 'Satellite (ACME)', server: 'satellite.acme.corp', icon: 'icons/redhat.satellite.svg', user: 'alice' }],
    accounts: [{ id: 'satellite', label: 'Red Hat Satellite (satellite.acme.corp)', icon: 'icons/redhat.satellite.svg', account: 'alice @ ACME', scopes: ['registry', 'registration', 'content-views:read'], signedInByDefault: true }],
    settings: [{ id: 'satellite', title: 'Satellite', component: () => import('./components/SatelliteSettings.svelte') }],
    commands: [{ id: 'satellite.open', title: 'Open Satellite content views', category: 'Satellite', run: (): void => navigate('/settings/satellite') }],
  },
};

export default extension;
