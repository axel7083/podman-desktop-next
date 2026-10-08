/**
 * redhat.hummingbird – Red Hat Hardened Images (Project Hummingbird):
 * rebase suggestion checker (P5) with a one-click "Rebuild on hardened image"
 * task, image/container menus (P14) and a catalog tool page (P3).
 */
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';

import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { CheckerDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { type ContainerImage, runTask, shortImage, world } from '#lib/world.svelte.ts';

import { alternativeFor } from './data.ts';

const ID = 'redhat.hummingbird';

export function rebuildOnHardened(i: ContainerImage): void {
  const alt = alternativeFor(i.base, i.name);
  if (!alt) return;
  const from = `quay.io/hummingbird/${alt.image.name}:${alt.image.latest_tag}`;
  const tag = `${i.tag}-hummingbird`;
  const short = i.name.split('/').pop() ?? i.name;
  runTask({
    name: `Rebuild ${short} on ${from}`,
    ext: ID,
    steps: [
      { label: 'Generate multi-stage Containerfile', ms: 900, log: [`- FROM registry.access.redhat.com/${i.base}`, `+ FROM ${from.replace(alt.image.latest_tag, `${alt.image.latest_tag}-builder`)} AS build`, `+ FROM ${from}`, '+ COPY --from=build /opt/app-root /opt/app-root'] },
      { label: `Pull ${from}`, ms: 1200 },
      { label: `podman build -t ${i.name}:${tag} .`, ms: 2600, log: [`COMMIT ${i.name}:${tag}`, `Size ${alt.image.sizeMB} MB (was ${Math.round(i.size / 1048576)} MB)`] },
      { label: `Start ${short}-hb next to ${short}`, ms: 900 },
    ],
    onDone: () => {
      world.images.push(mkImage(i.engineId, { name: i.name, tag, sizeMB: alt.image.sizeMB, ageD: 0, base: `hummingbird/${alt.image.name}:${alt.image.latest_tag}`, labels: { ...i.labels, 'io.hummingbird.base': from } }));
      const orig = world.containers.find(c => c.engineId === i.engineId && shortImage(c.image) === `${shortImage(i.name)}:${i.tag}`);
      world.containers.push(mkContainer(i.engineId, { name: `${orig?.name ?? short}-hb`, image: `${i.name}:${tag}`, ports: orig?.ports.length ? [[orig.ports[0].host + 1, orig.ports[0].container]] : [], command: orig?.command, env: orig?.env, upM: 0 }));
    },
    action: { label: 'Open containers', href: `/c/${i.engineId}/containers` },
  });
}

const checker: CheckerDef = {
  id: 'hardened-alternative',
  label: 'Hardened image alternative',
  description: 'Hummingbird images are minimal, rebuilt daily and ship with near-zero CVEs.',
  durationMs: 1000,
  when: i => !i.base?.startsWith('hummingbird') && !!alternativeFor(i.base, i.name),
  check: i => {
    const alt = alternativeFor(i.base, i.name);
    if (!alt) return [];
    const size = Math.round(i.size / 1048576);
    return [
      {
        id: `hb-${alt.image.name}`,
        ruleId: `quay.io/hummingbird/${alt.image.name}:${alt.image.latest_tag}`,
        title: `Hardened alternative: ${alt.localCves} → ${alt.image.vulnerabilities.total} CVEs · ${size} MB → ${alt.image.sizeMB} MB (−${Math.round((1 - alt.image.sizeMB / size) * 100)}%)`,
        severity: 'info',
        actions: [{ label: 'Rebuild on hardened image', run: rebuildOnHardened }],
      },
    ];
  },
  summary: i => {
    const alt = alternativeFor(i.base, i.name);
    return alt ? `Rebase on quay.io/hummingbird/${alt.image.name}:${alt.image.latest_tag} to drop ${alt.localCves} CVEs` : undefined;
  },
};

const extension: MockExtension = {
  id: ID,
  displayName: 'Hummingbird',
  publisher: 'redhat',
  category: 'Security & supply chain',
  description: 'Catalog of minimal hardened images; detects local images with a hardened alternative and rebuilds them onto it.',
  version: '0.3.0',
  icon: 'icons/redhat.hummingbird.png',
  tags: ['rhel', 'platform'],
  pApis: ['P3', 'P5', 'P10', 'P14'],
  contributes: {
    imageCheckers: [checker],
    tools: [{ id: 'hummingbird', label: 'Hardened images', icon: 'icons/redhat.hummingbird.png', component: () => import('./components/HummingbirdTool.svelte') }],
    menus: [
      {
        id: 'rebuild-hardened',
        label: 'Rebuild on hardened image',
        icon: faShieldHalved,
        target: 'image',
        placement: 'kebab',
        when: ctx => !!alternativeFor((ctx.resource as ContainerImage).base, (ctx.resource as ContainerImage).name) && !(ctx.resource as ContainerImage).base?.startsWith('hummingbird'),
        run: ctx => rebuildOnHardened(ctx.resource as ContainerImage),
      },
    ],
    commands: [{ id: 'hummingbird.open', title: 'Browse hardened images', category: 'Hummingbird', icon: faShieldHalved, run: (): void => navigate('/tools/hummingbird') }],
  },
};

export default extension;
