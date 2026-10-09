# Red Hat Account (SSO, registry, subscriptions)

## 1. Identity
- **Display name:** Red Hat Authentication (shown as "Red Hat account" in Accounts)
- **Extension id:** `redhat.redhat-authentication` (real; `ext-redhat-account/package.json`, v1.3.0-next)
- **Icon:** `../ext-redhat-account/icon.png`; status-bar glyph `ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Sign in with Red Hat SSO; configures registry.redhat.io and registers Podman machines with a RHEL subscription.

## 2. Real objects & fields (from `ext-redhat-account/src`)
- **SSO session** (`authentication-service.ts`): OIDC PKCE against `https://sso.redhat.com/auth/realms/redhat-external/`, default scopes `openid id.username email api.rhsm` (+ caller scopes, e.g. `api.console`, `api.iam.service_accounts`). Session = `{id, accessToken, idToken, account:{id,label(email)}, scopes[]}`. JWT carries `organization.id` (used everywhere as `--org`).
- **Status bar item** (`status-bar-item.ts`): tooltip `Red Hat SSO: Logged in as <email>` / `Red Hat SSO: Logged Out`; commands `redhat.authentication.signin`, `redhat.authentication.navigate.settings`.
- **Registry service account** (`extension.ts:95-127`): `GET/POST https://access.redhat.com/hydra/rest/terms-based-registry` service account named `podman-desktop` (`{name, description:"Service account to use from Podman Desktop", redHatAccountId, credentials:{username,password}}`) → registered as PD registry `registry.redhat.io` (alias = email).
- **Activation key** (`extension.ts:129-155`): `https://console.redhat.com/api/rhsm/v2/activation_keys`, name `podman-desktop`, `role: "Red Hat Enterprise Linux Workstation"`, `usage: "Development/Test"`, `serviceLevel: "Self-Support"`. RHSM enums: serviceLevel `Premium|Standard|Self-Support`; usage `Production|Development/Test|Disaster Recovery`; role `Red Hat Enterprise Linux Server|Workstation|Compute Node`.
- **Machine registration** (`podman-cli.ts`): `podman machine ssh <m> sudo subscription-manager register --force --activationkey podman-desktop --org <orgId>`; status via `subscription-manager status`; facts file `/etc/rhsm/facts/podman-desktop-redhat-account-ext.facts` = `{"supported_architectures":"aarch64,x86_64"}`; installs SM with `rpm-ostree install` (fails on RHEL/dnf images — bug, see R4). Picks the **first running machine** (gap).
- **Developer subscription** (RHSM `GET /api/rhsm/v2/subscriptions` / Subscriptions UI): `{sku:"RH00798", name:"Red Hat Developer Subscription for Individuals", quantity:16, endDate, status:"Active"|"Expiring soon"|"Expired"}`.

## 3. Placement (provider-first UI)
- **accounts:** "Red Hat" account card in Settings > Accounts (session, org id, scopes list, sign out). **statusItems:** left status-bar "Red Hat: alice@acme.com". **registries:** registry.redhat.io (service account `podman-desktop`, locked "managed by Red Hat account").
- **tabs:** "Subscription" tab on Podman/RHEL connection detail (registered?, key, org, consumer UUID, Register/Unregister).
- **tools/page:** "Activation keys" list (name, role, usage, SLA, release, additional repos) + "Create key".
- **dashboardCards:** "Developer subscription — 16 systems, renews 2027-03-02". P#: **P16** (scopes), **P14** (connection tab), **P17** (dashboard card).

## 4. Journeys
1. **First sign-in.** Status bar "Sign in" → browser SSO (simulated 2 s) → task "Configuring Red Hat Registry" (steps: sign-in ✓, create service account `podman-desktop` ✓, add registry.redhat.io ✓) → "Activating subscription" on `podman-machine-default`. Failure: machine is Fedora CoreOS + `rpm-ostree` → "Registered after machine restart" (stop/start shown). Failure 2: no running machine → toast "No running Podman machine; subscription not activated".
2. **Register a specific connection.** RHEL machine `rhel-9` → Subscription tab → Register with key `podman-desktop` → log `Registering to: subscription.rhsm.redhat.com:443/subscription … The system has been registered with ID: 6f1c…` → status `Current`. Failure: `HTTP error (422 - Unprocessable Entity): Activation key 'x' not found for organization '19830412'`.
3. **Create activation key.** Activation keys → Create → name `ci-runners`, role Server, usage Production, SLA Standard → appears in list and in wizard dropdowns. Failure: duplicate name → `Activation key name already exists`.

## 5. Sample data
```json
{
  "session": {"id":"9d6e0b1c-5b2a-4c1e-a7d1-2f4c8e0a1b33","account":{"id":"f:528d76ff-f708-43ed-8cd5-fe16f4fe0ce6:alice.dev","label":"alice.dev@acme-corp.com"},"organizationId":"19830412","accountNumber":"6301142","scopes":["api.console","api.iam.service_accounts","api.rhsm","email","id.username","openid"],"expiresAt":"2026-10-08T17:42:00Z"},
  "registryServiceAccount":{"name":"podman-desktop","username":"19830412|podman-desktop","created":"2026-03-02T09:14:11Z","registry":"registry.redhat.io"},
  "activationKeys":[
    {"name":"podman-desktop","role":"Red Hat Enterprise Linux Workstation","usage":"Development/Test","serviceLevel":"Self-Support","releaseVersion":"","additionalRepositories":[],"id":"38291"},
    {"name":"ci-runners","role":"Red Hat Enterprise Linux Server","usage":"Production","serviceLevel":"Standard","releaseVersion":"9.6","additionalRepositories":[{"repositoryLabel":"codeready-builder-for-rhel-9-x86_64-rpms"}],"id":"38292"},
    {"name":"edge-lab","role":"Red Hat Enterprise Linux Server","usage":"Development/Test","serviceLevel":"Self-Support","releaseVersion":"10.0","additionalRepositories":[],"id":"38407"},
    {"name":"satellite-dc1","role":"Red Hat Enterprise Linux Server","usage":"Production","serviceLevel":"Premium","releaseVersion":"","additionalRepositories":[],"id":"38512"}
  ],
  "subscriptions":[
    {"sku":"RH00798","name":"Red Hat Developer Subscription for Individuals","quantity":16,"consumed":5,"startDate":"2026-03-02","endDate":"2027-03-02","status":"Active"},
    {"sku":"RH00003","name":"Red Hat Enterprise Linux Server, Standard","quantity":50,"consumed":41,"startDate":"2025-11-01","endDate":"2026-10-31","status":"Expiring soon"}
  ],
  "registrations":[
    {"connection":"podman-machine-default","provider":"podman","consumerUuid":"6f1c2e7a-0b9d-4f6e-9d3c-1a2b3c4d5e6f","status":"Current","key":"podman-desktop"},
    {"connection":"rhel-9","provider":"podman","consumerUuid":"a83b51f0-77c2-4f0e-8e11-6e2f4a9b0c21","status":"Current","key":"podman-desktop"},
    {"connection":"rhel10-dev","provider":"rhel-vms","consumerUuid":"c0ffee00-1234-4abc-9def-00aa11bb22cc","status":"Current","key":"podman-desktop"},
    {"connection":"rhel9-db","provider":"rhel-vms","consumerUuid":null,"status":"Unknown","key":null}
  ]
}
```
