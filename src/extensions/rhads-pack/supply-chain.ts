/**
 * Shared supply-chain model of the ACME fixtures (platform scenario), used by
 * the RHADS member extensions (RHTAS, TPA, Conforma, preflight, Konflux) and
 * the pack's aggregated "Supply chain" tab. State lives in `world.ext` under
 * `acme.supply-chain`, keyed by image reference, so it persists per scenario.
 *
 * Data shapes and values come from docs/research (redhat.trusted-artifact-signer,
 * redhat.trusted-profile-analyzer, redhat.conforma, redhat.preflight).
 */
import { mkImage } from '#lib/ext/helpers.ts';
import type { Finding } from '#lib/ext/types.ts';
import { type ContainerImage, extData, shortImage, world, type World } from '#lib/world.svelte.ts';

export const SC = 'acme.supply-chain';
export const ENGINE = 'podman-machine-default';

export const RHTAS = {
  version: '1.4.3',
  tufUrl: 'https://tuf-trusted-artifact-signer.apps.ocp.acme-corp.com',
  fulcioUrl: 'https://fulcio-server-trusted-artifact-signer.apps.ocp.acme-corp.com',
  rekorUrl: 'https://rekor-server-trusted-artifact-signer.apps.ocp.acme-corp.com',
  oidcIssuer: 'https://sso.acme-corp.com/realms/trusted-artifact-signer',
};

export const TPA_URL = 'https://tpa.apps.ocp.acme-corp.com';

export interface Signature {
  subject: string;
  issuer: string;
  logIndex?: number;
  integratedTime?: number;
  verified: boolean;
  error?: string;
  bundleFormat?: string;
}

export interface Attestation {
  predicateType: string;
  logIndex: number;
}

export interface SbomState {
  id?: string;
  format: 'cyclonedx' | 'spdx';
  packages: number;
  source: 'podman-desktop' | 'konflux' | 'redhat';
  generated: boolean;
  uploaded: boolean;
  published?: string;
}

export interface ImageChain {
  signatures: Signature[];
  attestations: Attestation[];
  sbom?: SbomState;
  /** payments-api rebuilt on ubi9 9.8 (fixes CVE-2026-31790). */
  rebuilt?: boolean;
  /** Containerfile patch applied (/licenses + USER 1001). */
  preflightFixed?: boolean;
  preflightRun?: boolean;
  certificationHash?: string;
  submitted?: boolean;
  pushedTo?: string[];
  /** Last `ec validate image` snapshot (payments-api: validated by the Konflux release pipeline). */
  conforma?: { at: number; by: string; report: ConformaReport };
  /** Audit note when a blocked deploy was overridden. */
  overrideNote?: string;
}

export const ACME_IMAGES = {
  payments: 'quay.io/acme/payments-api:1.5.0',
  orders: 'quay.io/acme/orders-api:2.3',
  ledger: 'quay.io/acme/ledger-worker:0.9.2',
  legacy: 'quay.io/acme/legacy-portal:1.9',
} as const;

export const DIGESTS: Record<string, string> = {
  [ACME_IMAGES.payments]: 'sha256:2a9e4c7b1d3f5a8c0e2b4d6f8a1c3e5b7d9f0a2c4e6b8d1f3a5c7e9b0d2f4a6c',
  [ACME_IMAGES.orders]: 'sha256:7f3c1d9a5e2b48c0a1d3f5b7c9e1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7',
  [ACME_IMAGES.ledger]: 'sha256:9c0de1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e',
  [ACME_IMAGES.legacy]: 'sha256:41d07e6c2b9a8f1e3d5c7b9a1f3e5d7c9b1a3f5e7d9c1b3a5f7e9d1c3b5a7f9e',
};

export function refOf(image: ContainerImage): string {
  return `${image.name}:${image.tag}`;
}

export function shortRef(image: ContainerImage): string {
  return `${shortImage(image.name)}:${image.tag}`;
}

export function isAcme(image: ContainerImage): boolean {
  return image.name.startsWith('quay.io/acme/') || image.name.startsWith('localhost:5000/acme/');
}

export function isRedHat(image: ContainerImage): boolean {
  return /^registry\.(access\.)?redhat\.io\//.test(image.name);
}

function initialChain(ref: string): ImageChain {
  switch (ref) {
    case ACME_IMAGES.payments:
      return {
        signatures: [
          {
            subject: 'https://github.com/acme/payments/.github/workflows/release.yml@refs/tags/v1.5.0',
            issuer: 'https://token.actions.githubusercontent.com',
            logIndex: 48190021,
            integratedTime: 1791371312,
            verified: true,
            bundleFormat: 'sigstore-bundle-v0.3',
          },
          { subject: 'bob.ops@acme-corp.com', issuer: RHTAS.oidcIssuer, logIndex: 48190555, integratedTime: 1791372001, verified: true, bundleFormat: 'sigstore-bundle-v0.3' },
        ],
        attestations: [
          { predicateType: 'https://slsa.dev/provenance/v1', logIndex: 48190022 },
          { predicateType: 'https://cyclonedx.org/bom', logIndex: 48190023 },
        ],
        sbom: { id: 'urn:uuid:019a4f10-2b33-7aa1-8e02-1f7c3d9e0b55', format: 'spdx', packages: 287, source: 'konflux', generated: true, uploaded: true, published: '2026-10-06T16:02:10Z' },
      };
    case ACME_IMAGES.ledger:
      return {
        signatures: [{ subject: 'ci-bot@acme-corp.com', issuer: RHTAS.oidcIssuer, logIndex: 47002310, verified: false, error: 'certificate identity mismatch: expected release@acme-corp.com' }],
        attestations: [],
      };
    default:
      return { signatures: [], attestations: [] };
  }
}

/** Last Conforma result: stored snapshot, or the Konflux one for payments-api. */
export function lastConforma(image: ContainerImage): { at: number; by: string; report: ConformaReport } | undefined {
  const c = peek(image);
  if (c.conforma) return c.conforma;
  if (refOf(image) === ACME_IMAGES.payments) return { at: Date.parse('2026-10-08T09:30:00Z'), by: 'Konflux release pipeline (payments-enterprise-contract-5tq2z)', report: conformaReport(image) };
  return undefined;
}

/** Mutable chain state of an image (created on first access). */
export function chain(image: ContainerImage | string): ImageChain {
  const ref = typeof image === 'string' ? image : refOf(image);
  const all = extData<Record<string, ImageChain>>(SC, 'images', {});
  all[ref] ??= initialChain(ref);
  return all[ref];
}

/** Read-only view (no write during render; unknown images get their initial state). */
export function peek(image: ContainerImage): ImageChain {
  const ref = refOf(image);
  return (world.ext[SC]?.images as Record<string, ImageChain> | undefined)?.[ref] ?? initialChain(ref);
}

/** Seed the ACME images once (idempotent; called by every member's seed). */
export function ensureAcmeImages(world: World): void {
  const has = (name: string, tag: string): boolean => world.images.some(i => i.name === name && i.tag === tag && i.engineId === ENGINE);
  const add = (img: ContainerImage, ref: string): void => {
    if (!has(img.name, img.tag)) world.images.push({ ...img, digest: DIGESTS[ref] ?? img.digest });
  };
  add(
    mkImage(ENGINE, {
      name: 'quay.io/acme/payments-api',
      tag: '1.5.0',
      sizeMB: 318,
      ageD: 2,
      base: 'ubi9',
      labels: { name: 'acme/payments-api', vendor: 'ACME Corp', version: '1.5.0', maintainer: 'payments@acme-corp.com', 'org.opencontainers.image.source': 'https://github.com/acme/payments' },
    }),
    ACME_IMAGES.payments,
  );
  add(
    mkImage(ENGINE, {
      name: 'quay.io/acme/orders-api',
      tag: '2.3',
      sizeMB: 402,
      ageD: 0,
      base: 'ubi9',
      labels: { name: 'acme/orders-api', vendor: 'ACME Corp', version: '2.3', release: '1', summary: 'ACME orders REST API', description: 'Quarkus orders service' },
    }),
    ACME_IMAGES.orders,
  );
  add(mkImage(ENGINE, { name: 'quay.io/acme/ledger-worker', tag: '0.9.2', sizeMB: 156, ageD: 6, base: 'ubi9' }), ACME_IMAGES.ledger);
  add(mkImage(ENGINE, { name: 'quay.io/acme/legacy-portal', tag: '1.9', sizeMB: 189, ageD: 400, base: 'alpine-3.18', labels: { maintainer: 'web@acme-corp.com' } }), ACME_IMAGES.legacy);
}

/* ------------------------------------------------------------------ */
/* Signature (RHTAS)                                                   */
/* ------------------------------------------------------------------ */

export type SignatureStatus = 'verified' | 'redhat' | 'mismatch' | 'unsigned';

export function signatureStatus(image: ContainerImage): SignatureStatus {
  if (isRedHat(image)) return 'redhat';
  const c = peek(image);
  if (c.signatures.some(s => !s.verified)) return 'mismatch';
  if (c.signatures.some(s => s.verified)) return 'verified';
  return 'unsigned';
}

export function signatureFindings(image: ContainerImage): Finding[] {
  const status = signatureStatus(image);
  const c = peek(image);
  if (status === 'redhat') {
    return [{ id: 'sig-rh', ruleId: 'signature.verified', title: 'Signed by Red Hat release key 199e2f91fd431d51', severity: 'success' }];
  }
  if (status === 'mismatch') {
    const bad = c.signatures.find(s => !s.verified);
    return [
      {
        id: 'sig-mismatch',
        ruleId: 'signature.identity-mismatch',
        title: bad?.error ?? 'Certificate identity mismatch',
        severity: 'critical',
        description: `Signed by ${bad?.subject ?? 'unknown'} (Rekor ${bad?.logIndex ?? '—'}). Deploy actions are blocked by this error-severity check.`,
      },
    ];
  }
  if (status === 'unsigned') {
    return [{ id: 'sig-missing', ruleId: 'signature.missing', title: 'No signatures found', severity: 'high', description: 'Sign with RHTAS before pushing to a release registry.' }];
  }
  return c.signatures.map((s, i) => ({
    id: `sig-${i}`,
    ruleId: 'signature.verified',
    title: `Signed by ${s.subject}`,
    severity: 'success' as const,
    description: `Issuer ${s.issuer} · Rekor log index ${s.logIndex}`,
  }));
}

/* ------------------------------------------------------------------ */
/* SBOM + vulnerabilities (TPA)                                        */
/* ------------------------------------------------------------------ */

export interface TpaFinding {
  purl: string;
  vulnerability: string;
  advisory?: string;
  status: 'affected' | 'fixed' | 'not_affected' | 'under_investigation';
  fixed?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  score?: number;
  justification?: string;
}

const ORDERS_FINDINGS: TpaFinding[] = [
  { purl: 'pkg:rpm/redhat/openssl-libs@3.2.2-6.el9_5?arch=x86_64', vulnerability: 'CVE-2026-31790', advisory: 'RHSA-2026:4412', status: 'affected', fixed: '3.2.2-6.el9_6', severity: 'high', score: 7.5 },
  { purl: 'pkg:rpm/redhat/glibc@2.34-168.el9_6?arch=x86_64', vulnerability: 'CVE-2026-0915', status: 'affected', severity: 'medium', score: 5.9 },
  { purl: 'pkg:pypi/urllib3@1.26.18', vulnerability: 'CVE-2026-2241', status: 'affected', fixed: '2.5.1', severity: 'medium', score: 6.1 },
  { purl: 'pkg:pypi/jinja2@3.1.4', vulnerability: 'CVE-2025-27516', status: 'affected', fixed: '3.1.6', severity: 'medium' },
  { purl: 'pkg:rpm/redhat/curl-minimal@7.76.1-31.el9', vulnerability: 'CVE-2026-2241', status: 'under_investigation', severity: 'low' },
  { purl: 'pkg:rpm/redhat/libxml2@2.9.13-9.el9', vulnerability: 'CVE-2026-0990', status: 'affected', severity: 'low' },
  { purl: 'pkg:rpm/redhat/python3@3.9.21-2.el9', vulnerability: 'CVE-2026-1299', status: 'not_affected', justification: 'vulnerable_code_not_in_execute_path', severity: 'medium' },
  { purl: 'pkg:rpm/redhat/libxml2@2.9.13-9.el9', vulnerability: 'CVE-2025-49794', status: 'not_affected', justification: 'vulnerable_code_not_present', severity: 'high' },
  { purl: 'pkg:rpm/redhat/sqlite-libs@3.34.1-7.el9', vulnerability: 'CVE-2025-6965', status: 'not_affected', justification: 'vulnerable_code_not_in_execute_path', severity: 'medium' },
  { purl: 'pkg:rpm/redhat/expat@2.5.0-3.el9', vulnerability: 'CVE-2026-24515', status: 'not_affected', justification: 'inline_mitigations_already_exist', severity: 'low' },
  { purl: 'pkg:rpm/redhat/systemd-libs@252-51.el9', vulnerability: 'CVE-2025-4598', status: 'not_affected', justification: 'component_not_present', severity: 'medium' },
  { purl: 'pkg:rpm/redhat/pam@1.5.1-23.el9', vulnerability: 'CVE-2025-6020', status: 'not_affected', justification: 'vulnerable_code_not_in_execute_path', severity: 'high' },
  { purl: 'pkg:rpm/redhat/krb5-libs@1.21.1-6.el9', vulnerability: 'CVE-2025-3576', status: 'not_affected', justification: 'vulnerable_code_cannot_be_controlled_by_adversary', severity: 'medium' },
  { purl: 'pkg:rpm/redhat/libgcrypt@1.10.0-11.el9', vulnerability: 'CVE-2024-2236', status: 'not_affected', justification: 'vulnerable_code_not_in_execute_path', severity: 'medium' },
];

const PAYMENTS_FINDINGS: TpaFinding[] = [
  { purl: 'pkg:rpm/redhat/openssl-libs@3.2.2-6.el9_5?arch=x86_64', vulnerability: 'CVE-2026-31790', advisory: 'RHSA-2026:4412', status: 'affected', fixed: '3.2.2-6.el9_6', severity: 'high', score: 7.5 },
  { purl: 'pkg:rpm/redhat/glibc@2.34-168.el9_6?arch=x86_64', vulnerability: 'CVE-2026-0915', status: 'affected', severity: 'medium', score: 5.9 },
  { purl: 'pkg:rpm/redhat/python3@3.9.21-2.el9', vulnerability: 'CVE-2026-1299', status: 'not_affected', justification: 'vulnerable_code_not_in_execute_path', severity: 'medium' },
];

export function tpaFindings(image: ContainerImage): TpaFinding[] {
  const c = peek(image);
  if (!c.sbom?.uploaded) return [];
  const ref = refOf(image);
  let list: TpaFinding[] = [];
  if (ref === ACME_IMAGES.orders) list = ORDERS_FINDINGS;
  else if (ref === ACME_IMAGES.payments) list = PAYMENTS_FINDINGS;
  else list = PAYMENTS_FINDINGS.slice(1);
  if (c.rebuilt) list = list.map(f => (f.vulnerability === 'CVE-2026-31790' ? { ...f, status: 'fixed' as const } : f));
  if (c.preflightFixed) list = list.map(f => (f.purl.startsWith('pkg:pypi/') ? { ...f, status: 'fixed' as const } : f));
  return list;
}

export function tpaAsFindings(image: ContainerImage): Finding[] {
  return tpaFindings(image).map(f => ({
    id: `${f.vulnerability}-${f.purl}`,
    title: f.advisory ? `${f.advisory} (${f.purl.split('@')[0].replace('pkg:', '')})` : (f.justification?.replaceAll('_', ' ') ?? 'Vulnerability reported by Red Hat VEX'),
    severity: f.status === 'fixed' ? 'info' : f.severity,
    cve: f.vulnerability,
    package: f.purl.split('?')[0],
    fixedIn: f.fixed,
    vexStatus: f.status,
    advisoryUrl: `https://access.redhat.com/security/cve/${f.vulnerability}`,
  }));
}

export function sbomPackageCount(image: ContainerImage): number {
  const ref = refOf(image);
  if (ref === ACME_IMAGES.orders) return 412;
  if (ref === ACME_IMAGES.payments) return 287;
  return Math.max(24, Math.round(image.size / (1024 * 1024 * 1.4)));
}

/* ------------------------------------------------------------------ */
/* Conforma                                                            */
/* ------------------------------------------------------------------ */

export interface PolicyResult {
  msg: string;
  code: string;
  title?: string;
  term?: string;
  solution?: string;
}

export interface ConformaReport {
  success: boolean;
  violations: PolicyResult[];
  warnings: PolicyResult[];
  successes: PolicyResult[];
}

const SUCCESS_CODES = [
  'builtin.image.signature_check',
  'builtin.attestation.signature_check',
  'builtin.attestation.syntax_check',
  'attestation_type.known_attestation_type',
  'slsa_provenance_available.attestation_predicate_type_accepted',
  'trusted_task.trusted',
  'tasks.required_tasks_found',
  'test.test_results_found',
  'labels.required_labels',
  'base_image_registries.base_image_permitted',
];

/** `ec validate image --policy @redhat` result, computed from the chain state. */
export function conformaReport(image: ContainerImage): ConformaReport {
  const c = peek(image);
  const sig = signatureStatus(image);
  const violations: PolicyResult[] = [];
  const warnings: PolicyResult[] = [];
  const passed = new Set(SUCCESS_CODES);
  if (sig === 'unsigned' || sig === 'mismatch') {
    violations.push({
      msg: sig === 'mismatch' ? 'Image signature identity does not match the policy identity release@acme-corp.com' : 'No image signatures found matching the given public key or identity',
      code: 'builtin.image.signature_check',
      title: 'Image signature check',
      solution: 'Sign the image with RHTAS (cosign sign) using an identity allowed by the policy.',
    });
    passed.delete('builtin.image.signature_check');
  }
  const hasProvenance = c.attestations.some(a => a.predicateType.includes('slsa'));
  const hasAnyAttestation = c.attestations.length > 0;
  if (!hasAnyAttestation) {
    violations.push({ msg: 'Missing attestation of known type', code: 'attestation_type.known_attestation_type', title: 'Known attestation type', solution: 'Attach an SBOM (CycloneDX) or SLSA provenance attestation with cosign attest, or build in Konflux.' });
    ['attestation_type.known_attestation_type', 'builtin.attestation.signature_check', 'builtin.attestation.syntax_check'].forEach(x => passed.delete(x));
  }
  if (!hasProvenance) {
    warnings.push({ msg: 'No SLSA provenance attestation found; trusted task checks skipped', code: 'slsa_provenance_available.attestation_predicate_type_accepted', solution: 'Build in Konflux to get Tekton Chains provenance.' });
    ['slsa_provenance_available.attestation_predicate_type_accepted', 'trusted_task.trusted', 'tasks.required_tasks_found', 'test.test_results_found'].forEach(x => passed.delete(x));
  }
  if (refOf(image) === ACME_IMAGES.payments && !c.rebuilt) {
    violations.push({
      msg: 'Found "CVE-2026-31790" vulnerability of high security level',
      code: 'cve.cve_blockers',
      title: 'Blocking CVE check',
      term: 'CVE-2026-31790',
      solution: "Make sure to address any CVE's categorized as 'critical' or 'high'. Fixed in RHSA-2026:4412 — rebuild on ubi9 9.8.",
    });
  }
  if (refOf(image) === ACME_IMAGES.payments || refOf(image) === ACME_IMAGES.orders) {
    warnings.push({ msg: 'Found "CVE-2026-0915" vulnerability of medium security level', code: 'cve.cve_warnings', term: 'CVE-2026-0915' });
  }
  if (image.labels?.maintainer) {
    warnings.push({ msg: 'The "maintainer" label is deprecated, use "vendor"', code: 'labels.deprecated_labels', term: 'maintainer' });
  }
  if (!image.base?.startsWith('ubi')) {
    violations.push({ msg: `Base image ${image.base ?? 'unknown'} is not from an allowed registry`, code: 'base_image_registries.base_image_permitted', title: 'Base image permitted', solution: 'Rebase on registry.access.redhat.com/ubi9.' });
    passed.delete('base_image_registries.base_image_permitted');
  }
  const successes = [...passed].map(code => ({ msg: 'Pass', code }));
  // pad to the 41 checks of the @redhat collection
  const extra = refOf(image) === ACME_IMAGES.payments ? 41 - successes.length : 0;
  for (let i = 0; i < extra; i++) successes.push({ msg: 'Pass', code: `redhat.rule_${String(i + 1).padStart(2, '0')}` });
  return { success: violations.length === 0, violations, warnings, successes };
}

export function conformaAsFindings(image: ContainerImage): Finding[] {
  const r = conformaReport(image);
  return [
    ...r.violations.map(v => ({ id: `v-${v.code}`, ruleId: v.code, title: v.msg, severity: 'high' as const, description: v.solution })),
    ...r.warnings.map(w => ({ id: `w-${w.code}-${w.term ?? ''}`, ruleId: w.code, title: w.msg, severity: 'low' as const })),
  ];
}

/* ------------------------------------------------------------------ */
/* Preflight                                                           */
/* ------------------------------------------------------------------ */

export interface PreflightCheck {
  name: string;
  description: string;
  passed: boolean;
  elapsed: number;
  suggestion?: string;
}

const CHECKS: { name: string; description: string; elapsed: number }[] = [
  { name: 'HasLicense', description: 'Checking if terms and conditions applicable to the software including open source licensing information are present.', elapsed: 1 },
  { name: 'HasUniqueTag', description: "Checking if container has a tag other than 'latest', so that the image can be uniquely identified.", elapsed: 182 },
  { name: 'LayerCountAcceptable', description: 'Checking if container has less than 40 layers.', elapsed: 0 },
  { name: 'HasNoProhibitedPackages', description: 'Checks to ensure that the image in use does not include prohibited packages, such as RHEL kernel packages.', elapsed: 611 },
  { name: 'HasRequiredLabel', description: 'Checking if the required labels (name, vendor, version, release, summary, description) are present.', elapsed: 0 },
  { name: 'RunAsNonRoot', description: 'Checking if container runs as the root user.', elapsed: 0 },
  { name: 'HasModifiedFiles', description: 'Checks that no files installed via RPM in the base Red Hat layer have been modified.', elapsed: 2304 },
  { name: 'BasedOnUbi', description: "Checking if the container's base image is based upon the Red Hat Universal Base Image (UBI).", elapsed: 95 },
];

const SUGGESTIONS: Record<string, string> = {
  HasLicense: 'Create a directory named /licenses and include all relevant licensing and/or terms and conditions as text file(s) in that directory.',
  RunAsNonRoot: 'Indicate a specific USER in the dockerfile or containerfile',
  BasedOnUbi: 'Rebase on registry.access.redhat.com/ubi9/nodejs-22.',
  HasRequiredLabel: 'Add the labels name, vendor, version, release, summary and description.',
};

export function preflightChecks(image: ContainerImage): PreflightCheck[] {
  const c = peek(image);
  const ubi = !!image.base?.startsWith('ubi');
  const labels = image.labels ?? {};
  const hasLabels = ['name', 'vendor', 'version', 'release', 'summary', 'description'].every(l => labels[l]);
  return CHECKS.map(ch => {
    let passed = true;
    if (ch.name === 'HasLicense' || ch.name === 'RunAsNonRoot') passed = !!c.preflightFixed || refOf(image) === ACME_IMAGES.payments;
    if (ch.name === 'BasedOnUbi') passed = ubi;
    if (ch.name === 'HasRequiredLabel') passed = hasLabels || !!c.preflightFixed;
    if (ch.name === 'HasUniqueTag') passed = image.tag !== 'latest';
    return { ...ch, passed, suggestion: passed ? undefined : SUGGESTIONS[ch.name] };
  });
}

export function preflightAsFindings(image: ContainerImage): Finding[] {
  return preflightChecks(image)
    .filter(c => !c.passed)
    .map(c => ({ id: c.name, ruleId: c.name, title: c.suggestion ?? c.description, severity: 'medium' as const, description: c.description, advisoryUrl: 'https://access.redhat.com/documentation/en-us/red_hat_software_certification/' }));
}
