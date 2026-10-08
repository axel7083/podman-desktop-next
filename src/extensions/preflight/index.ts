/**
 * redhat.preflight – Red Hat container certification readiness (R18):
 * checker (by reference, via the local registry), "Run certification checks"
 * menu, preflight CLI. Results and fixes render in the RHADS Supply chain tab.
 */
import { faCertificate } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

import { runPreflight, submitCertification } from '../rhads-pack/actions.ts';
import { ensureAcmeImages, isAcme, peek, preflightAsFindings, preflightChecks } from '../rhads-pack/supply-chain.ts';

const extension: MockExtension = {
  id: 'redhat.preflight',
  displayName: 'Red Hat Certification Preflight',
  publisher: 'redhat',
  description: 'Run the Red Hat container certification checks on your image before you submit it to Partner Connect.',
  version: '0.1.0',
  icon: 'icons/redhat.preflight.png',
  dependsOn: ['podman-desktop.local-registry'],
  tags: ['platform'],
  pApis: ['P5', 'P15'],
  contributes: {
    imageCheckers: [
      {
        id: 'preflight',
        label: 'Certification readiness (preflight)',
        description: 'Container policy checks; run them from the Supply chain tab to push the image to localhost:5000 first.',
        when: image => isAcme(image) && !!peek(image).preflightRun,
        durationMs: 1300,
        check: preflightAsFindings,
      },
    ],
    columns: [
      {
        id: 'cert',
        title: 'Certification',
        target: 'image',
        value: row => {
          const i = row as ContainerImage;
          if (!('tag' in row) || !peek(i).preflightRun) return undefined;
          const checks = preflightChecks(i);
          return `cert ${checks.filter(c => c.passed).length}/${checks.length}`;
        },
      },
    ],
    menus: [
      { id: 'run-preflight', label: 'Run certification checks', icon: faCertificate, target: 'image', placement: 'kebab', run: ctx => runPreflight(ctx.resource as ContainerImage) },
      {
        id: 'submit',
        label: 'Submit to Partner Connect',
        icon: faCertificate,
        target: 'image',
        placement: 'details',
        when: ctx => !!peek(ctx.resource as ContainerImage).certificationHash && !peek(ctx.resource as ContainerImage).submitted,
        run: ctx => submitCertification(ctx.resource as ContainerImage),
      },
    ],
    cliTools: [{ id: 'preflight', name: 'preflight', displayName: 'preflight', description: 'openshift-preflight: Red Hat certification checks for containers and operators.', version: '1.21.1', latest: '1.21.1', path: '~/.local/share/preflight/preflight' }],
    settings: [
      {
        id: 'preflight',
        title: 'Certification preflight',
        properties: [
          { id: 'preflight.componentId', title: 'Certification component id', type: 'string', default: '64f1c0a2e7' },
          { id: 'preflight.platform', title: 'Platform', type: 'enum', default: 'amd64', enum: ['amd64', 'arm64', 'ppc64le', 's390x'] },
        ],
      },
    ],
  },
  seed(world): void {
    ensureAcmeImages(world);
  },
};

export default extension;
