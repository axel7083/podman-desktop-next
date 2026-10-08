# Red Hat Service Interconnect (Skupper v2)

## 1. Identity
- **Display name:** Service Interconnect
- **Extension id:** `redhat.service-interconnect` (proposed)
- **Icon:** https://github.com/skupperproject.png
- **Description:** Turn a Podman connection into a Skupper site and link local containers to services on your OpenShift clusters.

## 2. Real objects & fields (Skupper v2, `skupper.io/v2alpha1`; [RHSI 2.2 docs](https://docs.redhat.com/en/documentation/red_hat_service_interconnect/2.2/html/using_service_interconnect/system-exposing-services-cli))
- `Site`: `spec.linkAccess` (`default`|`route`|`loadbalancer`|`none`), `spec.ha`; `status.status` (`Pending`|`Ready`|`Error`), `status.sitesInNetwork`, `status.network[]`.
- `Link`: `spec.endpoints[]`, `spec.tlsCredentials`, `spec.cost`; `status.status`, `status.remoteSiteName`.
- `Listener`: `spec.routingKey`, `spec.host`, `spec.port`; `status.hasMatchingConnector`.
- `Connector`: `spec.routingKey`, `spec.host` or `spec.selector`, `spec.port`; `status.hasMatchingListener`.
- `AccessGrant`: `spec.redemptionsAllowed`, `spec.expirationWindow` (e.g. `15m`); `status.url`, `status.code`, `status.ca`, `status.redeemed`, `status.expirationTime`. `AccessToken`: `spec.url`, `spec.code`, `spec.ca`, `spec.linkCost`; `status.redeemed`.
- Podman site: `SKUPPER_PLATFORM=podman`; `skupper system install`, `skupper site create laptop`, `skupper connector create db 5432 --host postgres`, `skupper system apply -f token.yaml`, `skupper system start`, `skupper system status`. Router runs as container `<ns>-skupper-router`.

## 3. Placement
- **navSections:** "Service network" under **Podman** connections (P2) and under Kubernetes connections `when kube.hasCRD('sites.skupper.io')`.
- **menus:** container kebab "Expose to cluster…" (creates Connector locally + Listener remote); **tabs:** Sites / Links / Listeners / Connectors.
- **addons:** "Skupper controller" add-on on minc/kind (P13). P#: **P2, P4, P11, P13, P14**.

## 4. Journeys
1. **Link laptop to ocp-dev.** Podman machine → Service network → "Create site" → task `skupper system install` → "Link to cluster" pick ocp-dev → AccessGrant created remotely → AccessToken redeemed locally → Link Ready. Failure: grant expired (`expirationWindow` 15m) → regenerate.
2. **Expose local Postgres to cluster.** Container `postgres` → Expose to cluster → routingKey `payments-db` port 5432 → remote Listener `hasMatchingConnector: true` → cluster app connects.
3. **Consume cluster service locally.** ocp-dev Connector `ledger-api:8080` → create local Listener → `localhost:18080` link.

## 5. Sample data
```json
{
  "sites":[
    {"name":"laptop-podman","platform":"podman","namespace":"default","status":"Ready","linkAccess":"none","sitesInNetwork":3,"version":"2.2.0"},
    {"name":"ocp-dev-payments","platform":"kubernetes","namespace":"payments","status":"Ready","linkAccess":"route","sitesInNetwork":3},
    {"name":"ocp-prod-payments","platform":"kubernetes","namespace":"payments","status":"Ready","linkAccess":"route","sitesInNetwork":3}
  ],
  "links":[{"name":"link-ocp-dev","site":"laptop-podman","remoteSiteName":"ocp-dev-payments","status":"Ready","cost":1,"created":"2026-10-08T09:30:12Z"}],
  "listeners":[
    {"name":"payments-db","site":"ocp-dev-payments","routingKey":"payments-db","host":"payments-db","port":5432,"hasMatchingConnector":true},
    {"name":"ledger-api-local","site":"laptop-podman","routingKey":"ledger-api","host":"0.0.0.0","port":18080,"hasMatchingConnector":true}
  ],
  "connectors":[
    {"name":"payments-db","site":"laptop-podman","routingKey":"payments-db","host":"postgres","port":5432,"hasMatchingListener":true},
    {"name":"ledger-api","site":"ocp-dev-payments","routingKey":"ledger-api","selector":"app=ledger-api","port":8080,"hasMatchingListener":true}
  ],
  "accessGrants":[{"name":"grant-laptop-jdoe","site":"ocp-dev-payments","redemptionsAllowed":1,"redeemed":1,"expirationWindow":"15m","url":"https://skupper-grant-server-payments.apps.ocp-dev.acme.internal:443/2c4f8e1a-6b3d-4a9e-9f7c-1d5e3b8a0c2f","expirationTime":"2026-10-08T09:44:58Z"}]
}
```
