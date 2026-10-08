/**
 * redhat.edge-manager – Red Hat Edge Manager (flightctl): a service
 * connection (P8) with Devices, Fleets and Enrollment requests sections (P2).
 * Local RHEL VMs booted from a bootc image with flightctl-agent show up as
 * enrollment requests (bootc → RHEL VMs → Edge Manager journey).
 */
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, MockExtension } from '#lib/ext/types.ts';

import { DEVICES, EM_CONN, EM_EXT, emStore, ERS, FLEETS, vmRequests } from './data.ts';

const isEm = (c: ConnectionView): boolean => c.id === EM_CONN;

const extension: MockExtension = {
  id: EM_EXT,
  displayName: 'Red Hat Edge Manager',
  publisher: 'redhat',
  description: 'Build a bootc image with the flightctl agent, boot it as a local device, enroll it and roll fleet updates.',
  version: '0.1.0',
  icon: 'icons/redhat.edge-manager.svg',
  dependsOn: ['redhat.redhat-authentication', 'redhat.bootc', 'redhat.rhel-vms'],
  tags: ['rhel'],
  pApis: ['P2', 'P8', 'P14', 'P15'],
  contributes: {
    connections: [
      {
        id: EM_CONN,
        name: 'edge-manager',
        kind: 'service',
        providerId: 'edge-manager',
        providerName: 'Red Hat Edge Manager',
        hint: 'flightctl',
        initialStatus: 'started',
        endpoint: 'https://api.edge-manager.acme.corp',
        version: 'v1.3.1',
        details: { Organization: 'ACME', 'API version': 'flightctl.io/v1beta1', Auth: 'Red Hat SSO (alice.dev@acme-corp.com)' },
        capabilities: ['flightctl'],
      },
    ],
    navSections: [
      { id: 'devices', label: 'Devices', when: isEm, component: () => import('./components/DevicesSection.svelte'), counter: () => emStore().devices.length },
      { id: 'fleets', label: 'Fleets', when: isEm, component: () => import('./components/FleetsSection.svelte'), counter: () => emStore().fleets.length },
      { id: 'enrollment-requests', label: 'Enrollment requests', when: isEm, component: () => import('./components/EnrollmentSection.svelte'), counter: () => emStore().ers.filter(e => e.status === 'Pending').length + vmRequests(registry.activeConnections.filter(c => c.capabilities?.includes('flightctl-agent'))).length || undefined },
    ],
  },
  seed(world): void {
    world.ext[EM_EXT] = { devices: DEVICES, fleets: FLEETS, ers: ERS };
  },
};

export default extension;
