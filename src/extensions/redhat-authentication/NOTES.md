# redhat.redhat-authentication (real, ext-redhat-account)

**Real objects / API.** OIDC PKCE session against sso.redhat.com (scopes openid id.username email api.rhsm + api.console/api.ocm), terms-based-registry service account `podman-desktop` → registry.redhat.io, RHSM activation keys and subscriptions.

**Placement.** Accounts (P16), Settings › Registries, status bar, Settings › Red Hat account (org, activation keys + Create, subscriptions), dashboard card (P17).

**Journeys.** Sign in from palette/status bar → task; create activation key (duplicate name → inline error); see subscription usage on the dashboard.

**Notes.** Shared with the RHEL wave: extend (e.g. Subscription tab on Podman/RHEL connections) rather than fork. Persona: jdoe@acme-bank.com, org 18833012.

**Sources.** docs/research/redhat.redhat-authentication.md
