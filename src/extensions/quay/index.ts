/**
 * redhat.quay (proposed) – quay.io / Red Hat Quay: registry with the robot
 * credential, Quay tool page (repositories, robot accounts), Clair results as
 * an image checker (P5), "Push and scan" with the ACS pre-push gate and
 * "Rebuild on latest UBI 9" on images (P14), "Pushed" badge (P14 columns).
 */
import { faCloudArrowUp, faHammer } from '@fortawesome/free-solid-svg-icons';

import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { MockExtension, ResourceContext } from '#lib/ext/types.ts';
import { type ContainerImage, hexId, runTask, shortImage, world } from '#lib/world.svelte.ts';

import { failing } from '../acs/data.ts';
import QuayTool from './components/QuayTool.svelte';
import { clairFindings, isPushed, pushedDigests, QUAY_ID } from './data.ts';

const ACS = 'redhat.acs-image-check';
const isQuay = (image: ContainerImage): boolean => image.name.startsWith('quay.io/');

function push(ctx: ResourceContext): void {
  const image = ctx.resource as ContainerImage;
  const ref = `${shortImage(image.name)}:${image.tag}`;
  const gate = registry.isEnabled(ACS) && world.settings['acs.blockPush'] !== false;
  const blocking = gate ? failing(image) : [];
  const href = `/c/${ctx.conn.id}/images/${image.id}/security`;
  runTask({
    name: `Push and scan ${ref}`,
    ext: QUAY_ID,
    steps: [
      ...(gate ? [{ label: 'ACS pre-push check (roxctl image check, Central acme-prod)', ms: 1400, log: [`$ roxctl image check --image ${ref} -o json`] }] : []),
      { label: `Pushing ${ref} to quay.io (4 layers, 118.7 MB) as acme+ci_push`, ms: 2200, log: ['Copying blob sha256:4b1e… done', 'Writing manifest to image destination'] },
      { label: 'Clair scan queued', ms: 900 },
      { label: 'Clair scan complete (status: scanned)', ms: 900 },
    ],
    failAt: blocking.length ? 0 : undefined,
    failMessage: `Push blocked by ACS: ${blocking.map(p => p.name).join(', ')}. See the image Security tab.`,
    action: { label: 'View security report', href },
    onDone: () => {
      if (image.digest && !isPushed(image)) pushedDigests().push(image.digest);
    },
  });
}

function rebuild(ctx: ResourceContext): void {
  const image = ctx.resource as ContainerImage;
  runTask({
    name: `Rebuild ${shortImage(image.name)}:${image.tag} on ubi9/ubi:9.6-1760`,
    ext: QUAY_ID,
    steps: [
      { label: 'podman build --pull=always -f Containerfile', ms: 1200, log: ['STEP 1/7: FROM registry.access.redhat.com/ubi9/ubi:9.6-1760'] },
      { label: 'dnf -y update openssl-libs && dnf clean all', ms: 1600, log: ['Upgraded: openssl-libs-1:3.2.2-6.el9_6.x86_64'] },
      { label: 'USER 1001 · committing image', ms: 800, log: [`Successfully tagged ${image.name}:${image.tag}`] },
    ],
    action: { label: 'View security report', href: `/c/${ctx.conn.id}/images/${image.id}/security` },
    onDone: () => {
      const img = world.images.find(i => i.id === image.id);
      if (!img) return;
      img.digest = `sha256:${hexId(64)}`;
      img.created = Date.now();
      img.base = 'ubi9';
      img.labels = { ...img.labels, 'io.acme.user': '1001', 'io.acme.base': 'registry.access.redhat.com/ubi9/ubi:9.6-1760' };
      img.packages = (img.packages ?? []).map(p => (p.name === 'openssl-libs' ? { ...p, version: '1:3.2.2-6.el9_6' } : p));
    },
  });
}

const extension: MockExtension = {
  id: QUAY_ID,
  displayName: 'Red Hat Quay',
  publisher: 'redhat',
  description: 'Browse your Quay repositories, manage robot accounts and see Clair scan results before and after push.',
  version: '0.2.0',
  icon: 'icons/redhat.quay.png',
  tags: ['openshift'],
  pApis: ['P5', 'P14', 'P17'],
  contributes: {
    registries: [{ id: 'quay.io', name: 'Red Hat Quay', server: 'quay.io', icon: 'icons/redhat.quay.png', user: 'acme+ci_push' }],
    tools: [{ id: 'quay', label: 'Quay', icon: 'icons/redhat.quay.png', description: 'Repositories and robot accounts of quay.io/acme', component: QuayTool }],
    imageCheckers: [
      {
        id: 'clair',
        label: 'Quay security scan (Clair)',
        description: 'Vulnerabilities reported by Clair for the pushed manifest on quay.io.',
        when: isQuay,
        durationMs: 900,
        check: clairFindings,
      },
    ],
    columns: [{ id: 'quay-pushed', title: 'quay.io', target: 'image', value: row => ('tag' in row && isPushed(row) ? 'Pushed' : undefined) }],
    menus: [
      { id: 'quay-push', label: 'Push and scan', icon: faCloudArrowUp, target: 'image', placement: 'kebab', when: ctx => isQuay(ctx.resource as ContainerImage), run: push },
      {
        id: 'quay-rebuild',
        label: 'Rebuild on latest UBI 9',
        icon: faHammer,
        target: 'image',
        placement: 'kebab',
        when: ctx => !!(ctx.resource as ContainerImage).packages?.some(p => p.name === 'openssl-libs' && p.version.endsWith('el9_5')),
        run: rebuild,
      },
    ],
  },
  seed(w): void {
    const e = 'podman-machine-default';
    const rhel = [
      { name: 'openssl-libs', version: '1:3.2.2-6.el9_5' },
      { name: 'glibc', version: '2.34-168.el9_6' },
      { name: 'python3', version: '3.9.21-2.el9' },
      { name: 'curl-minimal', version: '7.76.1-31.el9' },
      { name: 'dnf', version: '4.14.0-25.el9' },
    ];
    const v150 = mkImage(e, { name: 'quay.io/acme/payments-api', tag: '1.5.0', sizeMB: 118.7, ageD: 0, base: 'ubi9', packages: rhel, labels: { 'io.acme.user': 'root', 'io.acme.base': 'registry.access.redhat.com/ubi9/ubi:latest', 'org.opencontainers.image.source': 'https://github.com/acme/payments-api' } });
    const v140 = mkImage(e, { name: 'quay.io/acme/payments-api', tag: '1.4.0', sizeMB: 117.9, ageD: 17, base: 'ubi9', packages: rhel.map(p => (p.name === 'openssl-libs' ? { ...p, version: '1:3.2.2-6.el9_6' } : p)), labels: { 'io.acme.user': '1001' } });
    const edge = mkImage(e, { name: 'quay.io/acme/payments-edge', tag: '9.6', sizeMB: 1630, ageD: 2, base: 'rhel-bootc-9.6', labels: { 'containers.bootc': '1', 'ostree.bootable': 'true', 'redhat.id': 'rhel', 'redhat.version-id': '9.6' } });
    w.images.push(v150, v140, edge);
    if (v140.digest) pushedDigests().push(v140.digest);
    w.containers.push(
      mkContainer(e, {
        name: 'payments-api',
        image: 'quay.io/acme/payments-api:1.5.0',
        ports: [[8080, 8080]],
        env: ['QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://postgres:5432/payments'],
        upM: 25,
        logs: ['__  ____  __  _____   ___  __ ____  ______', 'INFO  [io.quarkus] payments-api 1.5.0 on JVM (powered by Quarkus 3.27.0) started in 1.012s. Listening on: http://0.0.0.0:8080', 'INFO  [io.quarkus] Profile dev activated. Live Coding activated.'],
      }),
    );
  },
};

export default extension;
