/**
 * redhat.conforma – `ec validate image` release-policy gate (R22): image
 * checker, Policy tab, "Validate release policy" menu, policy settings.
 */
import { faFileContract } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

import { runConforma } from '../rhads-pack/actions.ts';
import { conformaAsFindings, ensureAcmeImages, isAcme } from '../rhads-pack/supply-chain.ts';
import PolicyTab from './components/PolicyTab.svelte';

const extension: MockExtension = {
  id: 'redhat.conforma',
  displayName: 'Conforma policy check',
  publisher: 'redhat',
  description: "Validate an image's signature, SLSA provenance and attestations against your release policy before you ship it.",
  version: '0.1.0',
  icon: 'icons/redhat.conforma.png',
  tags: ['platform'],
  pApis: ['P5', 'P6', 'P14'],
  contributes: {
    imageCheckers: [
      {
        id: 'conforma',
        label: 'Conforma release policy (@redhat)',
        description: 'ec validate image – violations are errors, warnings are informational.',
        when: isAcme,
        durationMs: 1500,
        check: conformaAsFindings,
      },
    ],
    tabs: [{ id: 'policy', label: 'Policy', target: 'image', when: ctx => isAcme(ctx.resource as ContainerImage), component: PolicyTab }],
    menus: [{ id: 'validate', label: 'Validate release policy', icon: faFileContract, target: 'image', placement: 'kebab', run: ctx => runConforma(ctx.resource as ContainerImage) }],
    cliTools: [{ id: 'ec', name: 'ec', displayName: 'Conforma CLI (ec)', description: 'Validate images and Konflux snapshots against Conforma policies.', version: 'v0.8.71 (snapshot)', path: '~/.local/share/rhtas/ec' }],
    settings: [
      {
        id: 'conforma',
        title: 'Conforma',
        properties: [
          { id: 'conforma.policy', title: 'Policy source', type: 'string', default: 'k8s://acme-tenant/acme-release-policy' },
          { id: 'conforma.collection', title: 'Rule collection', type: 'enum', default: '@redhat', enum: ['@redhat', '@minimal', '@slsa3'] },
          { id: 'conforma.identity', title: 'Expected signer identity', type: 'string', default: 'release@acme-corp.com' },
        ],
      },
    ],
  },
  seed(world): void {
    ensureAcmeImages(world);
  },
};

export default extension;
