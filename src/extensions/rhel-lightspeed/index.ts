/**
 * redhat.rhel-lightspeed – RHEL Lightspeed command-line assistant chat
 * (Tools group, P3). Advisor hits link here with `?ask=` ("Explain with RHEL
 * Lightspeed"); a command and a container menu open it too.
 */
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { RL_EXT } from './data.ts';

const extension: MockExtension = {
  id: RL_EXT,
  displayName: 'RHEL Lightspeed',
  publisher: 'redhat',
  description: 'Get help from RHEL Lightspeed (command-line assistant) inside Podman Desktop.',
  version: '0.3.0',
  icon: 'icons/redhat.rhel-lightspeed.png',
  dependsOn: ['redhat.redhat-authentication', 'redhat.rhel-registration'],
  tags: ['rhel'],
  pApis: ['P3', 'P14', 'P17'],
  contributes: {
    tools: [{ id: 'rhel-lightspeed', label: 'RHEL Lightspeed', icon: 'icons/redhat.rhel-lightspeed.png', description: 'Ask RHEL questions', component: () => import('./components/LightspeedTool.svelte') }],
    menus: [
      {
        id: 'explain-container',
        label: 'Explain with RHEL Lightspeed',
        icon: faWandMagicSparkles,
        target: 'container',
        placement: 'kebab',
        run: (ctx): void => {
          const name = (ctx.resource as { name: string }).name;
          navigate(`/tools/rhel-lightspeed?ask=${encodeURIComponent(`Explain the last error in the logs of container ${name}: SELinux is preventing /usr/bin/python3 from write access on the directory /data`)}`);
        },
      },
    ],
    commands: [{ id: 'rhel-lightspeed.ask', title: 'Ask RHEL Lightspeed', category: 'RHEL', icon: faWandMagicSparkles, run: (): void => navigate('/tools/rhel-lightspeed') }],
  },
};

export default extension;
