/**
 * Keycloak actions shared by sections (writes happen here, in handlers and
 * task callbacks, never in templates or `$derived`).
 */
import { confirm } from '#lib/confirm.svelte.ts';
import { hexId, runTask, world } from '#lib/world.svelte.ts';

import { KC_EXT, type KcClient, type KcRealm, type KcServer, type KcUser, oidcEndpoints } from './data.ts';

function randomSecret(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length: 32 }, (_, i) => alphabet[(parseInt(hexId(2), 16) + i * 7) % alphabet.length]).join('');
}

export function regenerateSecret(client: KcClient): void {
  confirm({
    title: 'Regenerate secret?',
    message: `Are you sure you want to regenerate the secret of client ${client.clientId}? Applications using the current secret can no longer get tokens.`,
    buttonLabel: 'Regenerate',
    variant: 'danger',
  })
    .then(ok => {
      if (!ok) return;
      runTask({
        name: `Regenerate secret of ${client.clientId}`,
        ext: KC_EXT,
        steps: [{ label: `POST /admin/realms/acme/clients/${client.id}/client-secret`, ms: 700 }],
        onDone: () => {
          client.secret = randomSecret();
        },
      });
    })
    .catch(console.error);
}

function b64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Run "Request token" for a user and store the decoded JWT on success. */
export function requestToken(connId: string, baseUrl: string, realm: KcRealm, user: KcUser): string {
  const ep = oidcEndpoints(baseUrl, realm.realm);
  const service = user.serviceAccountClientLink;
  const grant = service ? `grant_type=client_credentials&client_id=${service}` : `grant_type=password&client_id=acme-web&username=${user.username}`;
  const blocked = !service && user.requiredActions.length > 0;
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: 'Xb2Qd7hFvYp0w3Lk9nRtA6sJcE1mZ4uG8oHi5yKqWfM' };
  const payload: Record<string, unknown> = {
    exp: issuedAt + realm.accessTokenLifespan,
    iat: issuedAt,
    jti: crypto.randomUUID(),
    iss: ep.issuer,
    aud: 'account',
    sub: user.id,
    typ: 'Bearer',
    azp: service ?? 'acme-web',
    ...(service ? { clientHost: '10.89.0.1', clientAddress: '10.89.0.1', client_id: service } : { sid: crypto.randomUUID() }),
    scope: service ? 'profile email' : 'openid profile email',
    realm_access: { roles: [...user.realmRoles, 'offline_access', 'uma_authorization'] },
    resource_access: { account: { roles: ['manage-account', 'view-profile'] } },
    preferred_username: user.username,
    ...(user.email ? { email: user.email, email_verified: user.emailVerified ?? false } : {}),
    ...(user.firstName ? { name: `${user.firstName} ${user.lastName ?? ''}`.trim(), given_name: user.firstName, family_name: user.lastName } : {}),
  };
  return runTask({
    name: `Request token for ${user.username}`,
    ext: KC_EXT,
    steps: [
      { label: `POST ${ep.token}`, ms: 700, log: [grant] },
      { label: 'Decoding access token', ms: 400, log: [`${b64url(header).slice(0, 24)}….${b64url(payload).slice(0, 32)}….<signature>`] },
    ],
    failAt: blocked ? 0 : undefined,
    failMessage: 'invalid_grant: Account is not fully set up (required actions: VERIFY_EMAIL, UPDATE_PASSWORD)',
    action: { label: 'Open token', href: `/c/${connId}/users?realm=${realm.realm}&user=${user.username}` },
    onDone: () => {
      const data = world.ext[KC_EXT]?.[connId] as KcServer | undefined;
      if (data) data.tokens[`${realm.realm}/${user.username}`] = { header, payload, issued: Date.now() };
    },
  });
}
