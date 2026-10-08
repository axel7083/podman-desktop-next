# Migration Toolkit for Applications (MTA / Konveyor kantra)

## 1. Identity
- **Display name:** Migration Toolkit for Applications
- **Extension id:** `redhat.mta` (proposed; community variant `konveyor.kantra`)
- **Icon:** https://raw.githubusercontent.com/konveyor/community/main/brand/logo/konveyor-logo-konveyor.svg (verified 200, image/svg+xml; Konveyor logo from the official brand folder)
- **Description:** Analyze an application's source with kantra/MTA rulesets for a migration target, browse issues by effort, and apply AI-generated or OpenRewrite fixes.

## 2. Real objects & fields
- **Versions:** MTA **8.1** (8.1.1 patch released; docs include "Red Hat Developer Lightspeed for MTA"). Upstream kantra latest release **v0.11.0-beta.1**. MTA CLI = downstream kantra (`mta-cli`).
- **Command:** `kantra analyze --input=<dir|war> --output=<dir> --target eap8 --target quarkus --source eap7 --mode full|source-only --run-local=true|false --overwrite [--rules ./custom] [--label-selector ...] [--json-output] [--skip-static-report] [--enable-default-rulesets=false] [--provider java] [--list-languages]`. Discovery: `kantra rules list-targets`, `kantra rules list-sources`, `kantra provider list`.
- **Modes:** *Containerless* is now the **default** (Java + builtin providers in-process, needs JDK 17+ and Maven). *Hybrid* (`--run-local=false`, auto for non-Java) runs providers in containers; Kantra defaults to `podman` (`CONTAINER_TOOL` overrides).
- **Provider images (settings.go):** `quay.io/konveyor/java-external-provider:latest`, `quay.io/konveyor/go-external-provider`, `quay.io/konveyor/python-external-provider`, `quay.io/konveyor/nodejs-external-provider`, `quay.io/konveyor/c-sharp-provider`, runner `quay.io/konveyor/kantra` (env `JAVA_PROVIDER_IMG`, `RUNNER_IMG`...). Hybrid creates a volume for the source, starts provider containers with a published port (java on `localhost:6734`), then stops/removes them. Container/volume names are randomly generated (unverified exact format, e.g. 16 lowercase chars). MTA ships `registry.redhat.io/mta/mta-java-external-provider-rhel9:8.1` (unverified).
- **Targets (labels `konveyor.io/target=`):** `eap8`, `eap81`, `eap7`, `quarkus`, `cloud-readiness`, `jakarta-ee`, `jakarta-ee9+`, `openjdk11`, `openjdk17`, `openjdk21`, `openjdk25`, `azure-appservice`, `azure-aks`, `azure-container-apps`, `camel4`, `openliberty`, `rhr`, `linux`, `spring-boot-4`. **Sources:** `eap7`, `eap6`, `javaee`, `springboot`, `spring-framework`, `weblogic`, `websphere`, `log4j`, `openjdk11`, `java-ee`. Rulesets live in `konveyor/rulesets` `stable/java/<dir>`.
- **Output dir:** `output.yaml` (list of rulesets), `dependencies.yaml`, `static-report/index.html`, `analysis.log`, `dependency.log`, `provider.log` (hybrid).
- **output.yaml shape:** `- name: eap8/eap7` -> `description`, `tags`, `violations: {<ruleID>: {description, category: mandatory|optional|potential, labels, incidents: [{uri, message, codeSnip, lineNumber, variables}], links: [{url, title}], effort}}`, `insights` (effort 0 / tags), `unmatched`, `skipped`, `errors`.
- **Real rule ids:** `javaee-to-jakarta-namespaces-00001` (mandatory, effort 1), `javax-to-jakarta-dependencies-00001`, `keycloak-openid-00001` ("Update the 'auth-method' configuration from KEYCLOAK to OIDC"), `keycloak-openid-00010` (rename keycloak.json -> oidc.json), `eap8-ejb-00001`, `eap_channel_manifest_8_0_upgrade-00001` (eap81), `jms-to-reactive-quarkus-00000` ("JMS is not supported in Quarkus", effort 5), `jms-to-reactive-quarkus-00010` (@MessageDriven, effort 3), `ee-to-quarkus-00000` (@Stateless, potential), `ee-to-quarkus-00010` (@Stateful), `localhost-jdbc-00002` (cloud-readiness, effort 7), `embedded-cache-libraries-01000`.
- **Transform:** `kantra transform openrewrite --list-targets`; `kantra transform openrewrite --input=. --target=jakarta-imports` (runs in a container).
- **Konveyor AI (Kai) / MTA Developer Lightspeed:** VS Code extension (`konveyor/editor-extensions`) running analysis + `kai-rpc-server`; optional **solution server** (MTA hub, stores accepted fixes to improve later prompts). LLM config `provider-settings.yaml`: `environment`, `models: {<Name>: {provider: ChatOpenAI|AzureChatOpenAI|ChatBedrock|ChatGoogleGenerativeAI|ChatOllama|ChatDeepSeek, args: {model, configuration.baseURL}, environment: {OPENAI_API_KEY}}}`, `active: *anchor`. Generates a diff per incident (or batch per rule), user Accepts/Rejects, re-analysis verifies.

## 3. Placement (provider-first UI)
- **tools (P3):** "Migration (MTA)" page: projects list, analysis runs, issues table.
- **P15 project/workspace + tasks:** `~/dev/inventory-service` -> Analyze task (progress, logs, cancel). Hybrid runs show the provider container in Containers list labelled with the task (P15 linked containers).
- **cliTools:** `kantra` / `mta-cli` install + version.
- **columns / groupers:** issues grouped by category (mandatory/optional/potential) or by ruleset; columns rule id, incidents, effort, total story points.
- **menus:** issue row: Open in editor (uri:line), Get AI fix, Apply OpenRewrite recipe, Copy link.
- **settings:** default targets, mode, run-local, LLM provider (P9: reuse an InferenceProviderConnection from Kaiden instead of a raw API key), solution server URL.
- **P16:** Red Hat SSO for MTA hub / solution server.
- **dashboardCards (P17):** "Migration readiness" card: story points by target.

## 4. Journeys
1. **Analyze inventory-service for EAP 8.** Projects > inventory-service > Analyze -> source `eap7`, target `eap8`, mode source-only, hybrid -> task "kantra analyze" (pull `java-external-provider` 1.1 GB, start provider container, "Loading rulesets (14)", "Evaluating rules 212/2410", "Writing static report"; ~2 m 10 s) -> provider container disappears; Issues: 9 mandatory, 3 optional, 4 potential, 47 story points; "Open static report".
2. **Fix the RH-SSO adapter with AI.** Issue `keycloak-openid-00001` (web.xml line 41) -> Get AI fix -> task "Generating solution" (model `granite-3.3-8b` via Kaiden inference connection, 18 s) -> diff `KEYCLOAK` -> `OIDC`, plus new `oidc.json` -> Accept -> re-analysis task (25 s) -> incident resolved, points 47 -> 45.
3. **Bulk namespace rewrite.** Issue `javaee-to-jakarta-namespaces-00001` (14 incidents) -> Apply OpenRewrite recipe -> task "kantra transform openrewrite --target=jakarta-imports" (40 s, 61 files changed) -> rerun target `quarkus` to compare: shows `jms-to-reactive-quarkus-00000` mandatory (effort 5) -> decision hint "EAP 8.1 path: 45 pts / Quarkus: 128 pts".

## 5. Sample data
```json
[
  { "name": "eap8/eap7", "violations": {
      "javaee-to-jakarta-namespaces-00001": { "description": "Replace the Java EE namespace, schemaLocation and version with the Jakarta EE 10 equivalent", "category": "mandatory", "effort": 1, "labels": ["konveyor.io/source=javaee", "konveyor.io/target=jakarta-ee9+", "konveyor.io/target=eap8"],
        "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/src/main/webapp/WEB-INF/web.xml", "lineNumber": 2, "message": "Replace `http://xmlns.jcp.org/xml/ns/javaee` with `https://jakarta.ee/xml/ns/jakartaee`" },
                      { "uri": "file:///home/maya/dev/inventory-service/src/main/resources/META-INF/persistence.xml", "lineNumber": 2, "message": "Replace the persistence namespace and set version 3.1" }],
        "links": [{ "url": "https://jakarta.ee/specifications/", "title": "Jakarta EE Specifications" }] },
      "keycloak-openid-00001": { "description": "Update the 'auth-method' configuration from KEYCLOAK to OIDC", "category": "mandatory", "effort": 1,
        "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/src/main/webapp/WEB-INF/web.xml", "lineNumber": 41, "message": "The KEYCLOAK auth-method is not supported in EAP 8; use OIDC with elytron-oidc-client" }],
        "links": [{ "url": "https://docs.redhat.com/en/documentation/red_hat_jboss_enterprise_application_platform/8.1/html/using_single_sign-on_with_jboss_eap", "title": "Using SSO with JBoss EAP" }] },
      "keycloak-openid-00010": { "description": "Rename the keycloak.json configuration file to oidc.json", "category": "mandatory", "effort": 1,
        "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/src/main/webapp/WEB-INF/keycloak.json", "lineNumber": 1, "message": "Rename keycloak.json to oidc.json" }] },
      "javax-to-jakarta-dependencies-00001": { "description": "The 'javax' groupId has been replaced by 'jakarta' group id in dependencies.", "category": "mandatory", "effort": 1,
        "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/pom.xml", "lineNumber": 58, "message": "Replace groupId javax with jakarta.platform (jakarta.jakartaee-api 10.0.0)" }] }
    },
    "insights": { "technology-usage-jms-00001": { "description": "JMS MessageDriven Bean", "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/src/main/java/com/acme/inventory/ReservationListener.java", "lineNumber": 18 }] } } },
  { "name": "quarkus/springboot", "violations": {
      "jms-to-reactive-quarkus-00000": { "description": "JMS is not supported in Quarkus", "category": "mandatory", "effort": 5,
        "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/src/main/java/com/acme/inventory/ReservationListener.java", "lineNumber": 7, "message": "Usage of JMS is not supported in Quarkus. Use Quarkus Messaging (SmallRye Reactive Messaging) with the AMQP connector" }] },
      "ee-to-quarkus-00000": { "description": "@Stateless annotation must be replaced", "category": "potential", "effort": 1,
        "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/src/main/java/com/acme/inventory/StockService.java", "lineNumber": 22, "message": "Replace @Stateless with a CDI scope such as @ApplicationScoped" }] }
    } },
  { "name": "cloud-readiness", "violations": {
      "localhost-jdbc-00002": { "description": "Localhost JDBC connection", "category": "mandatory", "effort": 7,
        "incidents": [{ "uri": "file:///home/maya/dev/inventory-service/src/main/resources/META-INF/persistence.xml", "lineNumber": 14, "message": "jdbc:postgresql://localhost:5432/inventory: use a service name or env var" }] }
    } },
  { "run": { "id": "analysis-20261008-0912", "startedAt": "2026-10-08T09:12:04Z", "durationSec": 130, "mode": "source-only", "runLocal": false, "targets": ["eap8"], "sources": ["eap7"],
    "providerContainer": { "name": "kjqvxmhtrapzlewc", "image": "quay.io/konveyor/java-external-provider:latest", "ports": ["6734:6734"] },
    "output": ["output.yaml", "dependencies.yaml", "static-report/index.html", "analysis.log", "provider.log"], "storyPoints": 47 } }
]
```

## Sources
- https://docs.redhat.com/en/documentation/migration_toolkit_for_applications/8.1/html/release_notes
- https://docs.redhat.com/en/documentation/migration_toolkit_for_applications/8.1
- https://github.com/konveyor/kantra (README, docs/usage.md, docs/hybrid.md, cmd/internal/settings/settings.go)
- https://github.com/konveyor/kantra/releases (v0.11.0-beta.1)
- https://github.com/konveyor/rulesets/tree/main/stable/java (eap8, eap81, quarkus, cloud-readiness)
- https://github.com/konveyor/editor-extensions/blob/main/vscode/core/resources/sample-provider-settings.yaml
- https://github.com/konveyor/kai
- https://github.com/konveyor/community/tree/main/brand/logo
