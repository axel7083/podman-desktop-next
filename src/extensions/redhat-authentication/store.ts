/**
 * Account API of redhat.redhat-authentication (the single owner of Red Hat SSO,
 * the registry service account, RHSM activation keys and subscriptions).
 * Dependents (rhel-registration, rhel-vms, image-builder…) import it the way
 * a real extension calls an API exported by one of its `extensionDependencies`.
 * State: `world.ext['redhat.redhat-authentication']` (persisted per scenario).
 */
import { world } from '#lib/world.svelte.ts';

import { ACTIVATION_KEYS, type ActivationKey, SUBSCRIPTIONS, type Subscription } from './data.ts';

export const ACCOUNT_EXT = 'redhat.redhat-authentication';

interface AccountStore {
  activationKeys?: ActivationKey[];
  subscriptions?: Subscription[];
}

function store(): AccountStore {
  return (world.ext[ACCOUNT_EXT] ?? {}) as AccountStore;
}

/** Seed (called once per world by the account extension). */
export function seedAccount(): void {
  world.ext[ACCOUNT_EXT] = { ...(world.ext[ACCOUNT_EXT] ?? {}), activationKeys: structuredClone(ACTIVATION_KEYS), subscriptions: structuredClone(SUBSCRIPTIONS) };
}

/** Read-only (safe inside `$derived` / templates). */
export function activationKeys(): ActivationKey[] {
  return store().activationKeys ?? ACTIVATION_KEYS;
}

export function subscriptions(): Subscription[] {
  return store().subscriptions ?? SUBSCRIPTIONS;
}

export function addActivationKey(key: ActivationKey): void {
  world.ext[ACCOUNT_EXT] ??= {};
  const s = world.ext[ACCOUNT_EXT] as AccountStore;
  s.activationKeys = [...activationKeys(), key];
}

export function removeActivationKey(name: string): void {
  world.ext[ACCOUNT_EXT] ??= {};
  const s = world.ext[ACCOUNT_EXT] as AccountStore;
  s.activationKeys = activationKeys().filter(k => k.name !== name);
}

export type { ActivationKey, Subscription };
