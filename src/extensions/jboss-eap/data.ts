/**
 * Mock WildFly Glow / eap-maven-plugin / management-API data for the JBoss
 * EAP extension. Shapes follow `wildfly-glow scan` output (context, profile,
 * galleon discovery → feature-packs + layers, identified errors, suggestions)
 * and the JBoss management model (server-state, deployments, data-source).
 *
 * Reads (`glow`, `lastScan`, `builtImage`, `appContainer`) are pure and safe
 * in `$derived`; writers only run from event handlers / task callbacks.
 */
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import { type Container, type ContainerImage, extData, MB, runTask, type TaskStep, toast, world } from '#lib/world.svelte.ts';

import { ENGINE } from '../_appdev/services.ts';
import { isKeycloakFixed } from '../mta/data.ts';

export const EAP_EXT = 'redhat.jboss-eap';
export const DEFAULT_WAR = '~/dev/inventory-service/target/inventory-service.war';
export const IMAGE_NAME = 'localhost/inventory-service';
export const IMAGE_TAG = 'eap81';
export const IMAGE_SIZE = 412_000_000;
export const FULL_IMAGE_SIZE = 780_000_000;
export const APP_CONTAINER = 'inventory-service';
export const RUNTIME_COMPONENT = 'eap8-openjdk21-runtime-openshift-rhel9-container';
export const PRODUCT_VERSION = '8.1.2.GA';

export type ServerVersion = 'eap-8.1' | 'wildfly-39';
export type GlowContext = 'cloud' | 'bare-metal';

export const SERVER_VERSIONS: { value: ServerVersion; label: string }[] = [
  { value: 'eap-8.1', label: 'JBoss EAP 8.1 (8.1.0.GA)' },
  { value: 'wildfly-39', label: 'WildFly 39 (39.0.0.Final)' },
];

export const CONTEXTS: { value: GlowContext; label: string }[] = [
  { value: 'cloud', label: 'Cloud (container image, OpenShift)' },
  { value: 'bare-metal', label: 'Bare metal (server installation)' },
];

export const ADD_ONS: { id: string; description: string }[] = [
  { id: 'postgresql', description: 'PostgreSQL driver and datasource' },
  { id: 'openapi', description: 'MicroProfile OpenAPI document at /openapi' },
  { id: 'h2-database', description: 'H2 driver and default datasource (dev only)' },
];

export interface GlowScan {
  command: string;
  scannedAt: string;
  war: string;
  serverVersion: ServerVersion;
  context: GlowContext;
  profile: 'default';
  featurePacks: string[];
  baseLayer: string;
  layers: string[];
  errors: { message: string; fix: string; addOn?: string }[];
  warnings: string[];
  enabledAddOns: string[];
  suggestedAddOns: string[];
}

export interface EapState {
  scan?: GlowScan;
  imageId?: string;
  containerId?: string;
  /** Last datasource test task (shown in the EAP tab). */
  dsTestTaskId?: string;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

const EMPTY: EapState = {};

export function glow(): EapState {
  return (world.ext[EAP_EXT]?.state as EapState | undefined) ?? EMPTY;
}

export function builtImage(): ContainerImage | undefined {
  const id = glow().imageId;
  return id ? world.images.find(i => i.id === id) : undefined;
}

export function appContainer(): Container | undefined {
  const id = glow().containerId;
  return id ? world.containers.find(c => c.id === id) : undefined;
}

/** Glow discovery for inventory-service (pure). */
export function discover(war: string, serverVersion: ServerVersion, context: GlowContext, addOns: string[]): GlowScan {
  const eap = serverVersion === 'eap-8.1';
  const pg = addOns.includes('postgresql');
  const featurePacks = eap
    ? [
        'org.jboss.eap:wildfly-ee-galleon-pack:8.1.0.GA-redhat-00007',
        ...(context === 'cloud' ? ['org.jboss.eap.cloud:eap-cloud-galleon-pack:2.1.0.Final-redhat-00003'] : []),
        ...(pg || addOns.includes('h2-database') ? ['org.jboss.eap:eap-datasources-galleon-pack:8.1.0.GA-redhat-00002'] : []),
        ...(addOns.includes('openapi') ? ['org.jboss.eap.xp:wildfly-galleon-pack:5.1.0.GA-redhat-00004'] : []),
      ]
    : [
        'org.wildfly:wildfly-galleon-pack:39.0.0.Final',
        ...(context === 'cloud' ? ['org.wildfly.cloud:wildfly-cloud-galleon-pack:8.0.0.Final'] : []),
        ...(pg || addOns.includes('h2-database') ? ['org.wildfly:wildfly-datasources-galleon-pack:10.0.0.Final'] : []),
      ];
  const layers = [
    'jaxrs-server',
    'jpa',
    'ejb-lite',
    context === 'cloud' ? 'remote-activemq' : 'messaging-activemq',
    'elytron-oidc-client',
    'infinispan',
    'web-clustering',
    'microprofile-health',
    ...(pg ? ['postgresql-datasource', 'postgresql-driver'] : []),
    ...(addOns.includes('openapi') ? ['microprofile-openapi'] : []),
    ...(addOns.includes('h2-database') ? ['h2-default-datasource'] : []),
  ];
  const fixed = isKeycloakFixed();
  const flags = [addOns.length ? `--add-ons=${addOns.join(',')}` : '', context === 'cloud' ? '--cloud' : '', eap ? '' : '--server-version=39.0.0.Final'].filter(Boolean);
  return {
    command: `wildfly-glow scan ${war.replace(/^~\/dev\/inventory-service\//, '')} ${flags.join(' ')}`.trim(),
    scannedAt: new Date().toISOString(),
    war,
    serverVersion,
    context,
    profile: 'default',
    featurePacks,
    baseLayer: 'ee-core-profile-server',
    layers,
    errors: pg
      ? []
      : [
          {
            message: 'unbound datasources error: java:jboss/datasources/InventoryDS',
            fix: 'To correct this error, enable one of the following add-ons: mariadb, mssqlserver, mysql, oracle, postgresql',
            addOn: 'postgresql',
          },
        ],
    warnings: fixed
      ? ['oidc.json found in WEB-INF: secure-deployment configured for elytron-oidc-client']
      : ['keycloak.json found in WEB-INF: RH-SSO adapter not supported, use elytron-oidc-client (oidc.json)'],
    enabledAddOns: [...addOns],
    suggestedAddOns: ['openapi', 'lra-coordinator', 'h2-database'].filter(a => !addOns.includes(a)),
  };
}

/* ------------------------------------------------------------------ */
/* Writers                                                             */
/* ------------------------------------------------------------------ */

function state(): EapState {
  return extData<EapState>(EAP_EXT, 'state', {});
}

export function scan(war: string, serverVersion: ServerVersion, context: GlowContext, addOns: string[]): string {
  const result = discover(war, serverVersion, context, addOns);
  const steps: TaskStep[] = [
    { label: `Scanning ${war.split('/').pop()}`, ms: 900, log: [`$ ${result.command}`, 'Glow is scanning...', `context: ${context}`, 'enabled profile: none'] },
    {
      label: 'Galleon discovery',
      ms: 1400,
      log: [
        'galleon discovery',
        '- feature-packs',
        ...result.featurePacks.map(f => `   ${f}`),
        '- layers',
        `   ${result.baseLayer}`,
        ...result.layers.map(l => `   ${l}`),
      ],
    },
    {
      label: 'Checking deployment',
      ms: 700,
      log: [
        ...(result.errors.length ? ['identified errors', ...result.errors.flatMap(e => [`* ${e.message}`, `  ${e.fix}`])] : ['no error identified']),
        'suggestions',
        `* enabled add-ons: ${result.enabledAddOns.join(', ') || 'none'}`,
        `* suggested add-ons: ${result.suggestedAddOns.join(', ')}`,
        ...result.warnings.map(w => `WARN ${w}`),
      ],
    },
  ];
  return runTask({
    name: 'WildFly Glow scan',
    ext: EAP_EXT,
    steps,
    onDone: () => {
      state().scan = { ...result, scannedAt: new Date().toISOString() };
    },
  });
}

export function buildImage(s: GlowScan): string {
  const all = [s.baseLayer, ...s.layers];
  const ref = `${IMAGE_NAME}:${IMAGE_TAG}`;
  const runtime = s.serverVersion === 'eap-8.1' ? 'registry.redhat.io/jboss-eap-8/eap81-openjdk21-runtime-openshift-rhel9:latest' : 'quay.io/wildfly/wildfly-runtime:latest-jdk21';
  return runTask({
    name: 'eap:image inventory-service',
    ext: EAP_EXT,
    steps: [
      {
        label: 'Resolving feature packs',
        ms: 1600,
        log: ['$ mvn org.jboss.eap.plugins:eap-maven-plugin:1.0.1.Final-redhat-00001:image', ...s.featurePacks.map(f => `Resolving ${f}`), 'Using channel org.jboss.eap.channels:eap-8.1'],
      },
      { label: `Provisioning ${all.length} layers`, ms: 2200, log: [`Provisioning server in target/server: ${all.join(', ')}`, 'Generating configuration standalone.xml (cloud)', 'Server provisioned in target/server (167 MB)'] },
      { label: 'Copying deployment inventory-service.war', ms: 600, log: ['Copying target/inventory-service.war to target/server/standalone/deployments/ROOT.war'] },
      {
        label: 'podman build',
        ms: 2000,
        log: [
          `STEP 1/4: FROM ${runtime}`,
          'STEP 2/4: COPY --chown=jboss:root target/server $JBOSS_HOME',
          `STEP 3/4: LABEL org.jboss.eap.layers="${all.join(',')}"`,
          'STEP 4/4: RUN chmod -R ug+rwX $JBOSS_HOME',
          `COMMIT ${ref}`,
          `Successfully tagged ${ref}`,
        ],
      },
    ],
    action: { label: 'Open images', href: `/c/${ENGINE}/images` },
    onDone: () => {
      world.images = world.images.filter(i => !(i.name === IMAGE_NAME && i.tag === IMAGE_TAG && i.engineId === ENGINE));
      const image = mkImage(ENGINE, {
        name: IMAGE_NAME,
        tag: IMAGE_TAG,
        sizeMB: IMAGE_SIZE / MB,
        ageD: 0,
        base: 'ubi9',
        labels: {
          'org.jboss.eap.layers': all.join(','),
          'org.jboss.eap.version': PRODUCT_VERSION,
          'com.redhat.component': RUNTIME_COMPONENT,
          'io.k8s.display-name': 'inventory-service on JBoss EAP 8.1',
        },
      });
      image.created = Date.now();
      world.images.push(image);
      state().imageId = image.id;
    },
  });
}

export function runServer(): string | undefined {
  const image = builtImage();
  if (!image) return undefined;
  const ref = `${image.name}:${image.tag}`;
  const container = mkContainer(ENGINE, {
    name: APP_CONTAINER,
    image: ref,
    ports: [8080, 9990],
    labels: { 'com.redhat.component': RUNTIME_COMPONENT, 'org.jboss.eap.version': PRODUCT_VERSION },
    env: ['POSTGRESQL_SERVICE_HOST=postgres', 'POSTGRESQL_DATABASE=inventory', 'OIDC_PROVIDER_URL=http://localhost:8180/realms/acme'],
    ageH: 0,
    upM: 0,
    logs: [
      `WFLYSRV0049: JBoss EAP ${PRODUCT_VERSION} (WildFly Core 27.0.1.Final-redhat-00001) starting`,
      'WFLYJCA0001: Bound data source [java:jboss/datasources/InventoryDS]',
      'WFLYUT0021: Registered web context: \'/inventory\' for server \'default-server\'',
      'WFLYSRV0010: Deployed "inventory-service.war" (runtime-name : "inventory-service.war")',
      'WFLYSRV0060: Http management interface listening on http://0.0.0.0:9990/management',
      `WFLYSRV0025: JBoss EAP ${PRODUCT_VERSION} (WildFly Core 27.0.1.Final-redhat-00001) started in 3214ms - Started 412 of 498 services`,
    ],
  });
  const summary = `/c/${ENGINE}/containers/${container.id}/summary`;
  return runTask({
    name: `Run ${APP_CONTAINER}`,
    ext: EAP_EXT,
    steps: [
      { label: 'Creating container', ms: 700, log: [`$ podman run -d --name ${APP_CONTAINER} -p 8080:8080 -p 9990:9990 --env-file .env ${ref}`, container.id] },
      { label: 'Waiting for WFLYSRV0025', ms: 1300, log: container.logs?.slice(-2) },
    ],
    action: { label: `Open ${APP_CONTAINER}`, href: summary },
    onDone: () => {
      world.containers = world.containers.filter(c => !(c.name === APP_CONTAINER && c.engineId === ENGINE));
      world.containers.push({ ...container, startedAt: Date.now(), created: Date.now() });
      state().containerId = container.id;
    },
  });
}

/** `/subsystem=datasources/data-source=InventoryDS:test-connection-in-pool` as a task. */
export function testDatasource(): string {
  const postgres = world.containers.some(c => c.state === 'RUNNING' && /postgres/.test(c.image));
  const cmd = 'jboss-cli.sh --connect --controller=localhost:9990 --command="/subsystem=datasources/data-source=InventoryDS:test-connection-in-pool"';
  const id = runTask({
    name: 'Test connection InventoryDS',
    ext: EAP_EXT,
    steps: [
      { label: 'Connecting to localhost:9990', ms: 500, log: [`$ ${cmd}`] },
      { label: 'test-connection-in-pool', ms: 700, log: postgres ? ['{"outcome" => "success", "result" => [true]}'] : ['{"outcome" => "failed", "failure-description" => "WFLYJCA0040: failed to invoke operation: WFLYJCA0047: Connection is not valid"}'] },
    ],
    failAt: postgres ? undefined : 1,
    failMessage: 'Connection refused: postgres:5432. Start a PostgreSQL service and retry.',
  });
  state().dsTestTaskId = id;
  return id;
}

export function openConsole(): void {
  toast({ type: 'info', title: 'Opening http://localhost:9990/console', body: 'Management console of JBoss EAP 8.1 (user admin)' });
}

