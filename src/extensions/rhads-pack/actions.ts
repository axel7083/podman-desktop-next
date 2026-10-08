/**
 * Long-running supply-chain actions (P15 tasks) shared by the RHADS members
 * and the pack's "Supply chain" tab. Every action is a task; state lands in
 * the image chain on completion.
 */
import { type ContainerImage, runTask, toast } from '#lib/world.svelte.ts';

import { ACME_IMAGES, chain, conformaReport, DIGESTS, refOf, RHTAS, sbomPackageCount, shortRef, TPA_URL } from './supply-chain.ts';
import { plural } from '#lib/util.ts';

const TAS = 'redhat.trusted-artifact-signer';
const TPA = 'redhat.trusted-profile-analyzer';
const EC = 'redhat.conforma';
const PF = 'redhat.preflight';

function digestOf(image: ContainerImage): string {
  return (DIGESTS[refOf(image)] ?? image.digest ?? 'sha256:').slice(0, 23);
}

function detailsHref(image: ContainerImage, tab = 'supply-chain'): string {
  return `/c/${image.engineId}/images/${image.id}/${tab}`;
}

export interface SignPushOptions {
  destination: string;
  sign: boolean;
  attachSbom: boolean;
  identity: string;
}

/** Push (optionally to quay.io/acme) then keyless-sign with RHTAS (cosign v3). */
export function signAndPush(image: ContainerImage, o: SignPushOptions): void {
  const logIndex = 48213377 + Math.floor(Math.random() * 900);
  const c0 = chain(image);
  const attach = o.attachSbom && !!c0.sbom?.generated;
  runTask({
    name: o.sign ? `Push and sign ${shortRef(image)}` : `Push ${shortRef(image)}`,
    ext: TAS,
    action: { label: 'Open supply chain', href: detailsHref(image) },
    steps: [
      { label: `Pushing to ${o.destination}`, ms: 1800, log: ['Copying blob sha256:3f1c… done', 'Copying config sha256:b9e0… done', `Writing manifest ${digestOf(image)}…`] },
      ...(o.sign
        ? [
            { label: 'Waiting for browser sign-in (sso.acme-corp.com)', ms: 1400, log: [`OIDC issuer ${RHTAS.oidcIssuer}`, `Signed in as ${o.identity}`] },
            { label: 'Requesting signing certificate from Fulcio', ms: 900, log: [`Fulcio ${RHTAS.fulcioUrl}`, 'Certificate valid for 10 minutes'] },
            { label: 'Signing and uploading to Rekor', ms: 1100, log: [`cosign sign -y ${o.destination}@${digestOf(image)}`, `tlog entry created with index: ${logIndex}`] },
            ...(attach ? [{ label: 'Attaching SBOM attestation (CycloneDX)', ms: 900, log: [`cosign attest --type cyclonedx … tlog index ${logIndex + 1}`] }] : []),
          ]
        : []),
    ],
    onDone: () => {
      const c = chain(image);
      c.pushedTo = [...new Set([...(c.pushedTo ?? []), o.destination])];
      if (o.sign) {
        c.signatures = [
          ...c.signatures.filter(s => s.verified),
          { subject: o.identity, issuer: RHTAS.oidcIssuer, logIndex, integratedTime: Math.round(Date.now() / 1000), verified: true, bundleFormat: 'sigstore-bundle-v0.3' },
        ];
        if (attach) c.attestations = [...c.attestations, { predicateType: 'https://cyclonedx.org/bom', logIndex: logIndex + 1 }];
        toast({ type: 'success', title: `Signed by ${o.identity}`, body: `Rekor log index ${logIndex}` });
      }
    },
  });
}

export function signOnly(image: ContainerImage): void {
  signAndPush(image, { destination: image.name, sign: true, attachSbom: true, identity: 'alice.dev@acme-corp.com' });
}

export function generateSbom(image: ContainerImage, then?: () => void): void {
  const n = sbomPackageCount(image);
  runTask({
    name: `Generate SBOM for ${shortRef(image)}`,
    ext: TPA,
    action: { label: 'Open SBOM', href: detailsHref(image, 'sbom') },
    steps: [
      { label: `syft scan podman:${shortRef(image)} -o cyclonedx-json`, ms: 1600, log: ['✔ Loaded image', '✔ Parsed image', `✔ Cataloged contents  ${n} packages`] },
      { label: 'Writing orders-api-2.3.cdx.json', ms: 400 },
    ],
    onDone: () => {
      const c = chain(image);
      c.sbom = { format: 'cyclonedx', packages: n, source: 'podman-desktop', generated: true, uploaded: false };
      then?.();
    },
  });
}

export function uploadSbom(image: ContainerImage): void {
  const id = `urn:uuid:019a5c2e-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-7c3a-9d11-5b0e2f1a7c41`;
  runTask({
    name: `Upload SBOM of ${shortRef(image)} to TPA`,
    ext: TPA,
    action: { label: 'Open SBOM', href: detailsHref(image, 'sbom') },
    steps: [
      { label: 'Authenticating (client credentials, sso.acme-corp.com)', ms: 600 },
      { label: `POST ${TPA_URL}/api/v2/sbom?labels.source=podman-desktop`, ms: 1200, log: [`→ 201 {"id":"${id}"}`] },
      { label: 'Analyzing with Red Hat VEX', ms: 1400, log: ['14 vulnerabilities · 6 affected · 8 not affected'] },
    ],
    onDone: () => {
      const c = chain(image);
      if (c.sbom) {
        c.sbom.uploaded = true;
        c.sbom.id = id;
        c.sbom.published = new Date().toISOString();
      }
    },
  });
}

export function runConforma(image: ContainerImage): void {
  runTask({
    name: `Validate ${shortRef(image)} with Conforma (@redhat)`,
    ext: EC,
    action: { label: 'Open policy', href: detailsHref(image, 'policy') },
    steps: [
      { label: 'Fetching policy github.com/conforma/policy//policy/release', ms: 700 },
      { label: `ec validate image --image ${image.name}@${digestOf(image)} --output json`, ms: 1600, log: ['ec-version v0.8.71'] },
    ],
    onDone: () => {
      const report = conformaReport(image);
      chain(image).conforma = { at: Date.now(), by: 'Podman Desktop (ec v0.8.71)', report };
      toast({ type: report.success ? 'success' : 'warning', title: report.success ? 'Policy check passed' : `Policy check failed: ${plural(report.violations.length, 'violation')}`, body: shortRef(image) });
    },
  });
}

/** Rebuild payments-api on ubi9 9.8 (fixes CVE-2026-31790). */
export function rebuild(image: ContainerImage): void {
  runTask({
    name: `Rebuild ${shortRef(image)} on ubi9 9.8`,
    ext: EC,
    action: { label: 'Open supply chain', href: detailsHref(image) },
    steps: [
      { label: 'STEP 1/6: FROM registry.access.redhat.com/ubi9/ubi-minimal:9.8', ms: 1200 },
      { label: 'STEP 4/6: RUN microdnf update -y openssl-libs', ms: 1400, log: ['Upgrading: openssl-libs 1:3.2.2-6.el9_6'] },
      { label: 'COMMIT', ms: 600 },
    ],
    onDone: () => {
      chain(image).rebuilt = true;
    },
  });
}

export function runPreflight(image: ContainerImage): void {
  const local = `localhost:5000/${image.name.replace(/^[^/]+\//, '')}:${image.tag}`;
  runTask({
    name: `Run certification checks on ${shortRef(image)}`,
    ext: PF,
    action: { label: 'Open results', href: detailsHref(image) },
    steps: [
      { label: `Pushing to local registry ${local}`, ms: 1300, log: ['podman push --tls-verify=false'] },
      { label: `preflight check container ${local}`, ms: 2200, log: ['Preflight 1.21.1 (4f2a9c1e)', 'Running 8 container checks…'] },
      { label: 'Writing artifacts/amd64/results.json', ms: 300 },
    ],
    onDone: () => {
      const c = chain(image);
      c.preflightRun = true;
      if (c.preflightFixed) c.certificationHash = `cert-${(DIGESTS[refOf(image)] ?? image.id).slice(7, 19)}`;
      c.pushedTo = [...new Set([...(c.pushedTo ?? []), local])];
    },
  });
}

/** One-click Containerfile patch (/licenses + USER 1001), then rebuild + re-check. */
export function applyPreflightFix(image: ContainerImage): void {
  runTask({
    name: `Patch Containerfile and rebuild ${shortRef(image)}`,
    ext: PF,
    action: { label: 'Open results', href: detailsHref(image) },
    steps: [
      { label: 'Patching Containerfile', ms: 500, log: ['+ COPY LICENSE /licenses/LICENSE', '+ USER 1001'] },
      { label: `podman build -t ${shortRef(image)} .`, ms: 1800, log: ['STEP 9/9: USER 1001', 'COMMIT quay.io/acme/orders-api:2.3'] },
      { label: 'Re-running preflight', ms: 1500, log: ['8/8 checks passed'] },
    ],
    onDone: () => {
      const c = chain(image);
      c.preflightFixed = true;
      c.preflightRun = true;
      c.certificationHash = `cert-${(DIGESTS[refOf(image)] ?? image.id).slice(7, 19)}`;
    },
  });
}

export function submitCertification(image: ContainerImage): void {
  runTask({
    name: `Submit ${shortRef(image)} to Partner Connect`,
    ext: PF,
    steps: [
      { label: 'preflight check container --submit --certification-component-id 64f1c0a2e7', ms: 1600, log: ['Results uploaded to Pyxis'] },
    ],
    onDone: () => {
      chain(image).submitted = true;
    },
  });
}

export function isPayments(image: ContainerImage): boolean {
  return refOf(image) === ACME_IMAGES.payments;
}
