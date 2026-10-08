// App developer journeys (docs/research/_appdev-scenario.md):
// 1 Dev Services visible · 2 event flow in Kafka · 3 CDC with Debezium ·
// 4 migrate with MTA + EAP · 5 profile with Cryostat · supporting moments.
export const scenario = 'appdev';

const ENGINE = '/c/podman-machine-default';

/** @param {Awaited<ReturnType<typeof import('../lib.mjs').launch>>} t */
export async function journey(t) {
  const { page } = t;
  const content = page.getByRole('region', { name: 'Tab Content' });

  await t.open('/');
  await t.shot('dashboard');

  // 1. Dev Services, finally visible -----------------------------------------
  await t.open(`${ENGINE}/containers`);
  await page.getByRole('table', { name: 'container' }).waitFor();
  await page.getByRole('row', { name: 'acme-orders', exact: true }).waitFor();
  await t.shot('j1-containers-grouped');
  await page.getByRole('row', { name: 'acme-orders', exact: true }).getByRole('button', { name: 'Stop all' }).click();
  await page.waitForTimeout(1600);
  await t.shot('j1-devservices-stopped');
  await page.getByRole('row', { name: 'acme-orders', exact: true }).getByRole('button', { name: 'Start all' }).click();

  await t.open('/tools/quarkus');
  await page.getByRole('region', { name: 'Project acme-orders' }).waitFor();
  await t.shot('j1-quarkus-tool');
  await page.getByRole('button', { name: /^kafka/ }).first().click();
  await page.getByRole('heading', { name: 'sharp_hopper' }).waitFor();
  await t.shot('j1-devservice-tab');

  await t.open('/tools/testcontainers', { speed: '5' });
  await page.getByRole('region', { name: 'Environment' }).waitFor();
  await t.shot('j1-testcontainers');

  // 2. Event flow in one place ------------------------------------------------
  await t.open('/c/acme-kafka');
  await t.shot('j2-kafka-overview');
  await t.open('/c/acme-kafka', { tab: 'console' });
  await page.getByLabel('Kafka console').waitFor();
  await t.shot('j2-kafka-console');
  await t.open('/c/acme-kafka/topics');
  await page.getByRole('table', { name: 'topics' }).waitFor();
  await t.shot('j2-topics');
  await page.getByRole('button', { name: 'orders.created' }).first().click();
  await page.getByRole('heading', { name: 'orders.created' }).waitFor();
  await t.shot('j2-topic-messages');
  await page.locator('#open-tabs-list-schema-link').click();
  await page.getByRole('region', { name: /OrderCreated/ }).waitFor();
  await t.shot('j2-topic-schema');
  await t.open('/c/acme-kafka/consumer-groups', { speed: '5' });
  await page.getByRole('button', { name: 'inventory-projector' }).first().click();
  await page.getByRole('heading', { name: 'inventory-projector' }).waitFor();
  await t.shot('j2-group-lag');
  await page.getByRole('button', { name: 'Reset offsets' }).click();
  await t.shot('j2-reset-confirm');
  await page.getByRole('dialog').getByRole('button', { name: 'Reset offsets' }).click();
  await page.getByText('Total lag (messages)').waitFor();
  await page.waitForTimeout(1500);
  await t.shot('j2-group-reset');

  // 3. CDC from my database in two clicks ------------------------------------
  await t.open(`${ENGINE}/containers`, { speed: '5' });
  const pgRow = page.getByRole('row', { name: 'acme-postgres', exact: true });
  await pgRow.getByRole('button', { name: 'kebab menu' }).click();
  await page.getByText('Capture changes with Debezium').click();
  await page.getByLabel('Change data capture').waitFor();
  await t.shot('j3-cdc-prereq');
  await page.getByRole('button', { name: 'Enable logical replication' }).click();
  await page.getByText('wal_level = logical', { exact: true }).waitFor({ timeout: 15000 });
  await t.shot('j3-cdc-form');
  await page.getByRole('button', { name: 'Create connector' }).click();
  await page.getByRole('region', { name: 'Connector acme-orders-cdc' }).waitFor({ timeout: 20000 });
  await t.shot('j3-cdc-connector');
  await page.getByRole('button', { name: 'Open orders.cdc.public.orders' }).click();
  await page.getByRole('heading', { name: 'orders.cdc.public.orders' }).waitFor();
  await t.shot('j3-cdc-topic');
  await t.open('/c/acme-kafka/connectors');
  await page.getByRole('table', { name: 'connectors' }).waitFor();
  await t.shot('j3-connectors');

  // 4. Migrate the legacy app with AI help ----------------------------------
  await t.open('/tools/mta', { speed: '5' });
  await t.shot('j4-mta-projects');
  await page.getByRole('button', { name: 'Analyze', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Analyze application' }).waitFor();
  await t.shot('j4-mta-analyze-form');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForTimeout(1200);
  await t.shot('j4-mta-analyzing');
  await page.getByLabel('Story points').first().waitFor({ timeout: 30000 });
  await t.shot('j4-mta-report');
  await page.getByRole('button', { name: 'keycloak-openid-00001' }).first().click();
  await page.getByRole('button', { name: 'Generate fix with Konveyor AI' }).first().click();
  await page.getByRole('dialog').getByLabel('Proposed diff').waitFor({ timeout: 20000 });
  await t.shot('j4-mta-ai-diff');
  await page.getByRole('dialog').getByRole('button', { name: 'Accept' }).click();
  await page.waitForTimeout(500);
  await t.shot('j4-mta-fixed');
  await page.getByRole('button', { name: 'Containerize with EAP 8.1' }).click();
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await page.getByRole('button', { name: 'Enable postgresql' }).waitFor({ timeout: 20000 });
  await t.shot('j4-eap-scan-error');
  await page.getByRole('button', { name: 'Enable postgresql' }).click();
  await page.getByRole('button', { name: 'Build image' }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await t.shot('j4-eap-layers');
  await page.getByRole('button', { name: 'Build image' }).click();
  await page.getByText('368 MB smaller', { exact: false }).first().waitFor({ timeout: 30000 });
  await t.shot('j4-eap-image');

  // 5. Profile the running service --------------------------------------------
  await t.open(`${ENGINE}/containers`, { speed: '3' });
  await page.getByRole('row', { name: 'acme-orders-dev', exact: true }).getByRole('button', { name: 'kebab menu' }).click();
  await page.getByText('Start JFR recording').click();
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  await t.shot('j5-jfr-tab');
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.waitForTimeout(900);
  await t.shot('j5-jfr-running');
  await page.getByRole('region', { name: 'Analysis report' }).waitFor({ timeout: 30000 });
  await t.shot('j5-jfr-analysis');
  await t.open('/tools/cryostat');
  await t.shot('j5-cryostat-tool');

  // supporting moments ---------------------------------------------------------
  await t.open('/c/acme-keycloak/clients', { realm: 'acme', client: 'acme-orders' });
  await page.getByRole('button', { name: 'Copy Quarkus config', exact: true }).click();
  await t.shot('keycloak-client');
  await t.open('/c/developer-hub/templates', { template: 'quarkus-kafka-service', speed: '5' });
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Open in catalog' }).first().waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Open in catalog' }).first().click();
  await page.waitForTimeout(500);
  await t.shot('rhdh-catalog-new-component');
  await t.open('/tools/kaoto', { speed: '5' });
  await page.getByRole('button', { name: 'Run with Camel JBang' }).click();
  await page.getByRole('button', { name: 'Stop orders-to-kafka' }).waitFor({ timeout: 20000 });
  await t.shot('kaoto-running');
  await t.open('/tools/devcontainers', { open: '1', speed: '5' });
  await page.getByRole('button', { name: 'Start dev container' }).click();
  await page.getByRole('button', { name: 'Open container' }).waitFor({ timeout: 20000 });
  await t.shot('devcontainer-up');
  await page.getByRole('button', { name: 'Open container' }).click();
  await page.locator('#open-tabs-list-debug-link').click();
  await page.getByRole('button', { name: 'Start debug shell' }).click();
  const term = page.getByRole('textbox', { name: 'Terminal input' });
  await term.waitFor({ timeout: 15000 });
  await term.fill('ps aux');
  await term.press('Enter');
  await t.shot('debug-shell');
  await t.open('/c/amq-broker/queues');
  await t.shot('amq-stopped');

  // services catalog (one generic catalog drives every service)
  await t.open('/tools/services');
  await page.getByRole('region', { name: 'Add a service' }).waitFor();
  await t.shot('services-catalog');
  await page.getByRole('button', { name: 'Create Streams for Apache Kafka' }).click();
  await page.getByRole('textbox', { name: 'Name' }).waitFor();
  await t.shot('services-create-kafka');
}
