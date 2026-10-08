# redhat.jboss-eap – JBoss EAP with WildFly Glow (mock)

**Real product:** Red Hat JBoss EAP 8.1 (Jakarta EE 10), `eap-maven-plugin` (`eap:image`), WildFly Glow 2.2.0.Final.

## Real objects & fields
- `wildfly-glow scan app.war --add-ons=postgresql,openapi --cloud [--server-version=39.0.0.Final]` → `context`, `galleon discovery` (feature-packs, layers), `identified errors` (`unbound datasources error: java:jboss/datasources/InventoryDS` + add-on hint), `suggestions` (enabled / suggested add-ons). `data.ts › GlowScan`.
- Feature packs: `org.jboss.eap:wildfly-ee-galleon-pack`, `org.jboss.eap.cloud:eap-cloud-galleon-pack`, `org.jboss.eap:eap-datasources-galleon-pack`.
- Runtime image `registry.redhat.io/jboss-eap-8/eap81-openjdk21-runtime-openshift-rhel9`; ports 8080 / 9990 (`/management`, `/console`).
- Management model: `:read-attribute(name=server-state)`, deployments, `/subsystem=datasources/data-source=InventoryDS:test-connection-in-pool`.

## Placement (P#)
| Contribution | Where | P# |
|---|---|---|
| tool `eap` "JBoss EAP" → "Containerize WAR" wizard (`?war=` prefill) | `/tools/eap` | P3 |
| Scan / Build image / Run as tasks; image `localhost/inventory-service:eap81` (412 MB, label `org.jboss.eap.layers`), container `inventory-service` | Tasks, Images, Containers | P15 |
| tab "EAP" on containers whose image is `inventory-service:eap81` or contains `eap8` | Container details | P14 |
| CLI tool `wildfly-glow` 2.2.0.Final | Settings › CLI Tools | P17 |

## Journeys
1. From the MTA report (**Containerize with EAP 8.1**) → **Scan** → error "unbound datasources" → **Enable postgresql** (rescans) → 11 layers.
2. **Build image** → `eap:image inventory-service` → "368 MB smaller than the full EAP 8.1 image (780 MB)" → **Run** → **Open container inventory-service**.
3. Container › **EAP** tab → server state running, 8.1.2.GA, deployment OK, **Test connection** (fails unless a postgres container is running).

## Mock decisions
- The keycloak warning reads MTA state (`isKeycloakFixed()` from `../mta/data.ts`): once the Konveyor AI fix is accepted Glow reports `oidc.json` instead of `keycloak.json`.
- Cloud context selects `remote-activemq`, bare metal `messaging-activemq`.
- Form settings are restored from the last scan when returning to the page.

## Sources
docs/research/redhat.jboss-eap.md; github.com/wildfly/wildfly-glow; docs.redhat.com EAP 8.1 "Provisioning JBoss EAP"; docs.wildfly.org/39 Galleon guide.
