/**
 * Services-catalog pattern (podman-desktop.services, O10): every local backing
 * service (Kafka, Apicurio, Keycloak, Data Grid, AMQ, PostgreSQL, Valkey…) is
 * declared once with `serviceFactory(spec)`. The result is a regular P12
 * connection factory of kind `service`, so the generic "Services catalog" tool,
 * Settings › Resources and the command palette all pick it up, and the
 * created P8 service connection is backed by a container labelled
 * `io.podman-desktop.service=<connection id>` (grouped in the containers list, P10).
 */
import { mkContainer } from '#lib/ext/helpers.ts';
import type { ConnectionDef, ConnectionStatus, FactoryDef, FormField, FormValues } from '#lib/ext/types.ts';
import type { Container, TaskStep, World } from '#lib/world.svelte.ts';

export const SERVICE_LABEL = 'io.podman-desktop.service';
export const SERVICE_KIND_LABEL = 'io.podman-desktop.service.kind';
/** Set only on services made of several containers (broker + console…): those are grouped (P10). */
export const SERVICE_GROUP_LABEL = 'io.podman-desktop.service.group';
/** Engine every local service runs on in the appdev scenario. */
export const ENGINE = 'podman-machine-default';

export interface ServiceSpec {
  /** Service kind, also the factory id: `kafka`, `keycloak`… */
  kind: string;
  providerId: string;
  providerName: string;
  /** Catalog title, e.g. "Streams for Apache Kafka". */
  title: string;
  description: string;
  defaultName: string;
  images: { value: string; label: string }[];
  port: number;
  /** Connection endpoint from the port. */
  endpoint: (port: number) => string;
  version: string;
  capabilities: string[];
  extraFields?: FormField[];
  /** Image size shown in the pull step. */
  pullMB: number;
  /** Log lines of the "waiting for readiness" step. */
  readyLog: string[];
  details?: (v: FormValues) => Record<string, string>;
  /** Extra containers started with the service (console, UI…): name suffix + image + port. */
  sidecars?: { suffix: string; image: string; port?: number }[];
  /** Seed extension data for the new connection. */
  onCreated?: (world: World, conn: ConnectionDef, values: FormValues) => void;
}

/** Container backing a service connection. */
export function serviceContainer(
  connId: string,
  kind: string,
  seed: { name: string; image: string; ports?: (number | [number, number])[]; state?: Container['state']; env?: string[]; command?: string; upM?: number; logs?: string[]; group?: boolean },
): Container {
  const { group, ...rest } = seed;
  return mkContainer(ENGINE, { ...rest, labels: { [SERVICE_LABEL]: connId, [SERVICE_KIND_LABEL]: kind, ...(group ? { [SERVICE_GROUP_LABEL]: connId } : {}) } });
}

export function serviceConnection(spec: ServiceSpec, id: string, port: number, status: ConnectionStatus, details?: Record<string, string>): ConnectionDef {
  return {
    id,
    name: id,
    kind: 'service',
    providerId: spec.providerId,
    providerName: spec.providerName,
    initialStatus: status,
    endpoint: spec.endpoint(port),
    version: spec.version,
    capabilities: [`service:${spec.kind}`, ...spec.capabilities],
    details: { 'Runs on': ENGINE, ...details },
  };
}

export function serviceFactory(spec: ServiceSpec): FactoryDef {
  return {
    id: spec.kind,
    label: `Create ${spec.title}`,
    providerId: spec.providerId,
    kind: 'service',
    description: spec.description,
    fields: [
      { id: 'name', label: 'Name', type: 'text', default: spec.defaultName, required: true },
      { id: 'image', label: 'Image', type: 'select', default: spec.images[0]?.value, options: spec.images },
      { id: 'port', label: 'Host port', type: 'number', default: spec.port },
      ...(spec.extraFields ?? []),
      { id: 'start', label: 'Start the service now', type: 'checkbox', default: true },
    ],
    steps: (v): TaskStep[] => [
      { label: `Pulling ${String(v.image)}`, ms: 2200, log: [`Trying to pull ${String(v.image)}...`, `Copying blob sha256:4f4fb700ef54 done | ${spec.pullMB} MB`] },
      ...(spec.sidecars ?? []).map(s => ({ label: `Pulling ${s.image}`, ms: 900 })),
      { label: `Starting ${String(v.name)}`, ms: 1400, log: [`podman run -d --name ${String(v.name)} -p ${String(v.port)}:${spec.port} --label ${SERVICE_LABEL}=${String(v.name)} ${String(v.image)}`] },
      ...(v.start ? [{ label: 'Waiting for readiness', ms: 1600, log: spec.readyLog }] : []),
    ],
    createConnection: (v): ConnectionDef => serviceConnection(spec, String(v.name), Number(v.port), v.start ? 'started' : 'stopped', { Image: String(v.image), ...spec.details?.(v) }),
    onCreated: (world, conn, values): void => {
      const state = values.start ? 'RUNNING' : 'CREATED';
      const group = !!spec.sidecars?.length;
      world.containers.push(
        serviceContainer(conn.id, spec.kind, { name: conn.id, image: String(values.image), ports: [[Number(values.port), spec.port]], state, upM: 0, group }),
        ...(spec.sidecars ?? []).map(s => serviceContainer(conn.id, spec.kind, { name: `${conn.id}-${s.suffix}`, image: s.image, ports: s.port ? [s.port] : [], state, upM: 0, group })),
      );
      spec.onCreated?.(world, conn, values);
    },
  };
}

/** `true` when the connection is a service of the given kind. */
export function isService(conn: { kind: string; capabilities?: string[] }, kind: string): boolean {
  return conn.kind === 'service' && !!conn.capabilities?.includes(`service:${kind}`);
}
