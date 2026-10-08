/**
 * Registration API of redhat.rhel-registration. Dependent RHEL extensions
 * (rhel-vms, lightspeed-insights, image-builder…) import it the way a real
 * extension would call an API exported by one of its `extensionDependencies`.
 * State lives in `world.ext['redhat.rhel-registration']` (persisted per scenario).
 */
import { runTask, toast, world } from '#lib/world.svelte.ts';

export const REG_EXT = 'redhat.rhel-registration';
export const ORG_ID = '19830412';

export interface Registration {
  status: 'Current' | 'Not registered' | 'Registering';
  target: 'rhsm' | 'satellite';
  key?: string;
  org?: string;
  consumerUuid?: string;
  /** Epoch ms of the registration (Lightspeed waits for the first check-in). */
  registeredAt?: number;
  /** Satellite content view / lifecycle environment. */
  contentView?: string;
  environment?: string;
}

/** RHSM activation key (`/api/rhsm/v2/activation_keys`). */
export interface ActivationKey {
  id: string;
  name: string;
  role: string;
  usage: string;
  serviceLevel: string;
  releaseVersion: string;
  additionalRepositories: { repositoryLabel: string }[];
}

export interface Subscription {
  sku: string;
  name: string;
  quantity: number;
  consumed: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring soon' | 'Expired';
}

interface Store {
  registrations?: Record<string, Registration>;
  activationKeys?: ActivationKey[];
  subscriptions?: Subscription[];
}

function store(): Store {
  return (world.ext[REG_EXT] ?? {}) as Store;
}

/** Read-only (safe inside `$derived` / templates). */
export function registrationOf(connId: string): Registration | undefined {
  return store().registrations?.[connId];
}

export function activationKeys(): ActivationKey[] {
  return store().activationKeys ?? [];
}

export function subscriptions(): Subscription[] {
  return store().subscriptions ?? [];
}

export function allRegistrations(): Record<string, Registration> {
  return store().registrations ?? {};
}

/** Write (actions only). */
export function setRegistration(connId: string, r: Registration): void {
  world.ext[REG_EXT] ??= {};
  const s = world.ext[REG_EXT] as Store;
  s.registrations = { ...(s.registrations ?? {}), [connId]: r };
}

export function addActivationKey(key: ActivationKey): void {
  world.ext[REG_EXT] ??= {};
  const s = world.ext[REG_EXT] as Store;
  s.activationKeys = [...(s.activationKeys ?? []), key];
}

/** Lines printed by `subscription-manager register`. */
export function registerLog(name: string, key: string, uuid: string, target: Registration['target']): string[] {
  const server = target === 'satellite' ? 'satellite.acme.corp:443/rhsm' : 'subscription.rhsm.redhat.com:443/subscription';
  return [
    `$ sudo subscription-manager register --force --activationkey ${key} --org ${target === 'satellite' ? 'ACME' : ORG_ID}${target === 'satellite' ? ' --serverurl=https://satellite.acme.corp/rhsm' : ''}`,
    `Registering to: ${server}`,
    `The system has been registered with ID: ${uuid}`,
    `The registered system name is: ${name}`,
  ];
}

/** Register a connection (machine or VM) as a task. */
export function registerConnection(conn: { id: string; name: string }, key = 'podman-desktop', target: Registration['target'] = 'rhsm'): void {
  if (!key) {
    toast({ type: 'error', title: 'No activation key selected' });
    return;
  }
  const uuid = crypto.randomUUID();
  setRegistration(conn.id, { status: 'Registering', target, key });
  runTask({
    name: `Register ${conn.name}`,
    ext: REG_EXT,
    steps: [
      ...(target === 'satellite'
        ? [{ label: 'Installing katello-ca-consumer-latest.noarch.rpm', ms: 900, log: ['$ sudo rpm -Uvh http://satellite.acme.corp/pub/katello-ca-consumer-latest.noarch.rpm'] }]
        : []),
      { label: `subscription-manager register (${key})`, ms: 1800, log: registerLog(conn.name, key, uuid, target) },
      { label: 'insights-client --register', ms: 900, log: ['Successfully registered host ' + conn.name, 'Automatic scheduling for Insights has been enabled.'] },
    ],
    action: { label: 'Open subscription', href: `/c/${conn.id}?tab=subscription` },
    onDone: () =>
      setRegistration(conn.id, {
        status: 'Current',
        target,
        key,
        org: target === 'satellite' ? 'ACME' : ORG_ID,
        consumerUuid: uuid,
        registeredAt: Date.now(),
        ...(target === 'satellite' ? { contentView: key.startsWith('rhel10') ? 'RHEL10-Base' : 'RHEL9-Base', environment: 'Dev' } : {}),
      }),
  });
}

export function unregisterConnection(conn: { id: string; name: string }): void {
  runTask({
    name: `Unregister ${conn.name}`,
    ext: REG_EXT,
    steps: [{ label: 'subscription-manager unregister', ms: 1000, log: ['$ sudo subscription-manager unregister', 'System has been unregistered.'] }],
    onDone: () => setRegistration(conn.id, { status: 'Not registered', target: 'rhsm' }),
  });
}
