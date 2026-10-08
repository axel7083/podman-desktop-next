# Red Hat JBoss EAP (with WildFly Glow)

## 1. Identity
- **Display name:** Red Hat JBoss EAP
- **Extension id:** `redhat.jboss-eap` (proposed; no existing Podman Desktop extension)
- **Icon:** https://raw.githubusercontent.com/wildfly/wildfly.org/main/public/assets/img/wildfly_icons_one-color-logo.png (verified 200, image/png; WildFly logo, upstream of EAP). Red Hat fallback: https://cdn.simpleicons.org/redhat (verified 200, svg).
- **Description:** Scan a WAR with WildFly Glow, provision a trimmed EAP 8.1 server image, and run/manage it locally with the management console and CLI.

## 2. Real objects & fields
- **Versions:** JBoss EAP **8.1** (Jakarta EE 10, Java 17/21); upstream WildFly 38/39; WildFly Glow **2.2.0.Final** (latest GitHub release).
- **Images:** `registry.redhat.io/jboss-eap-8/eap81-openjdk21-builder-openshift-rhel9` and `registry.redhat.io/jboss-eap-8/eap81-openjdk21-runtime-openshift-rhel9` (names per brief, tags unverified); upstream `quay.io/wildfly/wildfly:39.0.0.Final-jdk21` (unverified tag).
- **Ports:** 8080 HTTP, 8443 HTTPS, **9990** management (HTTP API `/management`, console `/console`). Builder images disable the console by default.
- **Feature packs:** `org.jboss.eap:wildfly-ee-galleon-pack`, `org.jboss.eap.cloud:eap-cloud-galleon-pack`, `org.jboss.eap:eap-datasources-galleon-pack` (postgresql add-on), `org.jboss.eap.xp:wildfly-galleon-pack` (MicroProfile via XP).
- **Maven:** `org.jboss.eap.plugins:eap-maven-plugin` goals `eap:package`, `eap:image`, `eap:provision`, `eap:dev`; upstream `org.wildfly.plugins:wildfly-maven-plugin` (`wildfly:package`, `wildfly:image`, `wildfly:dev`). Glow via:
  ```xml
  <discover-provisioning-info><version>8.1.0.GA-redhat-...</version><context>cloud</context><add-ons><add-on>postgresql</add-on></add-ons></discover-provisioning-info>
  ```
- **Glow CLI:** `wildfly-glow scan app.war [--add-ons=postgresql,openapi] [--cloud] [--profile=ha] [--server-version=39.0.0.Final] [--provision=SERVER|BOOTABLE_JAR|DOCKER_IMAGE|PROVISIONING_XML] [--spaces=incubating] [--verbose]`; `wildfly-glow show-add-ons`, `show-server-versions`, `show-configuration`. Output sections: `context`, `enabled profile`, `galleon discovery` (`feature-packs`, `layers`), `identified errors` (e.g. `unbound datasources error: java:jboss/datasources/InventoryDS`, with `To correct this error, enable one of the following add-ons: mariadb, mssqlserver, mysql, oracle, postgresql`), `suggestions` (`enabled add-ons`, `suggested add-ons`), `deployment-scanner`.
- **Typical layers:** `ee-core-profile-server`, `jaxrs-server` / `jaxrs`, `jpa`, `ejb-lite`, `ejb`, `cdi`, `servlet`, `messaging-activemq` / `remote-activemq`, `elytron-oidc-client`, `infinispan` / `web-clustering`, `postgresql-datasource`, `postgresql-driver`, `microprofile-health`, `microprofile-config`, `microprofile-openapi`, `h2-driver`.
- **jboss-cli.sh:** `jboss-cli.sh --connect --controller=localhost:9990 --command=":read-attribute(name=server-state)"` -> `running`; `deployment-info`, `/subsystem=datasources/data-source=InventoryDS:test-connection-in-pool`, `/subsystem=elytron-oidc-client/secure-deployment=inventory.war:add(...)`, `:reload`. Management API: `POST /management` `{"operation":"read-resource","address":[...]}`.
- Legacy inventory-service on EAP 7.4 uses `<auth-method>KEYCLOAK</auth-method>` + `keycloak.json` (RH-SSO adapter, removed in EAP 8 -> `elytron-oidc-client` + `oidc.json`).

## 3. Placement (provider-first UI)
- **tools (P3):** "WildFly Glow" page in the Tools group: pick WAR/project, add-ons, context (bare-metal/cloud), profile -> scan result.
- **P15 project/workspace:** `~/dev/inventory-service` detected stack "Jakarta EE / JBoss EAP" (pom `packaging=war`, `jboss-web.xml`); actions Scan / Build image / Run.
- **cliTools:** `wildfly-glow` (2.2.0.Final), `jboss-cli.sh` (from runtime image).
- **tabs (P14):** on an EAP container: "EAP" tab (server-state, deployments, datasources, subsystem health, link to console :9990); on the built image: "Galleon layers" tab (provisioning.xml).
- **menus:** container kebab: Open management console, Run CLI command, Reload server, Redeploy WAR; image row: Show provisioning.
- **imageCheckers (P5):** optional "EAP provisioning check" listing unused/missing layers (`ruleId: glow-unbound-datasource`).
- **groupers (P10):** group by label `com.redhat.component=eap8-...` (unverified).

## 4. Journeys
1. **Scan the legacy WAR.** Tools > WildFly Glow -> select `~/dev/inventory-service/target/inventory-service.war` -> task "WildFly Glow scan" (log: `Glow is scanning...`, `context: bare-metal`, `galleon discovery`, 6 s) -> result: 8 layers, 1 error "unbound datasources error: java:jboss/datasources/InventoryDS", suggested add-on `postgresql` -> click "Enable postgresql" -> rescan, error gone, layers + `postgresql-datasource`.
2. **Build and run a trimmed EAP 8.1 image.** Result page > "Provision container image" -> task "eap:image" (steps: resolve feature packs, provision 11 layers, copy deployment, `podman build` -> `localhost/inventory-service:eap81`, ~1 m 40 s, image 412 MB vs 780 MB full) -> Run -> container `inventory-service` on 8080/9990, linked to postgres + amq-broker services.
3. **Check server via CLI.** Container > EAP tab -> server-state `running`, deployment `inventory-service.war` OK, datasource test FAILED (`Connection refused postgres:5432`) -> menu "Run CLI command" prefilled `test-connection-in-pool` -> after starting Postgres service, rerun -> `true`.

## 5. Sample data
```json
{
  "glowScan": {
    "command": "wildfly-glow scan target/inventory-service.war --add-ons=postgresql --cloud",
    "scannedAt": "2026-10-06T10:42:09Z",
    "context": "cloud",
    "profile": "default",
    "featurePacks": ["org.jboss.eap:wildfly-ee-galleon-pack:8.1.0.GA-redhat-00007", "org.jboss.eap.cloud:eap-cloud-galleon-pack:2.1.0.Final-redhat-00003", "org.jboss.eap:eap-datasources-galleon-pack:8.1.0.GA-redhat-00002"],
    "baseLayer": "ee-core-profile-server",
    "layers": ["jaxrs", "jpa", "ejb-lite", "ejb", "remote-activemq", "elytron-oidc-client", "infinispan", "postgresql-datasource", "microprofile-health"],
    "errors": [],
    "warnings": ["keycloak.json found in WEB-INF: RH-SSO adapter not supported, use elytron-oidc-client (oidc.json)"],
    "enabledAddOns": ["postgresql"],
    "suggestedAddOns": ["openapi", "lra-coordinator", "h2-database"]
  },
  "server": { "container": "inventory-service", "image": "localhost/inventory-service:eap81@sha256:5c1e9a0b", "productVersion": "8.1.2.GA", "serverState": "running", "runningMode": "NORMAL", "managementUrl": "http://localhost:9990/console" },
  "deployments": [{ "name": "inventory-service.war", "enabled": true, "status": "OK", "runtimeName": "inventory-service.war", "contextRoot": "/inventory" }],
  "datasources": [
    { "name": "InventoryDS", "jndiName": "java:jboss/datasources/InventoryDS", "driver": "postgresql", "connectionUrl": "jdbc:postgresql://postgres:5432/inventory", "enabled": true, "testConnection": true, "activeCount": 3, "maxPoolSize": 20 }
  ],
  "cliHistory": [
    { "command": ":read-attribute(name=server-state)", "outcome": "success", "result": "running" },
    { "command": "/subsystem=datasources/data-source=InventoryDS:test-connection-in-pool", "outcome": "success", "result": [true] }
  ]
}
```

## Sources
- https://docs.redhat.com/en/documentation/red_hat_jboss_enterprise_application_platform/8.1/html/provisioning_jboss_eap/overview-of-jboss-eap-maven-plug-in_default
- https://github.com/jbossas/eap-maven-plugin
- https://www.wildfly.org/news/2024/01/29/WildFly-Glow-an-evolution-of-WildFly-provisioning/
- https://github.com/wildfly/wildfly-glow (releases: 2.2.0.Final)
- https://docs.wildfly.org/39/WildFly_Maven_Plugin_Guide.html
- https://docs.wildfly.org/39/Galleon_Guide.html
- https://mastertheboss.com/jbossas/jboss-configuration/wildfly-glow-next-gen-evolution-in-provisioning/
- https://myfear.substack.com/p/galleon-layers-jboss-eap-8-1-beta-bootable-jar-guide
