/**
 * redhat.image-builder – Red Hat Lightspeed Image Builder (hosted):
 * blueprints → composes → download → feed the RHEL Podman machine / RHEL VM
 * wizards. Tools group page (P3), dashboard card (P17), long builds as tasks (P15).
 */
import { faHammer } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { BLUEPRINTS, COMPOSES, IB_EXT, ibStore } from './data.ts';

const extension: MockExtension = {
  id: IB_EXT,
  displayName: 'Image Builder',
  publisher: 'redhat',
  category: 'RHEL & image mode',
  description: 'Build RHEL images (WSL, qcow2, ISO, vhd, AMI, vSphere…) from blueprints on console.redhat.com and use them locally.',
  version: '0.1.0',
  icon: 'icons/redhat.image-builder.png',
  dependsOn: ['redhat.redhat-authentication', 'redhat.rhel-registration'],
  tags: ['rhel'],
  pApis: ['P3', 'P15', 'P16', 'P17'],
  contributes: {
    tools: [
      {
        id: 'image-builder',
        label: 'Image Builder',
        icon: 'icons/redhat.image-builder.png',
        component: () => import('./components/ImageBuilderTool.svelte'),
        badge: () => ibStore().composes.filter(c => ['pending', 'building', 'uploading'].includes(c.image_status.status)).length || undefined,
      },
    ],
    dashboardCards: [{ id: 'last-compose', title: 'Image Builder', component: () => import('./components/LastComposeCard.svelte') }],
    commands: [
      { id: 'image-builder.open', title: 'Open Image Builder', category: 'RHEL', icon: faHammer, run: (): void => navigate('/tools/image-builder') },
      { id: 'image-builder.new', title: 'Create blueprint', category: 'Image Builder', icon: faHammer, run: (): void => navigate('/tools/image-builder?tab=blueprints') },
    ],
  },
  seed(world): void {
    world.ext[IB_EXT] = { blueprints: BLUEPRINTS, composes: COMPOSES };
  },
};

export default extension;
