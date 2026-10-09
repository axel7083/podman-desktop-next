/**
 * redhat.rhdh-local (proposed) – RHDH Local: a local Red Hat Developer Hub
 * (Backstage) started with Podman Compose, as a service connection (P8) with
 * Catalog / Templates / Plugins sections (P2), a compose-grouped set of
 * containers (P10), a factory (P12) and a dashboard card (P17).
 */
import { faCubes } from '@fortawesome/free-solid-svg-icons';

import type { FactoryDef, MockExtension } from '#lib/ext/types.ts';
import type { TaskStep } from '#lib/world.svelte.ts';
import { navigate } from '#lib/nav.ts';

import { isService } from '../_appdev/services.ts';
import CatalogSection from './components/CatalogSection.svelte';
import HubCard from './components/HubCard.svelte';
import PluginsSection from './components/PluginsSection.svelte';
import TemplatesSection from './components/TemplatesSection.svelte';
import { composeContainers, ensureHub, hub, RHDH_CONN, RHDH_EXT, RHDH_IMAGE, rhdhConnection, sampleHub } from './data.ts';

const FACTORY: FactoryDef = {
  id: 'rhdh-local',
  label: 'Create Developer Hub (local)',
  providerId: 'rhdh-local',
  kind: 'service',
  description: 'Clone redhat-developer/rhdh-local and start Red Hat Developer Hub 1.10 with Podman Compose: catalog, software templates, dynamic plugins and Developer Lightspeed.',
  fields: [
    { id: 'name', label: 'Name', type: 'text', default: 'rhdh-local', required: true },
    {
      id: 'image',
      label: 'Image',
      type: 'select',
      default: RHDH_IMAGE,
      options: [
        { value: RHDH_IMAGE, label: 'RHDH community 1.10.3 (quay.io/rhdh-community)' },
        { value: 'registry.redhat.io/rhdh/rhdh-hub-rhel9:1.10', label: 'Red Hat Developer Hub 1.10 (registry.redhat.io)' },
      ],
    },
    { id: 'port', label: 'Host port', type: 'number', default: 7008 },
    { id: 'dir', label: 'Clone into', type: 'file', default: '~/.local/share/rhdh-local', description: 'git clone https://github.com/redhat-developer/rhdh-local' },
    { id: 'lightspeed', label: 'Enable Developer Lightspeed (lightspeed-core + rag-init)', type: 'checkbox', default: true },
  ],
  steps: (v): TaskStep[] => [
    { label: 'Cloning redhat-developer/rhdh-local', ms: 1400, log: [`git clone https://github.com/redhat-developer/rhdh-local ${String(v.dir)}`, "Cloning into 'rhdh-local'... done."] },
    { label: `Pulling ${String(v.image)}`, ms: 2400, log: [`Trying to pull ${String(v.image)}...`, 'Copying blob sha256:7c3a1f0e92bd done | 640 MB'] },
    { label: 'Installing dynamic plugins', ms: 1800, log: ['podman compose up -d', '[+] Running 1/1 ✔ Container rhdh-plugins-installer  Exited (0)', '==> Successfully installed dynamic plugin backstage-community-plugin-tech-radar'] },
    ...(v.lightspeed ? [{ label: 'Initialising Developer Lightspeed RAG content', ms: 1000, log: ['✔ Container rag-init  Exited (0)', '✔ Container lightspeed-core  Started'] }] : []),
    { label: 'Starting rhdh', ms: 1600, log: ['✔ Container rhdh  Started', `GET http://localhost:${String(v.port)} → 200`] },
  ],
  createConnection: v => rhdhConnection(String(v.name), 'started', { Image: String(v.image), Directory: String(v.dir) }, Number(v.port)),
  onCreated: (world, conn, v): void => {
    world.containers.push(...composeContainers(conn.id, String(v.image), Boolean(v.lightspeed), 0, Number(v.port)));
    const h = sampleHub();
    h.entities = h.entities.filter(e => e.kind === 'Group' || e.kind === 'User');
    world.ext[RHDH_EXT] ??= {};
    world.ext[RHDH_EXT][conn.id] = h;
  },
};

const extension: MockExtension = {
  id: RHDH_EXT,
  displayName: 'RHDH Local',
  publisher: 'redhat',
  category: 'Application development',
  description: 'Run a local Red Hat Developer Hub (Backstage) with Podman Compose, manage dynamic plugins and catalog entities, and test software templates.',
  version: '0.3.0',
  icon: 'icons/redhat.rhdh-local.png',
  dependsOn: ['podman-desktop.services'],
  tags: ['appdev', 'platform'],
  pApis: ['P2', 'P8', 'P10', 'P12', 'P15', 'P17'],
  contributes: {
    connections: [
      rhdhConnection(RHDH_CONN, 'started', {
        Image: RHDH_IMAGE,
        Directory: '~/.local/share/rhdh-local',
        'Developer Lightspeed': 'lightspeed-core 0.6.4',
      }),
    ],
    connectionFactories: [FACTORY],
    navSections: [
      {
        id: 'catalog',
        label: 'Catalog',
        when: conn => isService(conn, 'rhdh'),
        component: CatalogSection,
        counter: (_w, conn) => hub(conn.id).entities.length,
        order: 1,
      },
      {
        id: 'templates',
        label: 'Templates',
        when: conn => isService(conn, 'rhdh'),
        component: TemplatesSection,
        counter: (_w, conn) => hub(conn.id).templates.length,
        order: 2,
      },
      {
        id: 'plugins',
        label: 'Plugins',
        when: conn => isService(conn, 'rhdh'),
        component: PluginsSection,
        counter: (_w, conn) => hub(conn.id).plugins.filter(p => !p.disabled).length,
        order: 3,
      },
    ],
    dashboardCards: [{ id: 'developer-hub', title: 'Developer Hub', component: HubCard }],
    commands: [
      { id: 'rhdh.templates', title: 'Create a component from a software template', category: 'Developer Hub', icon: faCubes, run: (): void => navigate(`/c/${RHDH_CONN}/templates`) },
    ],
  },
  seed(world): void {
    world.containers.push(...composeContainers('rhdh-local', RHDH_IMAGE, true));
    ensureHub(RHDH_CONN);
  },
};

export default extension;
