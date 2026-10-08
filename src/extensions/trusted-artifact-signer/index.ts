/**
 * redhat.trusted-artifact-signer – RHTAS (Fulcio + Rekor + TUF) keyless
 * signing on push and signature verification for every image (R20).
 */
import { faSignature, faUpload } from '@fortawesome/free-solid-svg-icons';

import { openDialog } from '#lib/dialog.svelte.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

import { signOnly } from '../rhads-pack/actions.ts';
import SignPushDialog from '../rhads-pack/components/SignPushDialog.svelte';
import { ensureAcmeImages, isAcme, RHTAS, signatureFindings, signatureStatus } from '../rhads-pack/supply-chain.ts';

const extension: MockExtension = {
  id: 'redhat.trusted-artifact-signer',
  displayName: 'Trusted Artifact Signer',
  publisher: 'redhat',
  description: "Keyless-sign images with your org's RHTAS (Fulcio + Rekor + TUF) on push, and show who signed what on every image.",
  version: '0.1.0',
  icon: 'icons/redhat.trusted-artifact-signer.png',
  tags: ['platform'],
  pApis: ['P5', 'P6', 'P14', 'P16', 'P17'],
  contributes: {
    imageCheckers: [
      {
        id: 'signature',
        label: 'Signature (RHTAS)',
        description: `cosign verify against ${RHTAS.oidcIssuer}`,
        durationMs: 900,
        check: signatureFindings,
      },
    ],
    columns: [
      {
        id: 'signed',
        title: 'Signature',
        target: 'image',
        value: row => {
          const i = row as ContainerImage;
          if (!('tag' in row) || !(isAcme(i) || signatureStatus(i) === 'redhat')) return undefined;
          const s = signatureStatus(i);
          return s === 'verified' ? '✓ signed' : s === 'redhat' ? '✓ Red Hat' : s === 'mismatch' ? '✗ identity mismatch' : 'unsigned';
        },
      },
    ],
    menus: [
      {
        id: 'sign-push',
        label: 'Sign & push…',
        icon: faUpload,
        target: 'image',
        placement: 'kebab',
        run: ctx => openDialog(SignPushDialog, { image: ctx.resource as ContainerImage }),
      },
      {
        id: 'sign',
        label: 'Sign image',
        icon: faSignature,
        target: 'image',
        placement: 'details',
        when: ctx => signatureStatus(ctx.resource as ContainerImage) !== 'redhat',
        run: ctx => signOnly(ctx.resource as ContainerImage),
      },
    ],
    accounts: [{ id: 'rhtas', label: 'RHTAS instance (sso.acme-corp.com)', account: 'alice.dev@acme-corp.com', scopes: ['openid', 'email', 'trusted-artifact-signer'] }],
    cliTools: [
      { id: 'cosign', name: 'cosign', displayName: 'cosign', description: 'Sign and verify container images (Sigstore). Downloaded from the RHTAS cli-server route.', version: '3.1.3', latest: '3.1.3', path: '~/.local/share/rhtas/cosign' },
      { id: 'gitsign', name: 'gitsign', displayName: 'gitsign', description: 'Keyless Git commit signing with RHTAS.', version: '0.13.0', path: '~/.local/share/rhtas/gitsign' },
      { id: 'rekor-cli', name: 'rekor-cli', displayName: 'rekor-cli', description: 'Query the Rekor transparency log.', version: '1.4.3', path: '~/.local/share/rhtas/rekor-cli' },
    ],
    settings: [
      {
        id: 'rhtas',
        title: 'Trusted Artifact Signer',
        properties: [
          { id: 'rhtas.tufUrl', title: 'TUF mirror', type: 'string', default: RHTAS.tufUrl },
          { id: 'rhtas.oidcIssuer', title: 'OIDC issuer', type: 'string', default: RHTAS.oidcIssuer },
          { id: 'rhtas.signOnPush', title: 'Offer "Sign after push" when pushing images', type: 'boolean', default: true },
          { id: 'rhtas.bundleFormat', title: 'Signature format', type: 'enum', default: 'sigstore-bundle-v0.3 (OCI 1.1 referrers)', enum: ['sigstore-bundle-v0.3 (OCI 1.1 referrers)', 'legacy .sig tag'] },
        ],
      },
    ],
  },
  seed(world): void {
    ensureAcmeImages(world);
  },
};

export default extension;
