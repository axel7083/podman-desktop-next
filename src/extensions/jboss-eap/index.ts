/**
 * redhat.jboss-eap (proposed) – Red Hat JBoss EAP 8.1 with WildFly Glow: a
 * "Containerize WAR" tool page (P3) that scans a WAR, provisions a trimmed
 * server image as tasks (P15) and runs it, plus an EAP tab on EAP 8
 * containers (P14) and the wildfly-glow CLI (P17).
 */
import type { MockExtension } from '#lib/ext/types.ts';
import type { Container } from '#lib/world.svelte.ts';

import { EAP_EXT, IMAGE_NAME, IMAGE_TAG } from './data.ts';

const extension: MockExtension = {
  id: EAP_EXT,
  displayName: 'JBoss EAP',
  publisher: 'redhat',
  description: 'Scan a WAR with WildFly Glow, provision a trimmed JBoss EAP 8.1 image, and run and manage it locally.',
  version: '0.3.0',
  icon: 'icons/redhat.jboss-eap.png',
  tags: ['appdev'],
  pApis: ['P3', 'P14', 'P15', 'P17'],
  contributes: {
    tools: [{ id: 'eap', label: 'JBoss EAP', icon: 'icons/redhat.jboss-eap.png', description: 'Containerize a WAR with WildFly Glow', component: () => import('./components/GlowTool.svelte') }],
    tabs: [
      {
        id: 'eap',
        label: 'EAP',
        target: 'container',
        when: ctx => {
          const image = (ctx.resource as Container).image ?? '';
          return image.includes(`${IMAGE_NAME.replace('localhost/', '')}:${IMAGE_TAG}`) || image.includes('eap8');
        },
        component: () => import('./components/EapTab.svelte'),
      },
    ],
    cliTools: [
      {
        id: 'wildfly-glow',
        name: 'wildfly-glow',
        displayName: 'WildFly Glow',
        description: 'Scans deployments and provisions the Galleon layers they need (wildfly-glow scan, show-add-ons).',
        version: '2.2.0.Final',
        latest: '2.2.0.Final',
        path: '/home/maya/.local/bin/wildfly-glow',
      },
    ],
  },
};

export default extension;
