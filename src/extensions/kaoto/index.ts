/**
 * redhat.kaoto (proposed) – Kaoto & Camel: a Tools workspace (P3) with the
 * visual route designer for ~/dev/acme-integrations, Camel JBang runs as
 * tasks (P15) and the `camel` / `jbang` CLIs in Settings › CLI Tools (P17).
 * Camel runs on the JVM, so nothing is seeded in the containers list.
 */
import { faPlay } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import KaotoTool from './components/KaotoTool.svelte';
import { CAMEL_VERSION, ensureWorkspace, KAOTO_EXT } from './data.ts';

const extension: MockExtension = {
  id: KAOTO_EXT,
  displayName: 'Kaoto & Camel',
  publisher: 'redhat',
  category: 'Application development',
  description: 'Design Camel integration routes visually with Kaoto, run them locally with Camel JBang against your Podman services, and export them to Quarkus.',
  version: '2.13.0',
  icon: 'icons/redhat.kaoto.svg',
  tags: ['appdev'],
  pApis: ['P3', 'P15', 'P17'],
  contributes: {
    tools: [
      {
        id: 'kaoto',
        label: 'Kaoto',
        icon: 'icons/redhat.kaoto.svg',
        description: 'Visual Camel route designer',
        component: KaotoTool,
        badge: w => {
          const running = (w.ext[KAOTO_EXT]?.workspace as { running?: unknown[] } | undefined)?.running?.length;
          return running || undefined;
        },
      },
    ],
    cliTools: [
      {
        id: 'camel',
        name: 'camel',
        displayName: 'Camel JBang',
        description: 'Red Hat build of Apache Camel CLI: run, inspect (camel ps, camel get route) and export integrations.',
        version: CAMEL_VERSION,
        path: '~/.jbang/bin/camel',
      },
      {
        id: 'jbang',
        name: 'jbang',
        displayName: 'JBang',
        description: 'Runs Java applications and the Camel CLI without a build tool.',
        version: '0.131.0',
        path: '~/.jbang/bin/jbang',
      },
    ],
    commands: [{ id: 'kaoto.open', title: 'Open Kaoto', category: 'Camel', icon: faPlay, run: (): void => navigate('/tools/kaoto') }],
  },
  seed(): void {
    ensureWorkspace();
  },
};

export default extension;
