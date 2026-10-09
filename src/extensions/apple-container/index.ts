/**
 * redhat.apple-container – Apple container (macOS, Apple silicon) through the
 * socktainer Docker API shim. Cross-platform parity reference for WSLC: same
 * capability matrix (P11), "container system start" prerequisite tab.
 */
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { MockExtension } from '#lib/ext/types.ts';

import CapabilitiesTab from '../wslc/components/CapabilitiesTab.svelte';
import PrerequisitesTab from './components/PrerequisitesTab.svelte';

const ID = 'redhat.apple-container';

const extension: MockExtension = {
  id: ID,
  displayName: 'Apple container',
  publisher: 'redhat',
  category: 'Containers & engines',
  description: 'List and manage Apple containers (one lightweight VM per container) on macOS with Apple silicon.',
  version: '0.2.0',
  icon: 'icons/redhat.apple-container.png',
  tags: [],
  pApis: ['P11'],
  contributes: {
    connections: [
      {
        id: 'apple',
        name: 'Apple',
        kind: 'engine',
        providerId: 'apple-container',
        providerName: 'Apple container',
        engineType: 'apple',
        hint: 'macOS',
        hintTooltip: 'Apple container runs on macOS with Apple silicon',
        initialStatus: 'stopped',
        endpoint: 'unix:///Users/alice/.socktainer/container.sock',
        version: '1.5.0',
        details: { socktainer: 'v1.5.0', container: '1.5.0', Isolation: 'VM per container', 'API shim': 'socktainer (Docker REST compatible)' },
        capabilities: ['apple', 'build', 'vm-per-container'],
        resources: ['containers', 'images'],
      },
    ],
    tabs: [
      { id: 'prerequisites', label: 'Prerequisites', target: 'connection', when: ctx => ctx.conn.engineType === 'apple', component: PrerequisitesTab },
      // The WSLC extension contributes the same matrix on every engine; only add it when WSLC is not enabled.
      {
        id: 'capabilities',
        label: 'Capabilities',
        target: 'connection',
        when: ctx => ctx.conn.engineType === 'apple' && !registry.isEnabled('podman-desktop.wslc'),
        component: CapabilitiesTab,
      },
    ],
  },
  seed(world): void {
    world.containers.push(
      mkContainer('apple', { name: 'web', image: 'docker.io/library/nginx:1.29', ports: [[8080, 80]], ageH: 26, upM: 300 }),
      mkContainer('apple', { name: 'redis', image: 'docker.io/valkey/valkey:9.1', state: 'EXITED', ports: [6379], ageH: 50 }),
    );
    world.images.push(
      mkImage('apple', { name: 'docker.io/library/nginx', tag: '1.29', sizeMB: 192, ageD: 20, base: 'debian-12' }),
      mkImage('apple', { name: 'docker.io/valkey/valkey', tag: '9.1', sizeMB: 118, ageD: 14, base: 'debian-12' }),
    );
    for (const img of world.images.filter(i => i.engineId === 'apple')) img.arch = 'arm64';
  },
};

export default extension;
