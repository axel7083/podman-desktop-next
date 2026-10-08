# redhat.keycloak – Red Hat build of Keycloak (proposed)

**Real objects.** Admin REST `RealmRepresentation` (realm, displayName, sslRequired, accessTokenLifespan),
`ClientRepresentation` (clientId, publicClient, standardFlowEnabled, directAccessGrantsEnabled,
serviceAccountsEnabled, clientAuthenticatorType, secret, redirectUris, `pkce.code.challenge.method`),
`UserRepresentation` (username, email, requiredActions, realmRoles, serviceAccountClientLink).
OIDC discovery `http://localhost:8180/realms/{realm}/.well-known/openid-configuration`.

**Runtime.** `registry.redhat.io/rhbk/keycloak-rhel9:26.4` (26.4.15) or `quay.io/keycloak/keycloak:26.8.0`,
`start-dev --import-realm`, ports 8180→8080 + 9000 (management `/health/ready`),
`KC_BOOTSTRAP_ADMIN_USERNAME/PASSWORD`. Admin calls use a `master`/`admin-cli` token.

**Placement.**
- P8 service connection `acme-keycloak` (started) + P12 factory `keycloak` in the Services catalog (extra field "Realm file to import").
- P2 sections Realms (cards, counts, well-known URL, Export realm task), Clients (realm picker, `?client=` details: settings,
  credentials, endpoints, **Copy Quarkus config** → 3 `quarkus.oidc.*` lines + toast "Copied 3 properties"),
  Users (`?user=` details, **Get token** task → decoded JWT with `realm_access.roles`).
- P15 tasks: regenerate secret, export realm, request token. Palette: "Get access token for user".

**Journeys.** (1) Services catalog → Create Red Hat build of Keycloak with realm import.
(2) Realms → acme → Clients → acme-orders → Copy Quarkus config.
(3) Users → maya → Get token (`order-admin` role); alice fails with `invalid_grant` (required actions).

**Sources.** keycloak.org/server/containers, /importExport, docs-api rest-api; RHBK 26.4 release notes;
dossier `docs/research/redhat.keycloak.md`.
