# Apicurio Registry 3

## 1. Identity
- **Display name:** Red Hat build of Apicurio Registry
- **Extension id:** `redhat.apicurio-registry` (proposed)
- **Icon:** https://raw.githubusercontent.com/cncf/artwork/main/projects/apicurio-registry/icon/color/apicurio-registry-icon-color.svg (verified 200 image/svg+xml); PNG alt https://raw.githubusercontent.com/Apicurio/apicurio-registry/main/branding/icons/png/apicurio_registry_icon_default_256px.png (verified)
- **Description:** Run a local schema/API registry and browse groups, artifacts, versions and rules used by Kafka SerDes.

## 2. Real objects / fields / enums
- **Versions:** upstream Apicurio Registry 3.3.3 (latest release); Quarkus dev service uses 3.3.1; Red Hat build of Apicurio Registry **3.1** (product). Streams for Apache Kafka 3.2 requires Registry 3.x.
- **Images / ports:** `quay.io/apicurio/apicurio-registry:3.3.3` (API, port 8080), `quay.io/apicurio/apicurio-registry-ui:3.3.3` (UI, port 8080 in container, map to 8888; env `REGISTRY_API_URL=http://localhost:8080/apis/registry/v3`). Product: `registry.redhat.io/apicurio/apicurio-registry-rhel9:3.1` (unverified name).
- **Storage env:** `APICURIO_STORAGE_KIND=sql|kafkasql|gitops`, `APICURIO_STORAGE_SQL_KIND=postgresql|mysql|mssql|h2`, `APICURIO_DATASOURCE_URL`, `APICURIO_DATASOURCE_USERNAME/PASSWORD`; default in-memory H2.
- **REST API base:** `/apis/registry/v3`. Paths (from OpenAPI): `/system/info`, `/groups`, `/groups/{groupId}`, `/groups/{groupId}/artifacts`, `/groups/{groupId}/artifacts/{artifactId}`, `.../versions`, `.../versions/{versionExpression}` (`branch=latest`), `.../versions/{v}/content`, `.../versions/{v}/references`, `.../branches`, `.../rules/{ruleType}`, `/ids/globalIds/{globalId}`, `/ids/contentIds/{contentId}`, `/search/artifacts`, `/admin/rules`, `/admin/export`, `/admin/import`, `/admin/config/artifactTypes`. Compat APIs: `/apis/ccompat/v7` (Confluent), `/apis/registry/v2` (legacy).
- **ArtifactMetaData:** `groupId` (default group `default`), `artifactId`, `artifactType`, `name`, `description`, `owner`, `createdOn`, `modifiedOn`, `labels` (map).
- **VersionMetaData:** `version`, `globalId`, `contentId`, `state`, `createdOn`, `owner`, `name`, `labels`.
- **artifactType:** `AVRO`, `PROTOBUF`, `JSON`, `OPENAPI`, `ASYNCAPI`, `GRAPHQL`, `KCONNECT`, `WSDL`, `XSD`, `XML`; newer on main: `AGENT_CARD`, `MCP_TOOL`, `MCP_SERVER`, `OPENRPC`, `ICEBERG_TABLE`, `ICEBERG_VIEW`, `MODEL_SCHEMA`, `PROMPT_TEMPLATE`, `ODCS_CONTRACT`, `THRIFT` (may postdate 3.3.3).
- **VersionState:** `ENABLED`, `DISABLED`, `DEPRECATED`, `DRAFT`, `SUNSET` (SUNSET on main; unverified in 3.3.3).
- **RuleType:** `VALIDITY` (`FULL`, `SYNTAX_ONLY`, `NONE`), `COMPATIBILITY` (`BACKWARD`, `BACKWARD_TRANSITIVE`, `FORWARD`, `FORWARD_TRANSITIVE`, `FULL`, `FULL_TRANSITIVE`, `NONE`), `INTEGRITY` (`FULL`, `NO_DUPLICATES`, `REFS_EXIST`, `ALL_REFS_MAPPED`, `NONE`). Rules at global (`/admin/rules`), group, artifact level.
- **SerDes config:** `apicurio.registry.url`, `apicurio.registry.auto-register=true`, `apicurio.registry.artifact-resolver-strategy` (TopicIdStrategy -> artifactId `<topic>-value`).

## 3. Placement in the mockup
- **connections (service, P8):** `apicurio` service connection `acme-registry` (`http://localhost:8080/apis/registry/v3`), auto-detects Quarkus dev-service container (`io.quarkus.devservice=apicurio-registry`).
- **connectionFactories (P12):** image flavor (product/upstream), storage (in-memory | PostgreSQL via `podman-desktop.postgresql` connection | KafkaSQL via `redhat.streams-kafka` connection), "Start UI".
- **navSections (P2):** Groups, Artifacts, Rules (global), Settings.
- **tabs (P14):** Kafka topic detail (from streams-kafka) tab "Schema" resolving `<topic>-value`; container tab "Registry".
- **menus:** artifact row: Upload new version, Change state (deprecate/disable), Download content, Compare versions; toolbar: Export (.zip) / Import.
- **dashboardCards (P17):** artifacts count by type.

## 4. Journeys
1. **Start registry on Postgres.** Create -> Apicurio Registry -> storage "PostgreSQL" -> select `acme-postgres` -> Create. Task "Start Apicurio Registry" (~15 s: pull 2 images, start API, wait `/apis/registry/v3/system/info` 200, start UI). World: connection `acme-registry` Running, UI link.
2. **Inspect schema behind a topic.** streams-kafka -> Topics -> `orders.created` -> tab "Schema" -> artifact `orders.created-value` (AVRO, 4 versions, latest `4` globalId 27) -> diff v3 vs v4 (added optional field `couponCode`).
3. **Compatibility failure.** Artifacts -> `payments-value` -> Rules -> set COMPATIBILITY=BACKWARD -> "Upload new version" with a removed required field -> task fails in ~1 s with `409 RuleViolationException: Incompatible artifact: payments-value [AVRO], num of incompatible diffs: {1}` -> toast with "View diff".

## 5. Sample data
```json
[
  {"name":"Apicurio Registry","version":"3.3.3","builtOn":"2026-09-18T07:41:00Z","description":"High performance, runtime registry for schemas and API designs."},
  {"groupId":"default","description":"Default group","createdOn":"2026-09-02T08:00:00Z","owner":"maya"},
  {"groupId":"com.acme.orders","description":"acme-orders event schemas","createdOn":"2026-09-02T08:10:11Z","owner":"maya","labels":{"team":"orders"}},
  {"groupId":"default","artifactId":"orders.created-value","artifactType":"AVRO","name":"OrderCreated","owner":"acme-orders","createdOn":"2026-09-02T08:12:40Z","modifiedOn":"2026-10-06T13:01:22Z","labels":{"topic":"orders.created"}},
  {"groupId":"default","artifactId":"payments-value","artifactType":"AVRO","name":"PaymentEvent","createdOn":"2026-09-03T10:20:00Z","modifiedOn":"2026-09-30T09:12:00Z"},
  {"groupId":"default","artifactId":"orders.cdc.public.orders-value","artifactType":"JSON","name":"Debezium orders envelope","createdOn":"2026-09-10T15:00:03Z","owner":"debezium-connect"},
  {"groupId":"com.acme.orders","artifactId":"acme-orders-api","artifactType":"OPENAPI","name":"Acme Orders API","createdOn":"2026-09-05T11:00:00Z"},
  {"groupId":"com.acme.orders","artifactId":"orders-events","artifactType":"ASYNCAPI","name":"Orders events","createdOn":"2026-09-05T11:05:00Z"},
  {"groupId":"default","artifactId":"orders.created-value","version":"3","globalId":21,"contentId":18,"state":"DEPRECATED","createdOn":"2026-09-22T12:00:00Z"},
  {"groupId":"default","artifactId":"orders.created-value","version":"4","globalId":27,"contentId":24,"state":"ENABLED","createdOn":"2026-10-06T13:01:22Z"},
  {"groupId":"com.acme.orders","artifactId":"acme-orders-api","version":"1.5.0","globalId":29,"contentId":26,"state":"DRAFT","createdOn":"2026-10-07T17:30:00Z"},
  {"ruleType":"COMPATIBILITY","config":"BACKWARD","scope":"global"},
  {"ruleType":"VALIDITY","config":"FULL","scope":"artifact","artifactId":"payments-value"},
  {"ruleType":"INTEGRITY","config":"REFS_EXIST","scope":"group","groupId":"com.acme.orders"}
]
```

## Sources
- https://github.com/Apicurio/apicurio-registry/blob/main/common/src/main/resources/META-INF/openapi.json
- https://github.com/Apicurio/apicurio-registry/blob/main/common/src/main/java/io/apicurio/registry/types/ArtifactType.java
- https://github.com/Apicurio/apicurio-registry/releases
- https://www.apicur.io/registry/docs/apicurio-registry/3.0.x/getting-started/assembly-registry-reference.html
- https://docs.redhat.com/en/documentation/red_hat_build_of_apicurio_registry/3.1/
- https://quay.io/repository/apicurio/apicurio-registry
