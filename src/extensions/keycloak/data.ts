/**
 * Mock Keycloak Admin REST data (RealmRepresentation, ClientRepresentation,
 * UserRepresentation, RoleRepresentation) and OIDC discovery helpers.
 */
import { extData, world } from '#lib/world.svelte.ts';

export const KC_EXT = 'redhat.keycloak';
export const KC_CONN = 'acme-keycloak';

export interface KcClient {
  id: string;
  clientId: string;
  name?: string;
  enabled: boolean;
  protocol: 'openid-connect' | 'saml';
  publicClient: boolean;
  bearerOnly?: boolean;
  standardFlowEnabled: boolean;
  directAccessGrantsEnabled: boolean;
  serviceAccountsEnabled: boolean;
  clientAuthenticatorType?: 'client-secret' | 'client-jwt' | 'client-x509';
  secret?: string;
  redirectUris: string[];
  webOrigins?: string[];
  attributes?: Record<string, string>;
  /** Built-in client of the realm (account, admin-cli…). */
  builtin?: boolean;
}

export interface KcUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
  createdTimestamp: number;
  requiredActions: string[];
  realmRoles: string[];
  serviceAccountClientLink?: string;
}

export interface KcRole {
  id: string;
  name: string;
  description?: string;
  composite: boolean;
}

export interface KcRealm {
  realm: string;
  id: string;
  displayName?: string;
  enabled: boolean;
  sslRequired: 'none' | 'external' | 'all';
  registrationAllowed: boolean;
  accessTokenLifespan: number;
  clients: KcClient[];
  users: KcUser[];
  roles: KcRole[];
}

export interface KcServer {
  version: string;
  realms: KcRealm[];
  /** Last decoded token per `<realm>/<username>`. */
  tokens: Record<string, { header: Record<string, unknown>; payload: Record<string, unknown>; issued: number }>;
}

function builtinClients(realm: string): KcClient[] {
  const base = (clientId: string, name: string, publicClient = true): KcClient => ({
    id: crypto.randomUUID(),
    clientId,
    name,
    enabled: true,
    protocol: 'openid-connect',
    publicClient,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: clientId === 'admin-cli',
    serviceAccountsEnabled: false,
    redirectUris: clientId === 'account' ? [`/realms/${realm}/account/*`] : [],
    builtin: true,
  });
  return [base('account', '${client_account}'), base('account-console', '${client_account-console}'), base('admin-cli', '${client_admin-cli}'), base('broker', '${client_broker}', false), base('security-admin-console', '${client_security-admin-console}')];
}

function masterRealm(): KcRealm {
  return {
    realm: 'master',
    id: 'b2f2e1c4-1a6d-4d23-a1f0-7c3e9d4b5a61',
    displayName: 'Keycloak',
    enabled: true,
    sslRequired: 'external',
    registrationAllowed: false,
    accessTokenLifespan: 60,
    clients: [...builtinClients('master'), { ...builtinClients('master')[0], id: crypto.randomUUID(), clientId: 'acme-realm', name: 'acme Realm', publicClient: false, standardFlowEnabled: false }],
    users: [{ id: 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d', username: 'admin', enabled: true, createdTimestamp: Date.parse('2026-10-08T08:55:04Z'), requiredActions: [], realmRoles: ['admin', 'create-realm', 'default-roles-master'] }],
    roles: [
      { id: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', name: 'admin', description: '${role_admin}', composite: true },
      { id: 'd2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a', name: 'create-realm', description: '${role_create-realm}', composite: false },
      { id: 'e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b', name: 'default-roles-master', description: '${role_default-roles}', composite: true },
    ],
  };
}

export function acmeRealm(): KcRealm {
  return {
    realm: 'acme',
    id: '3b1f0d2e-8c4a-4e77-9f51-0a2b6c7d8e90',
    displayName: 'Acme Corp',
    enabled: true,
    sslRequired: 'external',
    registrationAllowed: false,
    accessTokenLifespan: 300,
    clients: [
      {
        id: 'f4a9c2d1-6e3b-4b8f-9a10-2d5e7c8b1f03',
        clientId: 'acme-orders',
        name: 'Acme Orders service',
        enabled: true,
        protocol: 'openid-connect',
        publicClient: false,
        bearerOnly: false,
        standardFlowEnabled: false,
        directAccessGrantsEnabled: false,
        serviceAccountsEnabled: true,
        clientAuthenticatorType: 'client-secret',
        secret: 'uQ7nX2kVb9LmR4tWz8pYcE3sHa6dFj1G',
        redirectUris: [],
      },
      {
        id: '0c7e5b3a-2f1d-4a9c-8e6b-5d4c3b2a1f09',
        clientId: 'acme-web',
        name: 'Acme storefront SPA',
        enabled: true,
        protocol: 'openid-connect',
        publicClient: true,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: false,
        redirectUris: ['http://localhost:5173/*'],
        webOrigins: ['http://localhost:5173'],
        attributes: { 'pkce.code.challenge.method': 'S256' },
      },
      {
        id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
        clientId: 'inventory-service',
        name: 'Inventory service',
        enabled: true,
        protocol: 'openid-connect',
        publicClient: false,
        standardFlowEnabled: false,
        directAccessGrantsEnabled: false,
        serviceAccountsEnabled: true,
        clientAuthenticatorType: 'client-secret',
        secret: 'Zr5Kq8WnT2vXb7LcM4yHs9DpA3fGj6Ue',
        redirectUris: [],
      },
      ...builtinClients('acme'),
    ],
    users: [
      {
        id: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
        username: 'maya',
        email: 'maya@acme.example',
        firstName: 'Maya',
        lastName: 'Lindqvist',
        enabled: true,
        emailVerified: true,
        createdTimestamp: 1789203600000,
        requiredActions: [],
        realmRoles: ['order-admin', 'default-roles-acme'],
      },
      {
        id: '6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c',
        username: 'alice',
        email: 'alice@acme.example',
        firstName: 'Alice',
        lastName: 'Moreau',
        enabled: true,
        emailVerified: false,
        createdTimestamp: 1789290000000,
        requiredActions: ['VERIFY_EMAIL', 'UPDATE_PASSWORD'],
        realmRoles: ['customer', 'default-roles-acme'],
      },
      {
        id: '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d',
        username: 'service-account-acme-orders',
        enabled: true,
        createdTimestamp: 1789203600000,
        requiredActions: [],
        realmRoles: ['inventory-reader', 'default-roles-acme'],
        serviceAccountClientLink: 'acme-orders',
      },
    ],
    roles: [
      { id: '8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e', name: 'order-admin', description: 'Manage all orders', composite: false },
      { id: '9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f', name: 'customer', description: 'Place and track own orders', composite: false },
      { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', name: 'inventory-reader', description: 'Read stock levels', composite: false },
      { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', name: 'default-roles-acme', description: '${role_default-roles}', composite: true },
    ],
  };
}

export function sampleServer(withAcme = true): KcServer {
  return { version: '26.4.15.redhat-00001', realms: withAcme ? [masterRealm(), acmeRealm()] : [masterRealm()], tokens: {} };
}

const EMPTY: KcServer = { version: '', realms: [], tokens: {} };

/** Server data of a Keycloak connection (read-only: safe inside `$derived`). */
export function server(connId: string): KcServer {
  return (world.ext[KC_EXT]?.[connId] as KcServer | undefined) ?? EMPTY;
}

/** Create the server data (writes to the world: seed / handlers only). */
export function ensureServer(connId: string): KcServer {
  return extData<KcServer>(KC_EXT, connId, sampleServer());
}

export function findRealm(connId: string, realm: string): KcRealm | undefined {
  return server(connId).realms.find(r => r.realm === realm);
}

export interface OidcEndpoints {
  issuer: string;
  wellKnown: string;
  authorization: string;
  token: string;
  userinfo: string;
  jwks: string;
  endSession: string;
}

export function oidcEndpoints(baseUrl: string, realm: string): OidcEndpoints {
  const issuer = `${baseUrl}/realms/${realm}`;
  const oidc = `${issuer}/protocol/openid-connect`;
  return {
    issuer,
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    authorization: `${oidc}/auth`,
    token: `${oidc}/token`,
    userinfo: `${oidc}/userinfo`,
    jwks: `${oidc}/certs`,
    endSession: `${oidc}/logout`,
  };
}

/** `application.properties` lines for a Quarkus OIDC app using this client. */
export function quarkusConfig(baseUrl: string, realm: string, client: KcClient): string[] {
  return [
    `quarkus.oidc.auth-server-url=${baseUrl}/realms/${realm}`,
    `quarkus.oidc.client-id=${client.clientId}`,
    client.publicClient ? 'quarkus.oidc.application-type=web-app' : `quarkus.oidc.credentials.secret=${client.secret ?? ''}`,
  ];
}

export function clientType(c: KcClient): string {
  if (c.bearerOnly) return 'Bearer-only';
  return c.publicClient ? 'Public' : 'Confidential';
}

export function clientFlows(c: KcClient): string[] {
  return [
    ...(c.standardFlowEnabled ? [c.attributes?.['pkce.code.challenge.method'] ? 'Standard flow (PKCE S256)' : 'Standard flow'] : []),
    ...(c.directAccessGrantsEnabled ? ['Direct access grants'] : []),
    ...(c.serviceAccountsEnabled ? ['Service accounts'] : []),
  ];
}
