/**
 * Mock RHDH Local data: Backstage catalog entities (`backstage.io/v1alpha1`),
 * software templates (`scaffolder.backstage.io/v1beta3`) and the
 * `configs/dynamic-plugins/dynamic-plugins.override.yaml` plugin list.
 */
import { mkContainer } from '#lib/ext/helpers.ts';
import type { ConnectionDef } from '#lib/ext/types.ts';
import { type Container, extData, world } from '#lib/world.svelte.ts';

import { ENGINE } from '../_appdev/services.ts';

export const RHDH_EXT = 'redhat.rhdh-local';
export const RHDH_CONN = 'developer-hub';
export const RHDH_IMAGE = 'quay.io/rhdh-community/rhdh:1.10.3';
export const COMPOSE_PROJECT = 'com.docker.compose.project';
export const COMPOSE_SERVICE = 'com.docker.compose.service';

export type EntityKind = 'Component' | 'API' | 'System' | 'Group' | 'User' | 'Template';

export interface Entity {
  kind: EntityKind;
  name: string;
  namespace: string;
  title?: string;
  description?: string;
  type?: string;
  lifecycle?: string;
  owner?: string;
  system?: string;
  providesApis?: string[];
  memberOf?: string[];
  annotations?: Record<string, string>;
  links?: { title: string; url: string }[];
  /** Registered from a template run (scaffolder task id). */
  scaffolderTask?: string;
}

export interface TemplateParam {
  id: string;
  title: string;
  default: string;
  description?: string;
}

export interface SoftwareTemplate {
  name: string;
  title: string;
  description: string;
  owner: string;
  type: string;
  tags: string[];
  parameters: TemplateParam[];
  steps: { id: string; action: string; name: string }[];
}

export interface DynamicPlugin {
  package: string;
  disabled: boolean;
  /** Frontend route contributed (shown in the list). */
  route?: string;
  /** Saved in the override file but the installer has not run yet. */
  pending?: boolean;
}

export interface Hub {
  entities: Entity[];
  templates: SoftwareTemplate[];
  plugins: DynamicPlugin[];
}

const STEPS = [
  { id: 'fetch', action: 'fetch:template', name: 'Fetch skeleton + template' },
  { id: 'publish', action: 'publish:github', name: 'Publish to GitHub' },
  { id: 'register', action: 'catalog:register', name: 'Register in the catalog' },
];

function params(name: string): TemplateParam[] {
  return [
    { id: 'name', title: 'Name', default: name, description: 'Unique name of the component (also the repository name).' },
    { id: 'owner', title: 'Owner', default: 'group:acme/orders-team', description: 'Group or user that owns the component.' },
    { id: 'repoUrl', title: 'Repository location', default: `github.com?owner=acme&repo=${name}`, description: 'RepoUrlPicker: host, owner and repository.' },
  ];
}

export function sampleHub(): Hub {
  return {
    entities: [
      {
        kind: 'Component',
        name: 'acme-orders',
        namespace: 'default',
        description: 'Order intake REST service (Quarkus)',
        type: 'service',
        lifecycle: 'production',
        owner: 'group:acme/orders-team',
        system: 'acme-commerce',
        providesApis: ['orders-api'],
        annotations: { 'backstage.io/techdocs-ref': 'dir:.', 'github.com/project-slug': 'acme/acme-orders' },
        links: [{ title: 'Repository', url: 'https://github.com/acme/acme-orders' }],
      },
      {
        kind: 'Component',
        name: 'inventory-service',
        namespace: 'default',
        description: 'Legacy stock and reservations service (JBoss EAP)',
        type: 'service',
        lifecycle: 'deprecated',
        owner: 'group:acme/warehouse-team',
        system: 'acme-commerce',
        links: [{ title: 'Repository', url: 'https://github.com/acme/inventory-service' }],
      },
      { kind: 'API', name: 'orders-api', namespace: 'default', description: 'Orders REST API', type: 'openapi', lifecycle: 'production', owner: 'group:acme/orders-team', system: 'acme-commerce' },
      { kind: 'System', name: 'acme-commerce', namespace: 'default', description: 'Online shop: orders, payments and inventory', owner: 'group:acme/platform' },
      { kind: 'Group', name: 'orders-team', namespace: 'acme', title: 'Orders team', type: 'team' },
      { kind: 'User', name: 'maya', namespace: 'default', title: 'Maya Lindqvist', memberOf: ['acme/orders-team'] },
    ],
    templates: [
      {
        name: 'quarkus-kafka-service',
        title: 'Quarkus Kafka service',
        description: 'Quarkus 3 service with Kafka messaging (SmallRye Reactive Messaging), Dev Services, a Containerfile and a catalog-info.yaml.',
        owner: 'group:acme/platform',
        type: 'service',
        tags: ['quarkus', 'kafka', 'java'],
        parameters: params('shipping-service'),
        steps: STEPS,
      },
      {
        name: 'quarkus-postgresql-rest',
        title: 'Quarkus + PostgreSQL REST service',
        description: 'REST service with Hibernate ORM Panache, Flyway migrations and an OpenAPI definition registered as an API entity.',
        owner: 'group:acme/platform',
        type: 'service',
        tags: ['quarkus', 'postgresql', 'rest'],
        parameters: params('billing-service'),
        steps: STEPS,
      },
      {
        name: 'camel-integration',
        title: 'Camel integration',
        description: 'Red Hat build of Apache Camel integration (YAML DSL) runnable with Camel JBang and exportable to Quarkus.',
        owner: 'group:acme/integration-team',
        type: 'integration',
        tags: ['camel', 'kaoto', 'integration'],
        parameters: params('orders-integration'),
        steps: STEPS,
      },
    ],
    plugins: [
      { package: './dynamic-plugins/dist/backstage-community-plugin-tech-radar', disabled: false, route: '/tech-radar' },
      { package: 'oci://quay.io/acme/backstage-plugin-orders-dashboard:1.0.2!acme-plugin-orders-dashboard', disabled: false, route: '/orders' },
      { package: './dynamic-plugins/dist/backstage-community-plugin-quay', disabled: true },
    ],
  };
}

const EMPTY: Hub = { entities: [], templates: [], plugins: [] };

/** Read-only accessor (safe in `$derived`). */
export function hub(connId: string): Hub {
  return (world.ext[RHDH_EXT]?.[connId] as Hub | undefined) ?? EMPTY;
}

/** Create the data (writes: seed / handlers only). */
export function ensureHub(connId: string): Hub {
  return extData<Hub>(RHDH_EXT, connId, sampleHub());
}

export function entityRef(e: Entity): string {
  return `${e.kind.toLowerCase()}:${e.namespace === 'default' ? '' : `${e.namespace}/`}${e.name}`;
}

export function pluginName(p: DynamicPlugin): string {
  const bang = p.package.indexOf('!');
  if (bang >= 0) return p.package.slice(bang + 1);
  return p.package.split('/').pop() ?? p.package;
}

export function pluginSource(p: DynamicPlugin): string {
  if (p.package.startsWith('oci://')) return 'OCI image';
  if (p.package.startsWith('./local-plugins')) return 'Local';
  return 'Bundled';
}

/** `dynamic-plugins.override.yaml` rendering. */
export function overrideYaml(plugins: DynamicPlugin[]): string {
  return [
    'includes:',
    '  - dynamic-plugins.default.yaml',
    'plugins:',
    ...plugins.flatMap(p => [`  - package: ${p.package}`, `    disabled: ${String(p.disabled)}`]),
  ].join('\n');
}

export function rhdhConnection(id: string, status: ConnectionDef['initialStatus'], details: Record<string, string> = {}, port = 7007): ConnectionDef {
  return {
    id,
    name: id,
    kind: 'service',
    providerId: 'rhdh-local',
    providerName: 'Developer Hub',
    initialStatus: status,
    endpoint: `http://localhost:${port}`,
    version: '1.10.3',
    capabilities: ['service:rhdh', 'backstage'],
    details: { 'Runs on': ENGINE, 'Compose project': 'rhdh-local', ...details },
  };
}

/** The four containers of the rhdh-local compose project. */
export function composeContainers(project: string, image: string, lightspeed: boolean, upM = 48, port = 7007): Container[] {
  const prefix = project === 'rhdh-local' ? '' : `${project}-`;
  const labels = (service: string): Record<string, string> => ({
    [COMPOSE_PROJECT]: project,
    [COMPOSE_SERVICE]: service,
    'com.docker.compose.project.working_dir': '~/.local/share/rhdh-local',
    'com.docker.compose.project.config_files': 'compose.yaml',
  });
  return [
    mkContainer(ENGINE, {
      name: `${prefix}rhdh`,
      image,
      ports: [[port, 7007], 9229],
      labels: labels('rhdh'),
      command: '/opt/app-root/src/wait-for-plugins-and-start.sh',
      env: ['BASE_URL=http://localhost:7007', 'NODE_OPTIONS=--no-node-snapshot'],
      upM,
      logs: [
        "{\"level\":\"info\",\"message\":\"Loaded dynamic frontend plugin 'acme.plugin-orders-dashboard' from 'oci://quay.io/acme/backstage-plugin-orders-dashboard:1.0.2'\",\"plugin\":\"dynamic-plugins\"}",
        '{"level":"info","message":"Listening on :7007","service":"rootHttpRouter"}',
      ],
    }),
    mkContainer(ENGINE, {
      name: `${prefix}rhdh-plugins-installer`,
      image,
      state: 'EXITED',
      labels: labels('install-dynamic-plugins'),
      command: './prepare-and-install-dynamic-plugins.sh',
      logs: ['======= Installing dynamic plugin oci://quay.io/acme/backstage-plugin-orders-dashboard:1.0.2!acme-plugin-orders-dashboard', '==> Successfully installed dynamic plugin acme-plugin-orders-dashboard'],
    }),
    ...(lightspeed
      ? [
          mkContainer(ENGINE, { name: `${prefix}lightspeed-core`, image: 'quay.io/lightspeed-core/lightspeed-stack:0.6.4', ports: [8080], labels: labels('lightspeed-core'), upM }),
          mkContainer(ENGINE, { name: `${prefix}rag-init`, image: 'quay.io/redhat-ai-dev/rag-content:release-1.10-lls-0.5.0-8c231a3b', state: 'EXITED', labels: labels('rag-init') }),
        ]
      : []),
  ];
}
