/**
 * Quarkus Dev Services mock data: labels from io.quarkus.devservices.common.Labels
 * (`io.quarkus.devservice`, `quarkus-dev-service-<x>`, launch-mode, process-uuid)
 * plus the Testcontainers marker labels Dev Services carry.
 */
import { mkContainer } from '#lib/ext/helpers.ts';
import type { Container } from '#lib/world.svelte.ts';
import { world } from '#lib/world.svelte.ts';

export const QUARKUS_EXT = 'redhat.quarkus';
export const ENGINE = 'podman-machine-default';
export const DEVSERVICE = 'io.quarkus.devservice';
export const PROCESS_UUID = 'io.quarkus.devservice.process-uuid';

export interface DevServiceSpec {
  service: string;
  name: string;
  image: string;
  port: [number, number];
  extraLabels?: Record<string, string>;
  /** Config Quarkus injects into the app. */
  config: Record<string, string>;
  log: string;
}

export interface QuarkusProject {
  name: string;
  path: string;
  platform: string;
  extensions: string[];
  processUuid: string;
  sessionId: string;
  devMode: { running: boolean; pid: number; url: string; devUi: string; debugPort: number };
  devServices: DevServiceSpec[];
}

export const ACME_ORDERS: QuarkusProject = {
  name: 'acme-orders',
  path: '~/dev/acme-orders',
  platform: '3.33.3.redhat-00001',
  extensions: ['rest-jackson', 'jdbc-postgresql', 'hibernate-orm-panache', 'messaging-kafka', 'apicurio-registry-avro', 'oidc', 'smallrye-health'],
  processUuid: '5d2b1e0a-77c1-4f53-9a0e-2f6c1b8d4e11',
  sessionId: 'a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa',
  devMode: { running: true, pid: 48211, url: 'http://localhost:8080', devUi: 'http://localhost:8080/q/dev-ui', debugPort: 5005 },
  devServices: [
    {
      service: 'postgresql',
      name: 'quizzical_pasteur',
      image: 'docker.io/library/postgres:18',
      port: [32788, 5432],
      extraLabels: { datasource: 'default' },
      config: { 'quarkus.datasource.jdbc.url': 'jdbc:postgresql://localhost:32788/quarkus?loggerLevel=OFF', 'quarkus.datasource.username': 'quarkus' },
      log: 'Dev Services for default datasource (postgresql) started - container ID is 6f1c2a9d0b3e',
    },
    {
      service: 'kafka',
      name: 'sharp_hopper',
      image: 'docker.io/apache/kafka-native:4.2.0',
      port: [32791, 9092],
      extraLabels: { 'quarkus-dev-service-kafka': 'kafka' },
      config: { 'kafka.bootstrap.servers': 'OUTSIDE://localhost:32791' },
      log: 'Dev Services for Kafka started. Other Quarkus applications in dev mode will find the broker automatically.',
    },
    {
      service: 'keycloak',
      name: 'elated_lovelace',
      image: 'quay.io/keycloak/keycloak:26.7.4',
      port: [32795, 8080],
      extraLabels: { 'quarkus-dev-service-keycloak': 'quarkus' },
      config: { 'quarkus.oidc.auth-server-url': 'http://localhost:32795/realms/quarkus', 'quarkus.oidc.client-id': 'quarkus-app' },
      log: 'Dev Services for Keycloak started.',
    },
    {
      service: 'apicurio-registry',
      name: 'nostalgic_babbage',
      image: 'quay.io/apicurio/apicurio-registry:3.3.1',
      port: [32797, 8080],
      extraLabels: { 'quarkus-dev-service-apicurio-registry': 'apicurio-registry' },
      config: { 'mp.messaging.connector.smallrye-kafka.apicurio.registry.url': 'http://localhost:32797/apis/registry/v3' },
      log: 'Dev Services for Apicurio Registry started.',
    },
  ],
};

export const PROJECTS: QuarkusProject[] = [ACME_ORDERS];

export function projectByUuid(uuid: string): QuarkusProject | undefined {
  return PROJECTS.find(p => p.processUuid === uuid);
}

export function devServiceContainer(p: QuarkusProject, s: DevServiceSpec): Container {
  return mkContainer(ENGINE, {
    name: s.name,
    image: s.image,
    ports: [s.port],
    upM: 42,
    labels: {
      [DEVSERVICE]: s.service,
      'io.quarkus.devservice.launch-mode': 'DEVELOPMENT',
      [PROCESS_UUID]: p.processUuid,
      'org.testcontainers': 'true',
      'org.testcontainers.lang': 'java',
      'org.testcontainers.version': '2.0.5',
      'org.testcontainers.sessionId': p.sessionId,
      ...s.extraLabels,
    },
    logs: [s.log],
  });
}

export function devServicesOf(p: QuarkusProject): Container[] {
  return world.containers.filter(c => c.labels[PROCESS_UUID] === p.processUuid);
}

/** Dev-mode state persisted in the world (`running` flag per project). */
export function isDevModeRunning(p: QuarkusProject): boolean {
  const state = world.ext[QUARKUS_EXT]?.devMode as Record<string, boolean> | undefined;
  return state?.[p.name] ?? p.devMode.running;
}

export function setDevMode(p: QuarkusProject, running: boolean): void {
  world.ext[QUARKUS_EXT] ??= {};
  const store = world.ext[QUARKUS_EXT];
  store.devMode = { ...((store.devMode as Record<string, boolean> | undefined) ?? {}), [p.name]: running };
}
