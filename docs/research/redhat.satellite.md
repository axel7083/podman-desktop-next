# Red Hat Satellite — registry & registration target (R12)

## 1. Identity
- **Display name:** Red Hat Satellite
- **Extension id:** `redhat.satellite` (new) — uses its own credentials (Satellite username + Personal Access Token), not Red Hat SSO
- **Icon:** Red Hat Satellite product icon (https://www.redhat.com/en/technologies/management/satellite); fallback `ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Use your company Satellite as container registry and as the subscription/registration target for RHEL machines and VMs (disconnected-friendly).

## 2. Real objects & fields (Satellite 6.17+/Katello API)
- **Registry:** container content served at `satellite.acme.corp` (port 443), image paths `<org_label>/<lifecycle_env>/<content_view>/<product>/<repo>` (or legacy `org-env-cv-product-repo`), login with Satellite user/PAT; `podman search satellite.acme.corp/` lists repos.
- **Content view** `GET /katello/api/content_views`: `id, name, label, composite, latest_version, environments[{id,name}], last_published`. **Lifecycle environments** `Library → Dev → QA → Prod`.
- **Activation key** `GET /katello/api/activation_keys?organization_id=`: `name, content_view{name}, environment{name}, unlimited_hosts, max_hosts, usage_count, release_version, service_level, purpose_usage, purpose_role`.
- **Registration:** global registration `curl -sS --insecure 'https://satellite.acme.corp/register?activation_keys=rhel9-dev&location_id=2&organization_id=1' -H 'Authorization: Bearer <JWT>' | bash`, or `subscription-manager register --org=ACME --activationkey=rhel9-dev --serverurl=https://satellite.acme.corp/rhsm --baseurl=https://satellite.acme.corp/pulp/content` after `rpm -Uvh http://satellite.acme.corp/pub/katello-ca-consumer-latest.noarch.rpm`.
- **Host** `GET /api/hosts`: `name, operatingsystem_name, subscription_status_label, content_facet_attributes{content_view_name, lifecycle_environment_name, errata_counts{security, bugfix, enhancement, total}, upgradable_package_count}`.

## 3. Placement
- **registries:** "Satellite (satellite.acme.corp)" entry with org/env chooser. **accounts:** Satellite server account (URL, user, PAT, CA cert). **connectionFactories hook:** registration-target select in R4 / RHEL VMs wizards: "Red Hat (console.redhat.com)" | "Satellite: satellite.acme.corp". **tabs:** connection "Subscription" tab shows CV + env + errata counts (P14). P#: **P16 (pluggable account), P14, P18**.

## 4. Journeys
1. **Add Satellite.** Settings > Accounts > Add Satellite → URL, user `alice`, PAT, upload CA → "Connected · org ACME · 3 lifecycle envs" → registry auto-added.
2. **Register RHEL machine to Satellite.** Create RHEL Podman machine → Register with: Satellite, key `rhel9-dev` (CV `RHEL9-Base`, env `Dev`) → steps install katello-ca → register → "Content from Dev / RHEL9-Base". Failure: `x509: certificate signed by unknown authority` → "Import Satellite CA".
3. **Pull from Satellite registry.** Images > Pull → browse `acme/prod/rhel9-apps/ubi9/python-312` → pull. Failure: key at `max_hosts` → `Max Hosts (10) reached for activation key 'rhel9-dev'`.

## 5. Sample data
```json
{"server":{"url":"https://satellite.acme.corp","version":"6.17.4","organization":{"id":1,"label":"ACME"},"user":"alice"},
"lifecycleEnvironments":["Library","Dev","QA","Prod"],
"contentViews":[{"id":7,"name":"RHEL9-Base","label":"RHEL9-Base","latest_version":"14.0","environments":["Library","Dev","QA","Prod"],"last_published":"2026-10-01T02:00:00Z"},{"id":9,"name":"RHEL10-Base","latest_version":"3.0","environments":["Library","Dev"],"last_published":"2026-09-24T02:00:00Z"},{"id":12,"name":"rhel9-apps","composite":true,"latest_version":"22.0","environments":["Library","Prod"],"last_published":"2026-10-06T02:00:00Z"}],
"activationKeys":[{"name":"rhel9-dev","content_view":"RHEL9-Base","environment":"Dev","max_hosts":10,"usage_count":7,"service_level":"Standard","purpose_usage":"Development/Test"},{"name":"rhel10-dev","content_view":"RHEL10-Base","environment":"Dev","unlimited_hosts":true,"usage_count":2},{"name":"rhel9-prod","content_view":"rhel9-apps","environment":"Prod","max_hosts":200,"usage_count":188,"service_level":"Premium"}],
"registryRepos":[{"path":"satellite.acme.corp/acme/prod/rhel9-apps/ubi9/python-312","tags":["latest","1-58"]},{"path":"satellite.acme.corp/acme/prod/rhel9-apps/ubi9/ubi-minimal","tags":["9.8","latest"]},{"path":"satellite.acme.corp/acme/dev/rhel9-base/rhel9/postgresql-16","tags":["latest"]}],
"hosts":[{"name":"rhel-9.alice-laptop","subscription_status_label":"Simple Content Access","content_view_name":"RHEL9-Base","lifecycle_environment_name":"Dev","errata_counts":{"security":3,"bugfix":11,"enhancement":2,"total":16}}]}
```
