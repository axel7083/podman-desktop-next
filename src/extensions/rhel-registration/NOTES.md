# RHEL registration (`redhat.rhel-registration`)

## Real objects / API
RHSM activation keys `/api/rhsm/v2/activation_keys` (`name, role, usage, serviceLevel, releaseVersion, additionalRepositories`); subscriptions (`sku, quantity, consumed, endDate, status`); `subscription-manager register/unregister/status`; facts file `/etc/rhsm/facts/podman-desktop-redhat-account-ext.facts`.

## Auth
Depends on `redhat.redhat-authentication` (SSO, org id). Exposes `store.ts` as the API dependent RHEL extensions call.

## Journeys
1. Settings › RHEL registration → Create activation key (duplicate name error) → appears in wizards.
2. Connection › Subscription → Register with Red Hat or Satellite key → task → Current.
3. Dashboard card: systems registered, Developer Subscription, RHEL Server expiring.

## Placement
settings (P17), tab Subscription on RHEL/machine connections (P14), dashboard card (P17).

## Sources
docs/research/redhat.redhat-authentication.md, ext-redhat-account/src
