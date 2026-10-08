/**
 * redhat.trusted-profile-analyzer – SBOM generation (syft), upload to the
 * org's TPA and vulnerability / VEX analysis per package URL (R21).
 */
import { faListCheck } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

import { generateSbom, uploadSbom } from '../rhads-pack/actions.ts';
import { ensureAcmeImages, peek, TPA_URL, tpaAsFindings } from '../rhads-pack/supply-chain.ts';
import SbomTab from './components/SbomTab.svelte';
import TpaTool from './components/TpaTool.svelte';

const extension: MockExtension = {
  id: 'redhat.trusted-profile-analyzer',
  displayName: 'Trusted Profile Analyzer',
  publisher: 'redhat',
  category: 'Security & supply chain',
  description: "Generate an SBOM for any local image, upload it to your organization's TPA and see vulnerabilities, VEX status and remediation per package URL.",
  version: '0.1.0',
  icon: 'icons/redhat.trusted-profile-analyzer.png',
  tags: ['platform'],
  pApis: ['P5', 'P6', 'P14', 'P16'],
  contributes: {
    imageCheckers: [
      {
        id: 'tpa',
        label: 'Trusted Profile Analyzer (SBOM + VEX)',
        description: 'Findings from the uploaded SBOM; Red Hat VEX "not affected" entries are excluded from counts.',
        when: image => !!peek(image).sbom?.uploaded,
        durationMs: 1100,
        check: tpaAsFindings,
      },
    ],
    tabs: [{ id: 'sbom', label: 'SBOM', target: 'image', component: SbomTab }],
    tools: [{ id: 'tpa', label: 'Trusted Profile Analyzer', description: 'Uploaded SBOMs and package search', component: TpaTool }],
    menus: [
      { id: 'gen-sbom', label: 'Generate SBOM', icon: faListCheck, target: 'image', placement: 'kebab', when: ctx => !peek(ctx.resource as ContainerImage).sbom?.generated, run: ctx => generateSbom(ctx.resource as ContainerImage) },
      {
        id: 'upload-sbom',
        label: 'Upload SBOM to TPA',
        icon: faListCheck,
        target: 'image',
        placement: 'kebab',
        when: ctx => !!peek(ctx.resource as ContainerImage).sbom?.generated && !peek(ctx.resource as ContainerImage).sbom?.uploaded,
        run: ctx => uploadSbom(ctx.resource as ContainerImage),
      },
    ],
    accounts: [{ id: 'tpa', label: 'TPA instance (tpa.apps.ocp.acme-corp.com)', account: 'cli (client credentials)', scopes: ['read:document', 'create:document'], signedInByDefault: true }],
    cliTools: [{ id: 'syft', name: 'syft', displayName: 'syft', description: 'Generate SBOMs (CycloneDX / SPDX) from container images.', version: '1.33.0', path: '~/.local/share/tpa/syft' }],
    settings: [
      {
        id: 'tpa',
        title: 'Trusted Profile Analyzer',
        properties: [
          { id: 'tpa.url', title: 'TPA URL', type: 'string', default: TPA_URL },
          { id: 'tpa.format', title: 'SBOM format', type: 'enum', default: 'CycloneDX 1.6', enum: ['CycloneDX 1.6', 'SPDX 2.3'] },
          { id: 'tpa.autoUpload', title: 'Upload SBOMs automatically after generation', type: 'boolean', default: false },
        ],
      },
    ],
  },
  seed(world): void {
    ensureAcmeImages(world);
  },
};

export default extension;
