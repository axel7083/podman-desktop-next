/**
 * TEMPLATE – copy this folder to `src/extensions/<short-name>/` (no leading
 * underscore) to add an integration. Folders starting with `_` are skipped by
 * the registry glob, but this file is still type-checked by `pnpm check`.
 *
 * Every contribution point is shown once. Delete what you don't need.
 * Keep mock data realistic (field names from the real API, see NOTES.md).
 */
import { faFlask, faRocket } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { addKube, ago, extData, hexId, kube, runTask, toast } from '#lib/world.svelte.ts';

import TemplateCard from './components/TemplateCard.svelte';
import TemplateSection from './components/TemplateSection.svelte';
import TemplateTab from './components/TemplateTab.svelte';
import TemplateTool from './components/TemplateTool.svelte';
import { plural } from '#lib/util.ts';

const ID = 'example.template';

const extension: MockExtension = {
  // Reuse the real extension id (`publisher.name` from its package.json) when one exists.
  id: ID,
  displayName: 'Example template',
  publisher: 'example',
  category: 'Application development',
  description: 'Shows every contribution point of the mock extension model.',
  version: '0.1.0',
  // Copy the real icon to static/icons/<id>.png and record it in docs/assets.md.
  icon: 'icons/podman-desktop.svg',
  // extensionDependencies: enabling this enables them; disabling them disables this.
  dependsOn: ['podman-desktop.podman'],
  // Extension pack: `packOf: ['a.b', 'c.d']` enables the members with the pack.
  // Scenario presets that enable this extension.
  tags: [], // e.g. ['community', 'openshift']; empty = catalog only
  // Appendix A platform items this extension demonstrates.
  pApis: ['P2', 'P3', 'P5', 'P8', 'P10', 'P13', 'P14', 'P17'],
  contributes: {
    // A. Connections (P1/P8/P11): static array, or a function of the scenario.
    connections: (s): ConnectionDef[] => [
      {
        id: 'example-service',
        name: 'example-service',
        kind: 'service', // engine | kubernetes | vm | service
        providerId: 'example',
        providerName: 'Example',
        hint: s.has('windows') ? 'WSL' : undefined,
        initialStatus: 'stopped',
        endpoint: 'http://localhost:8080',
        version: '1.0.0',
        details: { Image: 'quay.io/example/service:1.0' },
        capabilities: ['example'],
      },
    ],
    // "Create …" wizard (P12/P18): fields → task steps → new connection.
    connectionFactories: [
      {
        id: 'example-service',
        label: 'Create example service',
        providerId: 'example',
        kind: 'service',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'example-2', required: true },
          { id: 'tls', label: 'Enable TLS', type: 'checkbox', default: false },
          // `visible` hides a field until it applies; `?cert=…` in the URL prefills it.
          { id: 'cert', label: 'Certificate', type: 'file', visible: (v): boolean => v.tls === true },
        ],
        // Inline validation: errors block "Create"; `fix` is a one-click suggestion.
        validate: v =>
          v.tls && !v.cert ? [{ field: 'cert', level: 'error', message: 'A certificate is required with TLS', fix: { label: 'Disable TLS', values: { tls: false } } }] : [],
        steps: () => [
          { label: 'Pulling quay.io/example/service:1.0', ms: 1500 },
          { label: 'Starting service', ms: 800 },
        ],
        createConnection: (v): ConnectionDef => ({
          id: String(v.name),
          name: String(v.name),
          kind: 'service',
          providerId: 'example',
          providerName: 'Example',
          initialStatus: 'started',
          endpoint: 'http://localhost:8081',
        }),
      },
    ],
    // B. Secondary-nav section under matching connections (P2).
    navSections: [
      {
        id: 'example-items',
        label: 'Example items',
        when: conn => conn.kind === 'kubernetes',
        component: TemplateSection,
        counter: (world, conn) => (world.kube[conn.id] ?? []).filter(o => o.kind === 'ExampleItem').length,
      },
    ],
    // D. Tools group page (P3).
    tools: [{ id: 'example-tool', label: 'Example tool', component: TemplateTool, badge: () => 2 }],
    // Extra details tab (P14). `when` gets { target, conn, resource }.
    tabs: [{ id: 'example', label: 'Example', target: 'container', when: ctx => ctx.conn.engineType === 'podman', component: TemplateTab }],
    // Actions: row (inline), kebab (overflow), toolbar (list header), details (details header).
    menus: [
      {
        id: 'example-action',
        label: 'Run example action',
        icon: faRocket,
        target: 'container',
        placement: 'kebab',
        run: ctx => toast({ type: 'info', title: `Example action on ${(ctx.resource as { name: string }).name}` }),
      },
    ],
    // Column / badge in a core list (P14).
    columns: [{ id: 'example-col', title: 'Example', target: 'image', value: img => ('base' in img && img.base?.startsWith('ubi') ? 'UBI' : undefined) }],
    // Group container rows by label (P10).
    // `groupName` / `groupDetails` resolve opaque label values (session ids…) into readable group rows.
    groupers: [
      {
        id: 'example-group',
        label: 'io.example.group',
        typeName: 'example',
        // short chip label on the group row (icon + label); defaults to typeName
        chip: 'Example',
        icon: 'icons/podman-desktop.svg',
        groupName: value => value.slice(0, 8),
        groupDetails: (_value, containers) => [`${containers.length} example containers`],
      },
    ],
    // Structured image findings (P5).
    imageCheckers: [
      {
        id: 'example-checker',
        label: 'Example checker',
        durationMs: 800,
        summary: (_image, findings) => plural(findings.length, 'finding'),
        check: image => [
          {
            id: 'EX-1',
            title: 'Example finding',
            severity: image.base?.startsWith('ubi') ? 'low' : 'medium',
            cve: 'CVE-2025-0001',
            package: 'openssl',
            installed: '3.0.7',
            fixedIn: '3.0.15',
            vexStatus: 'affected',
            advisoryUrl: 'https://access.redhat.com/security/cve/CVE-2025-0001',
            actions: [{ label: 'Rebuild', run: (img): void => toast({ type: 'info', title: `Rebuilding ${img.name}` }) }],
          },
        ],
      },
    ],
    // Cluster add-on (P13).
    addons: [
      {
        id: 'example-addon',
        label: 'Example add-on',
        description: 'Installs an operator into the cluster.',
        when: conn => conn.kind === 'kubernetes',
        installSteps: [{ label: 'Applying manifests', ms: 1500 }],
        endpoints: () => [{ label: 'Console', url: 'https://example.apps.local' }],
        warning: 'Shown on the card and confirmed before install.',
        disabledReason: conn => (conn.capabilities?.includes('arm64') ? 'Not available on arm64 clusters.' : undefined),
      },
    ],
    // Authentication provider shown in Accounts (P16).
    accounts: [{ id: 'example-sso', label: 'Example SSO', account: 'dev@example.com', scopes: ['openid', 'api.example'] }],
    // Registry in Settings › Registries.
    registries: [{ id: 'registry.example.com', name: 'Example registry', server: 'registry.example.com' }],
    // CLI tool in Settings › CLI Tools (P17).
    cliTools: [{ id: 'example', name: 'example', displayName: 'Example CLI', description: 'Example command-line tool.', version: '1.0.0', latest: '1.1.0' }],
    // Dashboard card (P17).
    // `compact: true` renders a one-line notice above the grid (no capped slot).
    dashboardCards: [{ id: 'example-card', title: 'Example', component: TemplateCard }],
    // Status-bar entry.
    statusItems: [{ id: 'example-status', align: 'right', icon: faFlask, text: () => 'Example', command: 'example.hello' }],
    // Command-palette command.
    commands: [
      { id: 'example.hello', title: 'Say hello', category: 'Example', run: (): void => toast({ type: 'info', title: 'Hello from the template' }) },
      {
        id: 'example.task',
        title: 'Run a long task',
        category: 'Example',
        run: (): void => {
          runTask({ name: 'Example task', ext: ID, steps: [{ label: 'Working', ms: 2000 }], action: { label: 'Open tool', href: '/tools/example-tool' } });
        },
      },
      { id: 'example.open', title: 'Open example tool', category: 'Example', run: (): void => navigate('/tools/example-tool') },
    ],
    // Settings section (properties or a custom component).
    settings: [{ id: 'example', title: 'Example', properties: [{ id: 'example.enabled', title: 'Enable example feature', type: 'boolean', default: true }] }],
    // Onboarding flow.
    onboarding: [{ id: 'example-onboarding', title: 'Set up Example', steps: [{ title: 'Sign in', description: 'Sign in with Example SSO.' }] }],
  },
  // Seed the simulated world once (when the extension is first enabled in a world).
  seed(world): void {
    addKube('kind-dev', [kube('example.io/v1', 'ExampleItem', 'item-a', 'default', { size: 3 }, { state: 'running' })]);
    extData(ID, 'items', [{ id: hexId(8), name: 'first', created: ago({ h: 2 }) }]);
    void world;
  },
};

export default extension;
