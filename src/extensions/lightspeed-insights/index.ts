/**
 * redhat.lightspeed-insights – Red Hat Lightspeed (formerly Insights)
 * Advisor and Vulnerability for registered RHEL VMs and RHEL Podman machines:
 * two connection tabs (P14) and a dashboard card (P17).
 */
import type { MockExtension } from '#lib/ext/types.ts';

import { ADVISOR, CVES, LS_EXT } from './data.ts';
import FleetCard from './components/FleetCard.svelte';

const isRhel = (caps: string[] | undefined): boolean => !!caps?.includes('rhel');

const extension: MockExtension = {
  id: LS_EXT,
  displayName: 'Red Hat Lightspeed',
  publisher: 'redhat',
  description: 'Advisor recommendations and CVE exposure for your registered RHEL VMs and RHEL Podman machines.',
  version: '0.2.0',
  icon: 'icons/redhat.lightspeed-insights.png',
  dependsOn: ['redhat.redhat-authentication', 'redhat.rhel-registration'],
  tags: ['rhel'],
  pApis: ['P14', 'P16', 'P17'],
  contributes: {
    tabs: [
      { id: 'advisor', label: 'Advisor', target: 'connection', when: ctx => isRhel(ctx.conn.capabilities), component: () => import('./components/AdvisorTab.svelte') },
      { id: 'vulnerabilities', label: 'Vulnerabilities', target: 'connection', when: ctx => isRhel(ctx.conn.capabilities), component: () => import('./components/VulnerabilitiesTab.svelte') },
    ],
    dashboardCards: [{ id: 'fleet-health', title: 'Red Hat Lightspeed', component: FleetCard }],
  },
  seed(world): void {
    world.ext[LS_EXT] = { advisor: ADVISOR, cves: CVES, checkedIn: ['rhel-9', 'rhel10-dev'] };
  },
};

export default extension;
