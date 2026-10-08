# Red Hat build of Keycloak

## 1. Identity
- **Display name:** Red Hat build of Keycloak
- **Extension id:** `redhat.keycloak` (proposed)
- **Icon:** https://raw.githubusercontent.com/cncf/artwork/main/projects/keycloak/icon/color/keycloak-icon-color.svg (verified 200 image/svg+xml; mono alt https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/keycloak.svg)
- **Description:** Run a local Keycloak for development, import realms, and manage clients, users and roles for your apps.

## 2. Real objects / fields / enums
- **Versions:** upstream Keycloak 26.8.0 (latest release; Quarkus dev services pin 26.7.4); Red Hat build of Keycloak **26.4.x** (26.4.15 released 2026-08-18; a newer RHBK 26.x minor may exist, unverified).
- **Images:** `registry.redhat.io/rhbk/keycloak-rhel9:26.4` (product), `quay.io/keycloak/keycloak:26.8.0` (upstream). Ports: 8080 HTTP, 8443 HTTPS, 9000 management (`/health/ready`, `/metrics` when `KC_HEALTH_ENABLED=true`, `KC_METRICS_ENABLED=true`).
- **Commands:** `kc.sh start-dev` (HTTP, dev-file H2 DB, theme caching off), `kc.sh start --optimized`, `kc.sh build`, `kc.sh export --dir /opt/keycloak/data/export --realm acme`, `kc.sh import --dir ...`, `start-dev --import-realm` (imports every `*.json` in `/opt/keycloak/data/import`, skips existing realms).
- **Env:** `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD` (temporary admin; replaced `KEYCLOAK_ADMIN*` in 26.0), `KC_DB=postgres|dev-file|mariadb|mysql|mssql|oracle`, `KC_DB_URL`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`, `KC_HOSTNAME`, `KC_HTTP_PORT`, `KC_FEATURES`.
- **Run example:** `podman run -p 8180:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin -v ./realms:/opt/keycloak/data/import:Z registry.redhat.io/rhbk/keycloak-rhel9:26.4 start-dev --import-realm`
- **Admin REST** (`/admin/realms`, bearer token from `master` realm `admin-cli`):
  - `RealmRepresentation`: `realm`, `id`, `displayName`, `enabled`, `sslRequired` (`none|external|all`), `registrationAllowed`, `accessTokenLifespan`, `clients[]`, `users[]`, `roles.realm[]`.
  - `ClientRepresentation`: `id`, `clientId`, `name`, `enabled`, `protocol` (`openid-connect|saml`), `publicClient`, `bearerOnly`, `redirectUris[]`, `webOrigins[]`, `rootUrl`, `standardFlowEnabled`, `implicitFlowEnabled`, `directAccessGrantsEnabled`, `serviceAccountsEnabled`, `clientAuthenticatorType` (`client-secret|client-jwt|client-x509`), `secret`, `attributes` (`pkce.code.challenge.method=S256`).
  - `UserRepresentation`: `id`, `username`, `email`, `firstName`, `lastName`, `enabled`, `emailVerified`, `createdTimestamp`, `requiredActions[]` (`VERIFY_EMAIL`, `UPDATE_PASSWORD`, `CONFIGURE_TOTP`, `UPDATE_PROFILE`), `credentials[]` (`type=password`, `value`, `temporary`), `realmRoles[]`, `groups[]`.
  - `RoleRepresentation`: `id`, `name`, `description`, `composite`, `clientRole`, `containerId`.
  - Endpoints: `GET/POST /admin/realms`, `/admin/realms/{realm}/clients`, `/clients/{id}/client-secret`, `/users`, `/users/{id}/role-mappings/realm`, `/roles`, `/partial-export`.
- **OIDC:** `http://localhost:8180/realms/{realm}/.well-known/openid-configuration` -> `issuer`, `authorization_endpoint` (`.../protocol/openid-connect/auth`), `token_endpoint` (`.../token`), `userinfo_endpoint`, `jwks_uri` (`.../certs`), `end_session_endpoint`. Quarkus: `quarkus.oidc.auth-server-url=http://localhost:8180/realms/acme`, `quarkus.oidc.client-id`, `quarkus.oidc.credentials.secret`.

## 3. Placement in the mockup
- **connections (service, P8):** `keycloak` service connection `acme-keycloak` (`http://localhost:8180`), admin creds in secret storage; auto-detects Quarkus dev-service Keycloak (`quarkus-dev-service-keycloak`, admin/admin).
- **connectionFactories (P12):** flavor (RHBK product via Red Hat SSO pull, P16 | upstream), port, DB (dev-file | PostgreSQL connection from `podman-desktop.postgresql`), realm files to import.
- **navSections (P2):** Realms -> Clients, Users, Roles; "Endpoints" (well-known, copy as Quarkus config).
- **tabs (P14):** container detail "Keycloak" tab (version, realms, admin console link `/admin/master/console/`).
- **menus:** realm row: Export realm JSON, Open admin console; client row: Copy secret, Copy `application.properties` snippet, Regenerate secret; user row: Reset password, Get token.
- **commands:** "Get access token for user" -> token decoded view.
- **tasks (P15):** start with import, realm export.

## 4. Journeys
1. **Create Keycloak with realm import.** Resources -> Create -> Keycloak -> flavor RHBK 26.4 -> import file `~/dev/acme-orders/src/main/docker/acme-realm.json` -> Create. Task "Start Keycloak acme-keycloak" (~25 s: pull 470 MB, start `start-dev --import-realm`, log `Realm 'acme' imported`, `Keycloak 26.4.15.redhat-00001 on JVM started in 9.8s`, wait `/health/ready`). World: connection Running, Realms shows `master`, `acme`.
2. **Wire app to Keycloak.** acme-keycloak -> Realms -> acme -> Clients -> `acme-orders` (confidential, serviceAccountsEnabled) -> "Copy Quarkus config" -> clipboard with `quarkus.oidc.*` lines; toast "Copied 3 properties".
3. **Test a user token.** Users -> `maya` -> "Get token" (password prompt) -> task "Request token" (~1 s, direct grant on `acme-web`) -> decoded JWT shows `realm_access.roles: ["order-admin"]`. Failure: `directAccessGrantsEnabled=false` -> error `unauthorized_client` with "Enable direct access grants" fix button.

## 5. Sample data
```json
[
  {"realm":"acme","id":"3b1f0d2e-8c4a-4e77-9f51-0a2b6c7d8e90","displayName":"Acme Corp","enabled":true,"sslRequired":"external","registrationAllowed":false,"accessTokenLifespan":300},
  {"realm":"master","id":"b2f2e1c4-1a6d-4d23-a1f0-7c3e9d4b5a61","enabled":true,"sslRequired":"external"},
  {"id":"f4a9c2d1-6e3b-4b8f-9a10-2d5e7c8b1f03","clientId":"acme-orders","name":"Acme Orders service","enabled":true,"protocol":"openid-connect","publicClient":false,"bearerOnly":false,"standardFlowEnabled":false,"directAccessGrantsEnabled":false,"serviceAccountsEnabled":true,"clientAuthenticatorType":"client-secret","redirectUris":[]},
  {"id":"0c7e5b3a-2f1d-4a9c-8e6b-5d4c3b2a1f09","clientId":"acme-web","name":"Acme storefront SPA","enabled":true,"protocol":"openid-connect","publicClient":true,"standardFlowEnabled":true,"directAccessGrantsEnabled":true,"serviceAccountsEnabled":false,"redirectUris":["http://localhost:5173/*"],"webOrigins":["http://localhost:5173"],"attributes":{"pkce.code.challenge.method":"S256"}},
  {"id":"9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d","clientId":"inventory-service","enabled":true,"publicClient":false,"standardFlowEnabled":false,"serviceAccountsEnabled":true},
  {"id":"5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b","username":"maya","email":"maya@acme.example","firstName":"Maya","lastName":"Lindqvist","enabled":true,"emailVerified":true,"createdTimestamp":1789203600000,"requiredActions":[],"realmRoles":["order-admin","default-roles-acme"]},
  {"id":"6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c","username":"alice","email":"alice@acme.example","enabled":true,"emailVerified":false,"createdTimestamp":1789290000000,"requiredActions":["VERIFY_EMAIL","UPDATE_PASSWORD"],"realmRoles":["customer"]},
  {"id":"7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d","username":"service-account-acme-orders","enabled":true,"serviceAccountClientLink":"acme-orders","realmRoles":["inventory-reader"]},
  {"id":"8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e","name":"order-admin","description":"Manage all orders","composite":false,"clientRole":false,"containerId":"3b1f0d2e-8c4a-4e77-9f51-0a2b6c7d8e90"},
  {"id":"9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f","name":"customer","composite":false,"clientRole":false},
  {"issuer":"http://localhost:8180/realms/acme","authorization_endpoint":"http://localhost:8180/realms/acme/protocol/openid-connect/auth","token_endpoint":"http://localhost:8180/realms/acme/protocol/openid-connect/token","userinfo_endpoint":"http://localhost:8180/realms/acme/protocol/openid-connect/userinfo","jwks_uri":"http://localhost:8180/realms/acme/protocol/openid-connect/certs","end_session_endpoint":"http://localhost:8180/realms/acme/protocol/openid-connect/logout","grant_types_supported":["authorization_code","client_credentials","password","refresh_token","urn:ietf:params:oauth:grant-type:device_code"]},
  {"container":{"name":"acme-keycloak","image":"registry.redhat.io/rhbk/keycloak-rhel9:26.4","command":["start-dev","--import-realm"],"ports":{"8080/tcp":8180,"9000/tcp":9000},"env":{"KC_BOOTSTRAP_ADMIN_USERNAME":"admin","KC_HEALTH_ENABLED":"true"},"mounts":[{"source":"~/dev/acme-orders/src/main/docker","destination":"/opt/keycloak/data/import"}],"startedAt":"2026-10-08T08:55:02Z"}}
]
```

## Sources
- https://www.keycloak.org/server/containers
- https://www.keycloak.org/server/importExport
- https://www.keycloak.org/docs-api/latest/rest-api/index.html
- https://www.keycloak.org/server/all-config
- https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/26.4/html/release_notes/
- https://access.redhat.com/products/red-hat-build-keycloak/
- https://github.com/keycloak/keycloak/releases
- https://github.com/quarkusio/quarkus/blob/main/extensions/devservices/keycloak/src/main/java/io/quarkus/devservices/keycloak/KeycloakDevServicesProcessor.java
