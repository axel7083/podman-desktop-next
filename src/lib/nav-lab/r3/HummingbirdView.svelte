<script lang="ts">
/**
 * Hummingbird (Red Hat Hardened Images) extension tabs, mirroring the real
 * extension pages: Overview, Catalog (hardened images, labelled "Pull image"
 * per row), a hardened image (Summary | Inspect), Alternatives (local images
 * with a hardened alternative) and the comparison of a local image with its
 * alternative (current vs hardened, "Rebuild on hardened image" task).
 */
import { faArrowCircleDown, faArrowsRotate, faBookOpen, faCodeCompare, faCopy, faHammer } from '@fortawesome/free-solid-svg-icons';

import ImageIcon from '#lib/images/ImageIcon.svelte';

import { conn as findConn, type LabTarget, resource } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import type { LabRow } from './cells/types.ts';
import CodeView from './CodeView.svelte';
import { imageInfo } from './details.ts';
import { altFor, cveTotal, HB_ALTS, HB_CATALOG, type HardenedImage, hbImage, hbNodeId, hbRef, type HbAlternative, mb } from './hb-data.ts';
import Head from './Head.svelte';
import { openAlternative, pullHardened, pullState, rebuildOnHardened, rebuildState, rebuiltName } from './hummingbird.ts';
import KV from './KV.svelte';
import { live, type MenuItem, resActions, resStatus } from './live.svelte.ts';
import ModernTable from './ModernTable.svelte';
import Section from './Section.svelte';
import SegFilter from './SegFilter.svelte';
import StatGrid from './StatGrid.svelte';
import { type FoundNode, OVERVIEW_ICON } from './trees.ts';

interface Props {
  f: FoundNode;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { f, onopen }: Props = $props();

let search = $state('');
let cat = $state('all');
let view = $state('summary');
let analyzing = $state(false);

const PROV = 'Hummingbird';
const connId = $derived(f.connId);
const shape = $derived.by((): 'overview' | 'catalog' | 'alternatives' | 'image' | 'compare' => {
  const n = f.node;
  if (n.data?.hb) return 'image';
  if (n.data?.local) return 'compare';
  if (n.label === 'Catalog' && f.path.length === 1) return 'catalog';
  if (n.label === 'Alternatives' && f.path.length === 1) return 'alternatives';
  return 'overview';
});
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');
const img = $derived(hbImage(f.node.data?.hb));
const alt = $derived(altFor(f.node.data?.local));
const altImg = $derived(hbImage(alt?.hb));

const pct = (from: number, to: number): string => `−${Math.round((1 - to / Math.max(1, from)) * 100)}%`;
const localRes = (local: string): ReturnType<typeof resource> => resource(`${connId}/images/${local}`);
const alts = $derived(HB_ALTS.filter(a => !live.deleted.includes(`${connId}/images/${a.local}`)));

function openNode(path: string[], preview = true): void {
  onopen({ kind: 'node', connId, nodeId: hbNodeId(connId, ...path) }, { preview });
}

function openImage(h: HardenedImage, preview = true): void {
  openNode(['Catalog', `hummingbird/${h.name}`], preview);
}

function openLocal(local: string): void {
  const r = localRes(local);
  if (r) onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

function openRebuilt(local: string): void {
  const r = resource(`${connId}/images/${rebuiltName(local)}`);
  if (r) onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

function pullLabel(h: HardenedImage, tag = h.tags[0]): string {
  const s = pullState(h, tag);
  return s === 'pulled' ? 'Pulled' : s === 'pulling' ? 'Pulling…' : 'Pull image';
}

function imageMenu(h: HardenedImage): MenuItem[] {
  return [
    { label: 'Open', run: (): void => openImage(h, false) },
    { label: 'Pull image', icon: faArrowCircleDown, disabled: !!pullState(h), run: (): void => pullHardened(h, connId), sep: true },
    { label: 'Copy image reference', icon: faCopy, run: (): void => void navigator.clipboard?.writeText(hbRef(h)).catch(() => undefined) },
  ];
}

function altMenu(a: HbAlternative): MenuItem[] {
  return [
    { label: 'Compare', icon: faCodeCompare, run: (): void => openAlternative(a.local, connId, onopen) },
    { label: 'Rebuild on hardened image', icon: faHammer, disabled: rebuildState(a.local) === 'rebuilding', run: (): void => rebuildOnHardened(a.local, connId), sep: true },
    { label: 'Open local image', icon: ImageIcon, run: (): void => openLocal(a.local) },
  ];
}

const catalogRows = $derived.by((): LabRow[] => {
  void live.status;
  const t = search.toLowerCase();
  return HB_CATALOG.filter(h => (cat === 'all' || h.category === cat) && (!t || h.name.includes(t) || h.description.toLowerCase().includes(t))).map(h => ({
    name: `hb:${h.name}`,
    status: pullState(h) === 'pulled' ? 'USED' : 'UNUSED',
    icon: ImageIcon,
    title: `hummingbird/${h.name}`,
    sub: [h.description],
    cols: { tags: h.tags.join(', '), variants: h.variants.join(', '), cves: '0', size: mb(h.sizeMB), arch: h.arch.join(', '), updated: h.updated },
    open: (): void => openImage(h),
    pin: (): void => openImage(h, false),
    buttons: [{ title: pullLabel(h), icon: faArrowCircleDown, label: true, enabled: !pullState(h), run: (): void => pullHardened(h, connId) }],
    menu: (): MenuItem[] => imageMenu(h),
  }));
});

function altRow(a: HbAlternative): LabRow {
  const h = hbImage(a.hb)!;
  const done = rebuildState(a.local) === 'rebuilt';
  return {
    name: `alt:${a.local}`,
    status: done ? 'RUNNING' : a.cves.critical ? 'CRITICAL' : 'HIGH',
    icon: ImageIcon,
    title: a.local,
    sub: [a.base],
    cols: { alt: `hummingbird/${h.name}:${h.tags[0]}`, cves: `${cveTotal(a)} → 0`, size: `${mb(a.sizeMB)} → ${mb(h.sizeMB)} (${pct(a.sizeMB, h.sizeMB)})`, state: done ? 'Rebuilt' : rebuildState(a.local) === 'rebuilding' ? 'Rebuilding…' : '' },
    open: (): void => openAlternative(a.local, connId, onopen),
    pin: (): void => openAlternative(a.local, connId, onopen),
    buttons: [{ title: 'Rebuild on hardened image', icon: faHammer, enabled: rebuildState(a.local) !== 'rebuilding', run: (): void => rebuildOnHardened(a.local, connId) }],
    menu: (): MenuItem[] => altMenu(a),
  };
}

const altRows = $derived.by((): LabRow[] => {
  void live.status;
  const t = search.toLowerCase();
  return alts.filter(a => !t || a.local.includes(t) || a.hb.includes(t)).map(altRow);
});

const tagRows = $derived.by((): LabRow[] => {
  void live.status;
  if (!img) return [];
  return img.tags.flatMap(tag =>
    img.variants.map(v => {
      const full = v === 'default' ? tag : `${tag}-${v}`;
      return {
        name: `tag:${full}`,
        status: pullState(img, full) === 'pulled' ? 'USED' : 'UNUSED',
        icon: ImageIcon,
        title: full,
        sub: [],
        cols: { variant: v, arch: img.arch.join(', '), size: mb(v === 'builder' ? img.sizeMB * 3 : img.sizeMB), cves: '0' },
        buttons: [{ title: pullLabel(img, full), icon: faArrowCircleDown, label: true, enabled: !pullState(img, full), run: (): void => pullHardened(img, connId, full) }],
      };
    }),
  );
});

/** Containers running the local image (clone / rebuild candidates). */
const usedBy = $derived.by((): LabRow[] => {
  void live.status;
  const r = alt ? localRes(alt.local) : undefined;
  if (!r) return [];
  return imageInfo(r).usedBy.map(ctr => ({
    name: ctr.id,
    r: ctr,
    status: resStatus(ctr) === 'running' ? 'RUNNING' : 'EXITED',
    icon: ImageIcon,
    title: ctr.name,
    sub: [],
    cols: { image: ctr.sub },
    open: (): void => onopen({ kind: 'resource', connId: ctr.connId, sectionId: ctr.sectionId, resId: ctr.id }, {}),
    pin: (): void => onopen({ kind: 'resource', connId: ctr.connId, sectionId: ctr.sectionId, resId: ctr.id }, {}),
    buttons: [],
    menu: (): MenuItem[] => resActions(ctr, onopen),
  }));
});

function analyze(): void {
  analyzing = true;
  setTimeout(() => (analyzing = false), 900);
}
</script>

{#snippet catSeg()}
  <SegFilter tabs={[['all', 'All'], ['Runtime', 'Runtimes'], ['Web & database', 'Web & database'], ['Base & builder', 'Base & builders']]} value={cat} onpick={(v): void => void (cat = v)} />
{/snippet}

{#snippet altActions()}
  <Btn icon={faArrowsRotate} testid="hb-analyze" disabled={analyzing} onclick={analyze}>{analyzing ? 'Analyzing…' : 'Analyze images'}</Btn>
{/snippet}

{#snippet imageActions()}
  {#if img}<Btn kind="primary" icon={faArrowCircleDown} testid="hb-pull" disabled={!!pullState(img)} onclick={(): void => pullHardened(img, connId)}>{pullLabel(img)}</Btn>{/if}
{/snippet}

{#snippet compareActions()}
  {#if alt && altImg}
    <Btn icon={faArrowCircleDown} disabled={!!pullState(altImg)} onclick={(): void => pullHardened(altImg, connId)}>{pullState(altImg) ? pullLabel(altImg) : 'Pull hardened image'}</Btn>
    <Btn kind="primary" icon={faHammer} testid="hb-rebuild" disabled={rebuildState(alt.local) === 'rebuilding'} onclick={(): void => rebuildOnHardened(alt.local, connId)}>{rebuildState(alt.local) === 'rebuilding' ? 'Rebuilding…' : 'Rebuild on hardened image'}</Btn>
  {/if}
{/snippet}

<div data-testid="hb-view" data-shape={shape} class="flex flex-col h-full min-h-0">
  {#if shape === 'catalog'}
    <Head icon={faBookOpen} title="Catalog" connId={connId} onconn={(): void => onopen({ kind: 'connection', connId }, {})} sub="Red Hat Hardened Images" provenance={PROV} placeholder="Filter hardened images" bind:search filters={catSeg} />
    <div data-testid="hb-catalog" class="flex flex-1 min-h-0 overflow-auto">
      {#if catalogRows.length}
        <ModernTable
          rows={catalogRows}
          {variant}
          readonly
          mono={['tags']}
          cols={[['Tags', 'tags', 'minmax(7rem, 1fr)'], ['Variants', 'variants', 'minmax(7rem, 1fr)'], ['CVEs', 'cves', '60px', true], ['Size', 'size', '80px', true], ['Arch', 'arch', '110px'], ['Updated', 'updated', '100px']]} />
      {:else}
        <div class="flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">
          No hardened images match.
          <button type="button" class="hover:text-[var(--pd-link)] hover:underline" onclick={(): void => { search = ''; cat = 'all'; }}>Clear filters</button>
        </div>
      {/if}
    </div>
  {:else if shape === 'alternatives'}
    <Head icon={faCodeCompare} title="Alternatives" connId={connId} onconn={(): void => onopen({ kind: 'connection', connId }, {})} sub="Local images with a hardened alternative" provenance={PROV} placeholder="Filter local images" bind:search actions={altActions} />
    <div data-testid="hb-alternatives" class="flex flex-1 min-h-0 overflow-auto">
      {#if altRows.length}
        <ModernTable rows={altRows} {variant} readonly cols={[['Hardened alternative', 'alt', 'minmax(10rem, 1fr)'], ['CVEs', 'cves', '80px'], ['Size', 'size', 'minmax(9rem, 1fr)'], ['State', 'state', '100px']]} />
      {:else}
        <div class="flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">
          No local images match.
          <button type="button" class="hover:text-[var(--pd-link)] hover:underline" onclick={(): void => void (search = '')}>Clear filters</button>
        </div>
      {/if}
    </div>
  {:else if shape === 'image' && img}
    <Head
      icon={ImageIcon}
      title="hummingbird/{img.name}"
      connId={connId}
      onconn={(): void => onopen({ kind: 'connection', connId }, {})}
      sub={img.tags[0]}
      provenance={PROV}
      views={[['summary', 'Summary'], ['inspect', 'Inspect']]}
      {view}
      onview={(v): void => void (view = v)}
      actions={imageActions} />
    {#if view === 'inspect'}
      <CodeView
        lang="json"
        testid="inspect"
        lines={JSON.stringify({ name: img.name, description: img.description, application_category: img.category, architectures: img.arch, latest_tag: img.tags[0], tags: img.tags, variants: img.variants, vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }, size: img.sizeMB * 1048576, repository: `quay.io/hummingbird/${img.name}` }, null, 2).split('\n')} />
    {:else}
      <div data-testid="summary" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
          <Card title="Image">
            <KV
              rows={[
                { k: 'Repository', v: `quay.io/hummingbird/${img.name}`, mono: true },
                { k: 'Description', v: img.description },
                { k: 'Category', v: img.category },
                { k: 'Latest tag', v: img.tags[0] },
                { k: 'Variants', v: img.variants.join(', ') },
                { k: 'Architectures', v: img.arch.join(', ') },
                { k: 'CVEs', v: '0 (critical 0 · high 0 · medium 0 · low 0)' },
                { k: 'Size', v: mb(img.sizeMB) },
                { k: 'Updated', v: img.updated },
              ]} />
          </Card>
          <Card title="Provenance">
            <KV
              rows={[
                { k: 'Signature', v: 'Signed (Sigstore cosign) · verified' },
                { k: 'Build provenance', v: 'SLSA v1 attestation' },
                { k: 'SBOM', v: `${img.name}-${img.tags[0]}.spdx.json`, href: `https://hummingbird-project.io/images/${img.name}` },
                { k: 'Source', v: 'gitlab.com/redhat/hummingbird/containers', href: 'https://gitlab.com/redhat/hummingbird/containers' },
                { k: 'Rebuilt', v: 'Daily, on every upstream CVE fix' },
              ]} />
          </Card>
        </div>
        <Section title="Tags" count={tagRows.length} testid="hb-tags">
          <ModernTable {variant} readonly initialSort="" rows={tagRows} cols={[['Variant', 'variant', '90px'], ['Arch', 'arch', '110px'], ['Size', 'size', '80px'], ['CVEs', 'cves', '60px']]} />
        </Section>
        {#if alts.some(a => a.hb === img.name)}
          <Section title="Local images it can replace" count={alts.filter(a => a.hb === img.name).length}>
            <ModernTable {variant} readonly initialSort="" rows={alts.filter(a => a.hb === img.name).map(altRow)} cols={[['CVEs', 'cves', '80px'], ['Size', 'size', 'minmax(9rem, 1fr)']]} />
          </Section>
        {/if}
      </div>
    {/if}
  {:else if shape === 'compare' && alt && altImg}
    {@const done = rebuildState(alt.local) === 'rebuilt'}
    <Head icon={faCodeCompare} title={alt.local.split('/').pop() ?? alt.local} connId={connId} onconn={(): void => onopen({ kind: 'connection', connId }, {})} sub="vs hummingbird/{altImg.name}:{altImg.tags[0]}" provenance={PROV} actions={compareActions} />
    <div data-testid="hb-compare" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
      <StatGrid
        items={[
          { label: 'CVEs', count: `${cveTotal(alt)} → 0` },
          { label: `Size (${pct(alt.sizeMB, altImg.sizeMB)})`, count: `${mb(alt.sizeMB)} → ${mb(altImg.sizeMB)}` },
          { label: 'Packages', count: `${alt.packages} → ${Math.round(alt.packages / 6)}` },
        ]} />
      <div class="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4 items-start">
        <Card title="Current">
          <KV
            rows={[
              { k: 'Image', v: alt.local, onclick: (): void => openLocal(alt.local) },
              { k: 'Base', v: alt.base, mono: true },
              { k: 'CVEs', v: `${cveTotal(alt)} (critical ${alt.cves.critical} · high ${alt.cves.high} · medium ${alt.cves.medium} · low ${alt.cves.low})` },
              { k: 'Size', v: mb(alt.sizeMB) },
              { k: 'Packages', v: alt.packages },
              { k: 'Shell / package manager', v: 'yes / yes' },
            ]} />
        </Card>
        <Card title="Hardened">
          <KV
            rows={[
              { k: 'Image', v: hbRef(altImg), onclick: (): void => openImage(altImg, false) },
              { k: 'Base', v: 'Red Hat Hardened Images (Hummingbird)' },
              { k: 'CVEs', v: '0 (critical 0 · high 0 · medium 0 · low 0)' },
              { k: 'Size', v: mb(altImg.sizeMB) },
              { k: 'Packages', v: Math.round(alt.packages / 6) },
              { k: 'Shell / package manager', v: 'no / no (distroless, builder variant for builds)' },
            ]} />
        </Card>
      </div>
      {#if done}
        <Card title="Rebuilt image">
          <KV rows={[{ k: 'Image', v: rebuiltName(alt.local), onclick: (): void => openRebuilt(alt.local) }, { k: 'Connection', v: findConn(connId)?.name, onclick: (): void => onopen({ kind: 'connection', connId }, {}) }]} />
        </Card>
      {/if}
      <Section title="Containers using this image" count={usedBy.length}>
        {#if usedBy.length}
          <ModernTable {variant} readonly initialSort="" rows={usedBy} cols={[['Image', 'image', 'minmax(10rem, 1fr)']]} />
        {:else}
          <div class="py-2 text-[13px] text-[var(--pd-table-body-text)]">No container uses this image.</div>
        {/if}
      </Section>
      <Section title="Containerfile change">
        <CodeView lang="plain" lines={[`- FROM ${alt.base}`, `+ FROM ${hbRef(altImg, `${altImg.tags[0]}-builder`)} AS build`, `+ FROM ${hbRef(altImg)}`, '+ COPY --from=build /app /app', '+ USER 65532']} />
      </Section>
    </div>
  {:else}
    <Head icon={OVERVIEW_ICON} title="Hummingbird · Overview" connId={connId} onconn={(): void => onopen({ kind: 'connection', connId }, {})} provenance={PROV} />
    <div data-testid="hb-overview" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
      <StatGrid
        items={[
          { label: 'Hardened images', count: HB_CATALOG.length, icon: faBookOpen, onclick: (): void => openNode(['Catalog'], false) },
          { label: 'Alternatives', count: alts.length, icon: faCodeCompare, onclick: (): void => openNode(['Alternatives'], false) },
          { label: 'CVEs you can drop', count: alts.reduce((n, a) => n + cveTotal(a), 0), onclick: (): void => openNode(['Alternatives'], false) },
          { label: 'Rebuilt', count: alts.filter(a => rebuildState(a.local) === 'rebuilt').length },
        ]} />
      <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
        <Card title="About">
          <KV
            rows={[
              { k: 'Extension', v: 'Hummingbird (Red Hat Hardened Images)' },
              { k: 'Description', v: 'Minimal, hardened, zero-CVE container images rebuilt daily, signed and shipped with an SBOM.' },
              { k: 'Registry', v: 'quay.io/hummingbird', mono: true },
              { k: 'Catalog API', v: 'api-hummingbird.hummingbird-project.io', mono: true },
              { k: 'Connection', v: findConn(connId)?.name, onclick: (): void => onopen({ kind: 'connection', connId }, {}) },
              { k: 'Website', v: 'hummingbird-project.io', href: 'https://hummingbird-project.io' },
            ]} />
        </Card>
      </div>
    </div>
  {/if}
</div>
