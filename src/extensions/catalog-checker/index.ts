/**
 * redhat.catalog-checker – Red Hat Ecosystem Catalog (Pyxis) health grade
 * and newer tag for Red Hat base images (P5) + grade badge in the image list (P14).
 */
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';

import { mkImage } from '#lib/ext/helpers.ts';
import type { CheckerDef, Finding, MockExtension, Severity } from '#lib/ext/types.ts';
import { type ContainerImage, runTask, world } from '#lib/world.svelte.ts';

interface Grade {
  repository: string;
  tag: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  since: string;
  newerTag?: string;
  newerGrade?: string;
  deprecated?: string;
}

/** `/api/containers/v1/repositories/registry/registry.access.redhat.com/repository/{repo}/images` */
const GRADES: Record<string, Grade> = {
  'ubi9/python-311:9.5': { repository: 'ubi9/python-311', tag: '9.5-1736404155', grade: 'C', since: '2025-03-05', newerTag: '9.8-1791100000', newerGrade: 'A' },
  'ubi8/nodejs-18': { repository: 'ubi8/nodejs-18', tag: '1-130', grade: 'F', since: '2025-05-30', deprecated: 'ubi9/nodejs-22' },
  'rhel10/rhel-bootc:10.1': { repository: 'rhel10/rhel-bootc', tag: '10.1', grade: 'B', since: '2026-10-02', newerTag: '10.2', newerGrade: 'A' },
  'rhel9/rhel-bootc:9.7': { repository: 'rhel9/rhel-bootc', tag: '9.7', grade: 'B', since: '2026-09-29', newerTag: '9.8', newerGrade: 'A' },
  'ubi9/python-311:9.8': { repository: 'ubi9/python-311', tag: '9.8-1791100000', grade: 'A', since: '2026-10-06' },
};

function gradeOf(i: ContainerImage): Grade | undefined {
  if (!i.base) return undefined;
  if (GRADES[i.base]) return GRADES[i.base];
  if (/^ubi\d+$/.test(i.base)) return { repository: `${i.base}/${i.name.split('/').pop()}`, tag: i.tag, grade: 'A', since: '2026-10-06' };
  return undefined;
}

const SEV: Record<string, Severity> = { A: 'success', B: 'low', C: 'medium', D: 'high', E: 'high', F: 'critical' };

function rebase(i: ContainerImage, g: Grade): void {
  const to = g.deprecated ?? `${g.repository}:${g.newerTag?.split('-')[0]}`;
  const tag = `${i.tag}.1`;
  runTask({
    name: `Rebuild ${i.name.split('/').pop()}:${tag} FROM ${to}`,
    ext: 'redhat.catalog-checker',
    steps: [
      { label: `Update FROM registry.access.redhat.com/${to}`, ms: 800, log: [`- FROM registry.access.redhat.com/${g.repository}:${g.tag}`, `+ FROM registry.access.redhat.com/${to}`] },
      { label: `podman build -t ${i.name}:${tag} .`, ms: 2800, log: ['STEP 1/7: FROM registry.access.redhat.com/' + to, 'COMMIT ' + i.name + ':' + tag] },
    ],
    onDone: () => {
      world.images.push(mkImage(i.engineId, { name: i.name, tag, sizeMB: Math.round(i.size / 1048576) - 6, ageD: 0, base: g.deprecated ?? `${g.repository}:9.8`, labels: i.labels }));
    },
    action: { label: 'Open images', href: `/c/${i.engineId}/images` },
  });
}

function check(i: ContainerImage): Finding[] {
  const g = gradeOf(i);
  if (!g) return [];
  const newer = g.newerTag ? ` · newer tag ${g.newerTag} grade ${g.newerGrade}` : '';
  return [
    {
      id: `grade-${g.repository}`,
      ruleId: `${g.repository}:${g.tag}`,
      title: g.deprecated ? `Health grade ${g.grade} · repository deprecated, use ${g.deprecated}` : `Health grade ${g.grade} since ${g.since}${newer}`,
      severity: SEV[g.grade],
      advisoryUrl: `https://catalog.redhat.com/software/containers/${g.repository}`,
      actions: g.newerTag || g.deprecated ? [{ label: g.deprecated ? `Rebase to ${g.deprecated}` : `Rebase to ${g.newerTag?.split('-')[0]}`, run: (img): void => rebase(img, g) }] : undefined,
    },
  ];
}

const checker: CheckerDef = {
  id: 'pyxis-grade',
  label: 'Red Hat Ecosystem Catalog',
  description: 'Freshness grade of the Red Hat base image (A = no unapplied fixes … F = critical fixes missing > 30 days).',
  durationMs: 700,
  when: i => !!gradeOf(i),
  check,
  summary: i => {
    const g = gradeOf(i);
    return g ? `Base ${g.repository}:${g.tag} – grade ${g.grade}${g.newerTag ? ` · ${g.newerTag.split('-')[0]} grade ${g.newerGrade} available` : ''}` : undefined;
  },
};

const extension: MockExtension = {
  id: 'redhat.catalog-checker',
  displayName: 'Red Hat Ecosystem Catalog',
  publisher: 'redhat',
  description: 'Health grade, freshness and newer tags for Red Hat base images.',
  version: '0.1.0',
  icon: 'icons/redhat.catalog-checker.svg',
  tags: ['rhel', 'platform'],
  pApis: ['P5', 'P14'],
  contributes: {
    imageCheckers: [checker],
    columns: [{ id: 'grade', title: 'Grade', target: 'image', value: row => (('base' in row && gradeOf(row as ContainerImage)) ? `Grade ${gradeOf(row as ContainerImage)?.grade}` : undefined) }],
  },
};

export default extension;
