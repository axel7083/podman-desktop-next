/**
 * redhat.bootc – Bootable Container: "Bootable containers" section under
 * Podman engines (P2), "Build disk image" image menus (P14), the
 * `bootc container lint` checker (P5) and builds as tasks (P15).
 */
import { faHammer } from '@fortawesome/free-solid-svg-icons';

import type { MenuDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

import { fixLint } from './actions.ts';
import { BOOTC_EXT, BUILDS, isBootc, lint } from './data.ts';

const buildMenu = (placement: 'kebab' | 'details'): MenuDef => ({
  id: `build-disk-image-${placement}`,
  label: 'Build disk image',
  icon: faHammer,
  target: 'image',
  placement,
  when: ctx => isBootc(ctx.resource as ContainerImage),
  run: (ctx): void => navigate(`/c/${ctx.conn.id}/bootc?image=${(ctx.resource as ContainerImage).id}`),
});

const extension: MockExtension = {
  id: BOOTC_EXT,
  displayName: 'Bootable Container',
  publisher: 'redhat',
  description: 'Support for bootable OS containers (bootc) and generating disk images.',
  version: '1.12.0',
  icon: 'icons/redhat.bootc.png',
  dependsOn: ['podman-desktop.podman'],
  tags: ['rhel'],
  pApis: ['P2', 'P5', 'P14', 'P15'],
  contributes: {
    navSections: [
      {
        id: 'bootc',
        label: 'Bootable containers',
        when: conn => conn.engineType === 'podman',
        component: () => import('./components/BootcSection.svelte'),
        counter: (w, conn) => ((w.ext[BOOTC_EXT] as { builds?: { engineId: string }[] } | undefined)?.builds ?? []).filter(b => b.engineId === conn.id).length || undefined,
      },
    ],
    menus: [buildMenu('kebab'), buildMenu('details')],
    imageCheckers: [
      {
        id: 'bootc-lint',
        label: 'bootc container lint',
        description: 'Runs `bootc container lint` inside the image (var-log, kargs, etc-usretc, sysusers, nonempty-boot…).',
        durationMs: 900,
        when: isBootc,
        check: i =>
          lint(i)
            .filter(r => r.status !== 'pass')
            .map(r => ({
              id: r.name,
              ruleId: `bootc-lint/${r.name}`,
              title: r.message ?? r.name,
              severity: r.status === 'fail' ? 'high' : 'low',
              actions: r.status === 'fail' ? [{ label: 'Fix and rebuild image', run: fixLint }] : undefined,
            })),
        summary: (_i, f) => (f.some(x => x.severity === 'high') ? `Errors: ${f.filter(x => x.severity === 'high').length} · Warnings: ${f.filter(x => x.severity !== 'high').length} · disk image build blocked` : `Checks passed · Warnings: ${f.length}`),
      },
    ],
    commands: [{ id: 'bootc.build', title: 'Build bootc disk image', category: 'Bootable Container', icon: faHammer, run: (): void => navigate('/c/podman-machine-default/bootc') }],
  },
  seed(w): void {
    w.ext[BOOTC_EXT] = { builds: BUILDS };
  },
};

export default extension;
