<script lang="ts">
/**
 * Image › Supply chain (RHADS pack): one card per member extension
 * (signature, SBOM/TPA, Conforma policy, certification readiness) plus a
 * deploy gate. Cards of disabled members degrade to an "Enable" hint.
 */
import {
  faArrowUpRightFromSquare,
  faCertificate,
  faCircleCheck,
  faCircleXmark,
  faFileContract,
  faListCheck,
  faRocket,
  faSignature,
  faTriangleExclamation,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Spinner } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import { openDialog } from '#lib/dialog.svelte.ts';
import { getExtension, registry } from '#lib/ext/registry.svelte.ts';
import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { type ContainerImage, runTask, toast, world } from '#lib/world.svelte.ts';

import { applyPreflightFix, generateSbom, isPayments, rebuild, runConforma, runPreflight, submitCertification, uploadSbom } from '../actions.ts';
import { chain, lastConforma, peek, preflightChecks, refOf, shortRef, signatureStatus, tpaFindings } from '../supply-chain.ts';
import SignPushDialog from './SignPushDialog.svelte';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const image = $derived(ctx.resource as ContainerImage);
const c = $derived(peek(image));
const sig = $derived(signatureStatus(image));
const provenance = $derived(c.attestations.find(a => a.predicateType.includes('slsa')));
const findings = $derived(tpaFindings(image));
const affected = $derived(findings.filter(f => f.status === 'affected' || f.status === 'under_investigation').length);
const notAffected = $derived(findings.filter(f => f.status === 'not_affected').length);
const policy = $derived(lastConforma(image));
const checks = $derived(preflightChecks(image));
const passedChecks = $derived(checks.filter(x => x.passed).length);
const active = $derived(world.tasks.filter(t => t.status === 'in-progress' && t.name.includes(shortRef(image))).map(t => t.name));
const running = $derived(active.length > 0);
function busy(...prefixes: string[]): boolean {
  return active.some(n => prefixes.some(p => n.startsWith(p)));
}
const blocked = $derived(sig === 'mismatch');
let overrideOpen = $state(false);
let overrideNote = $state('');
let proofOpen = $state<number | undefined>();

const TAS = 'redhat.trusted-artifact-signer';
const TPA = 'redhat.trusted-profile-analyzer';
const EC = 'redhat.conforma';
const PF = 'redhat.preflight';

function on(id: string): boolean {
  return registry.isEnabled(id);
}

function enable(id: string): void {
  registry.enable(id);
}

function openSignPush(): void {
  openDialog(SignPushDialog, { image });
}

function doGenerate(): void {
  generateSbom(image);
}

function doUpload(): void {
  uploadSbom(image);
}

function doConforma(): void {
  runConforma(image);
}

function doRebuild(): void {
  rebuild(image);
}

function doPreflight(): void {
  runPreflight(image);
}

function doFix(): void {
  applyPreflightFix(image);
}

function doSubmit(): void {
  submitCertification(image);
}

function toggleProof(i: number): void {
  proofOpen = proofOpen === i ? undefined : i;
}

function openTab(tab: string): void {
  navigate(`/c/${image.engineId}/images/${image.id}/${tab}`);
}

function deploy(): void {
  runTask({
    name: `Deploy ${shortRef(image)} to kind-dev`,
    ext: 'redhat.rhads-pack',
    steps: [
      { label: 'Verifying signature policy', ms: 600 },
      { label: 'Generating Kubernetes YAML', ms: 700 },
      { label: 'Creating deployment on kind-dev', ms: 1400 },
    ],
  });
}

function openOverride(): void {
  overrideOpen = true;
}

function cancelOverride(): void {
  overrideOpen = false;
}

function confirmOverride(): void {
  const ch = chain(image);
  ch.overrideNote = `${overrideNote || 'No reason given'} — alice.dev@acme-corp.com, ${new Date().toLocaleString()}`;
  overrideOpen = false;
  toast({ type: 'warning', title: 'Deploy check overridden', body: 'An audit note was recorded on the image.' });
  deploy();
}

function setNote(e: Event): void {
  overrideNote = (e.target as HTMLTextAreaElement).value;
}

function fmtTime(sec?: number): string {
  return sec ? new Date(sec * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '';
}

const pills = $derived([
  { id: 'sig', label: 'Signed', ok: sig === 'verified' || sig === 'redhat', bad: sig === 'mismatch', text: sig === 'verified' ? `${c.signatures.length} signature${c.signatures.length > 1 ? 's' : ''}` : sig === 'redhat' ? 'Red Hat key' : sig === 'mismatch' ? 'Identity mismatch' : 'Not signed', ext: TAS },
  { id: 'prov', label: 'Provenance', ok: !!provenance, bad: false, text: provenance ? 'SLSA v1' : 'None', ext: TAS },
  { id: 'sbom', label: 'SBOM in TPA', ok: !!c.sbom?.uploaded, bad: false, text: c.sbom?.uploaded ? `${affected} affected` : c.sbom?.generated ? 'Not uploaded' : 'No SBOM', ext: TPA },
  { id: 'policy', label: 'Policy', ok: !!policy?.report.success, bad: !!policy && !policy.report.success, text: policy ? (policy.report.success ? 'Passed' : `${policy.report.violations.length} violation${policy.report.violations.length > 1 ? 's' : ''}`) : 'Not validated', ext: EC },
  { id: 'cert', label: 'Certification', ok: !!c.preflightRun && passedChecks === checks.length, bad: !!c.preflightRun && passedChecks < checks.length, text: c.preflightRun ? `${passedChecks}/${checks.length} checks` : 'Not checked', ext: PF },
]);
</script>

<div role="region" class="h-full overflow-auto px-5 py-4 space-y-4 text-[var(--pd-content-text)]" aria-label="Supply chain">
  <!-- posture strip -->
  <div role="region" class="grid grid-cols-5 gap-3" aria-label="Supply chain summary">
    {#each pills as p (p.id)}
      <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-3 flex items-center gap-3" class:opacity-50={!on(p.ext)}>
        <span class={p.ok ? 'text-[var(--pd-state-success)]' : p.bad ? 'text-[var(--pd-state-error)]' : 'text-[var(--pd-state-warning)]'}>
          <Icon icon={p.ok ? faCircleCheck : p.bad ? faCircleXmark : faTriangleExclamation} size="lg" />
        </span>
        <div class="min-w-0">
          <div class="text-xs uppercase text-[var(--pd-table-header-text)]">{p.label}</div>
          <div class="font-semibold text-[var(--pd-content-card-header-text)] truncate">{p.text}</div>
        </div>
      </div>
    {/each}
  </div>

  <!-- signature -->
  {@render cardHeader(TAS, faSignature, 'Signature & attestations', 'cosign verify · Rekor transparency log')}
  {#if on(TAS)}
    <section class="rounded-b-lg -mt-4 bg-[var(--pd-content-card-bg)] px-4 pb-4 space-y-2" aria-label="Signature">
      {#if sig === 'redhat'}
        <p class="text-[var(--pd-state-success)]">Verified with the Red Hat release key 199e2f91fd431d51 (registry.access.redhat.com sigstore).</p>
      {:else if c.signatures.length === 0}
        <p>No signatures found for <span class="font-mono">{image.name}@{(image.digest ?? '').slice(0, 19)}…</span></p>
      {:else}
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase text-[var(--pd-table-header-text)]"><tr><th class="py-1 w-8"></th><th class="pr-2">Identity</th><th class="pr-2">Issuer</th><th class="pr-2">Rekor log index</th><th>Signed</th></tr></thead>
          <tbody>
            {#each c.signatures as s, i (i)}
              <tr class="border-t border-[var(--pd-content-divider)]">
                <td class="py-1.5"><span class={s.verified ? 'text-[var(--pd-state-success)]' : 'text-[var(--pd-state-error)]'}><Icon icon={s.verified ? faCircleCheck : faCircleXmark} /></span></td>
                <td class="py-1.5 pr-2 break-all text-[var(--pd-table-body-text-highlight)]">{s.subject}{#if s.error}<div class="text-xs text-[var(--pd-state-error)]">{s.error}</div>{/if}</td>
                <td class="py-1.5 pr-2 break-all">{s.issuer}</td>
                <td class="py-1.5 pr-2">
                  {#if s.logIndex}
                    <button class="text-[var(--pd-link)] hover:underline" aria-label="Rekor entry {s.logIndex}" onclick={toggleProof.bind(undefined, i)}>{s.logIndex}</button>
                  {/if}
                </td>
                <td class="py-1.5">{fmtTime(s.integratedTime)}</td>
              </tr>
              {#if proofOpen === i}
                <tr><td></td><td colspan="4" class="pb-2">
                  <div role="region" class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-2 font-mono text-xs space-y-0.5" aria-label="Inclusion proof">
                    <div>GET {'{rekor}'}/api/v1/log/entries?logIndex={s.logIndex}</div>
                    <div>body: hashedrekord · bundle {s.bundleFormat ?? 'sigstore-bundle-v0.3'}</div>
                    <div>inclusionProof: treeSize 51203377 · rootHash 4f8c…a91e · {s.verified ? 'verified ✓' : 'signature does not match policy identity ✗'}</div>
                  </div>
                </td></tr>
              {/if}
            {/each}
          </tbody>
        </table>
      {/if}
      {#if c.attestations.length}
        <div role="region" class="flex flex-wrap gap-2 text-sm" aria-label="Attestations">
          {#each c.attestations as a (a.logIndex)}
            <span class="rounded-sm px-2 py-0.5 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{a.predicateType.includes('slsa') ? 'SLSA provenance v1' : 'CycloneDX SBOM'} · Rekor {a.logIndex}</span>
          {/each}
        </div>
      {/if}
      {#if sig !== 'redhat'}
        <div class="flex gap-2 pt-1">
          <Button icon={faUpload} onclick={openSignPush} inProgress={busy('Push')}>Sign &amp; push…</Button>
        </div>
      {/if}
    </section>
  {:else}
    {@render enableHint(TAS)}
  {/if}

  <!-- SBOM -->
  {@render cardHeader(TPA, faListCheck, 'SBOM & vulnerabilities', 'syft → Trusted Profile Analyzer · Red Hat VEX')}
  {#if on(TPA)}
    <section class="rounded-b-lg -mt-4 bg-[var(--pd-content-card-bg)] px-4 pb-4 space-y-2" aria-label="SBOM">
      {#if c.sbom?.uploaded}
        <p>
          SBOM <span class="font-mono text-sm">{c.sbom.id}</span> ({c.sbom.format}, {c.sbom.packages} packages, source {c.sbom.source}) —
          <span class="text-[var(--pd-state-error)] font-semibold">{affected} affected</span>, <span class="text-[var(--pd-state-success)]">{notAffected} not affected via VEX</span>, {findings.length} total.
        </p>
        <Button type="secondary" onclick={openTab.bind(undefined, 'sbom')}>Open SBOM</Button>
      {:else if c.sbom?.generated}
        <p>SBOM generated locally ({c.sbom.packages} packages, CycloneDX). Upload it to see vulnerabilities and VEX status.</p>
        <Button icon={faUpload} onclick={doUpload} inProgress={busy('Upload')}>Upload to TPA</Button>
      {:else}
        <p>No SBOM for this image yet.</p>
        <Button onclick={doGenerate} inProgress={busy('Generate')}>Generate SBOM</Button>
      {/if}
    </section>
  {:else}
    {@render enableHint(TPA)}
  {/if}

  <!-- Policy -->
  {@render cardHeader(EC, faFileContract, 'Release policy (Conforma @redhat)', 'ec validate image')}
  {#if on(EC)}
    <section class="rounded-b-lg -mt-4 bg-[var(--pd-content-card-bg)] px-4 pb-4 space-y-2" aria-label="Release policy">
      {#if policy}
        <div class="flex items-center gap-3">
          <span class="rounded-sm px-2 py-0.5 text-sm font-semibold {policy.report.success ? 'bg-[var(--pd-state-success)]' : 'bg-[var(--pd-state-error)]'} text-[var(--pd-status-contrast)]">success: {policy.report.success}</span>
          <span><b class="text-[var(--pd-state-success)]">{policy.report.successes.length}</b> successes · <b class="text-[var(--pd-state-warning)]">{policy.report.warnings.length}</b> warnings · <b class="text-[var(--pd-state-error)]">{policy.report.violations.length}</b> violations</span>
          <span class="text-sm text-[var(--pd-content-sub-header)] ml-auto">{policy.by} · {new Date(policy.at).toLocaleString()}</span>
        </div>
        {#each policy.report.violations as v (v.code)}
          <div class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-2 text-sm">
            <div class="text-[var(--pd-state-error)] font-semibold">{v.code}</div>
            <div>{v.msg}</div>
            {#if v.solution}<div class="text-[var(--pd-content-sub-header)]">Solution: {v.solution}</div>{/if}
            {#if v.code === 'cve.cve_blockers' && isPayments(image)}
              <div class="mt-1 flex gap-2"><Button type="secondary" onclick={doRebuild} inProgress={busy('Rebuild')}>Rebuild on ubi9 9.8</Button></div>
            {/if}
            {#if v.code === 'builtin.image.signature_check'}
              <div class="mt-1"><Button type="secondary" onclick={openSignPush}>Sign with RHTAS</Button></div>
            {/if}
          </div>
        {/each}
      {:else}
        <p>Not validated yet against the <span class="font-mono">@redhat</span> collection.</p>
      {/if}
      <div class="flex gap-2"><Button onclick={doConforma} inProgress={busy('Validate', 'Rebuild')}>{policy ? 'Validate again' : 'Validate release policy'}</Button><Button type="link" onclick={openTab.bind(undefined, 'policy')}>All results</Button></div>
    </section>
  {:else}
    {@render enableHint(EC)}
  {/if}

  <!-- Preflight -->
  {@render cardHeader(PF, faCertificate, 'Certification readiness', 'preflight check container 1.21.1')}
  {#if on(PF)}
    <section class="rounded-b-lg -mt-4 bg-[var(--pd-content-card-bg)] px-4 pb-4 space-y-2" aria-label="Certification readiness">
      {#if c.preflightRun}
        <div class="flex items-center gap-3">
          <span class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">{passedChecks}/{checks.length} checks passed</span>
          {#if c.certificationHash}<span class="rounded-sm px-2 py-0.5 text-sm bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]">certification_hash {c.certificationHash}</span>{/if}
          {#if c.submitted}<span class="text-sm text-[var(--pd-state-success)]">Submitted to Partner Connect</span>{/if}
        </div>
        <ul class="grid grid-cols-2 gap-x-6 gap-y-1" aria-label="Preflight checks">
          {#each checks as ch (ch.name)}
            <li class="flex items-start gap-2 text-sm">
              <span class={ch.passed ? 'text-[var(--pd-state-success)]' : 'text-[var(--pd-state-error)]'}><Icon icon={ch.passed ? faCircleCheck : faCircleXmark} /></span>
              <span><span class="font-semibold text-[var(--pd-table-body-text-highlight)]">{ch.name}</span>{#if ch.suggestion}<span class="block text-[var(--pd-content-sub-header)]">{ch.suggestion}</span>{/if}</span>
            </li>
          {/each}
        </ul>
        <div class="flex gap-2 pt-1">
          {#if passedChecks < checks.length && checks.some(x => !x.passed && (x.name === 'HasLicense' || x.name === 'RunAsNonRoot'))}
            <Button onclick={doFix} inProgress={busy('Patch')}>Apply suggested Containerfile fix</Button>
          {/if}
          {#if passedChecks === checks.length && !c.submitted}
            <Button onclick={doSubmit} inProgress={busy('Submit')}>Submit to Partner Connect</Button>
          {/if}
          <Button type="secondary" onclick={doPreflight} inProgress={busy('Run certification', 'Patch')}>Run again</Button>
        </div>
      {:else}
        <p>Runs the Red Hat container certification checks. The image is pushed to the local registry first (preflight needs a registry reference).</p>
        <Button onclick={doPreflight} inProgress={busy('Run certification', 'Patch')}>Run certification checks</Button>
      {/if}
    </section>
  {:else}
    {@render enableHint(PF)}
  {/if}

  <!-- deploy gate -->
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 space-y-2" aria-label="Deploy gate">
    <div class="flex items-center gap-2">
      <Icon icon={faRocket} />
      <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] grow">Deploy to Kubernetes</h2>
    </div>
    {#if blocked}
      <p class="text-[var(--pd-state-error)]">Blocked: the Signature check reported an error (certificate identity mismatch). Error-severity checks block deploy actions (P5).</p>
      {#if overrideOpen}
        <label for="override-note" class="block text-sm font-semibold">Audit note (required to override)</label>
        <textarea id="override-note" class="w-full h-16 rounded-md bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] p-2 text-[var(--pd-input-field-focused-text)]" aria-label="Audit note" oninput={setNote}></textarea>
        <div class="flex gap-2"><Button type="link" onclick={cancelOverride}>Cancel</Button><Button type="danger" disabled={!overrideNote} onclick={confirmOverride}>Override and deploy</Button></div>
      {:else}
        <div class="flex gap-2"><Button disabled>Deploy to kind-dev</Button><Button type="secondary" onclick={openOverride}>Override…</Button></div>
      {/if}
    {:else}
      <p>All error-severity checks passed for {shortRef(image)}.</p>
      <Button onclick={deploy}>Deploy to kind-dev</Button>
    {/if}
    {#if c.overrideNote}<p class="text-sm text-[var(--pd-state-warning)]">Override recorded: {c.overrideNote}</p>{/if}
  </section>
  {#if running}<div class="flex items-center gap-2 text-sm"><Spinner size="1em" /> A task is running for {refOf(image)} – see the task manager.</div>{/if}
</div>

{#snippet cardHeader(extId: string, icon: typeof faSignature, title: string, sub: string)}
  {@const e = getExtension(extId)}
  <div class="rounded-t-lg bg-[var(--pd-content-card-bg)] px-4 pt-4 pb-2 flex items-center gap-2" class:rounded-b-lg={!on(extId)}>
    <Icon icon={icon} />
    <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">{title}</h2>
    <span class="text-sm text-[var(--pd-content-sub-header)]">{sub}</span>
    <span class="ml-auto flex items-center gap-1 text-xs text-[var(--pd-content-sub-header)]"><AppIcon icon={e?.icon} size="14px" />{e?.displayName ?? extId}</span>
  </div>
{/snippet}

{#snippet enableHint(extId: string)}
  {@const e = getExtension(extId)}
  <div class="-mt-4 rounded-b-lg bg-[var(--pd-content-card-bg)] px-4 pb-4 flex items-center gap-3 text-sm">
    <span class="grow">{e ? `${e.displayName} is disabled.` : 'Not installed.'}</span>
    {#if e}<Button type="secondary" icon={faArrowUpRightFromSquare} onclick={enable.bind(undefined, extId)}>Enable {e.displayName}</Button>{/if}
  </div>
{/snippet}
