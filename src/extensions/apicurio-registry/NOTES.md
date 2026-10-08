# redhat.apicurio-registry (proposed)

**Product:** Apicurio Registry 3.3.3 (Red Hat build 3.1). API `/apis/registry/v3`
(groups, artifacts, versions, rules), UI image `apicurio-registry-ui` on 8888.

**Objects:** ArtifactMetaData (`groupId`, `artifactId`, `artifactType`
AVRO|PROTOBUF|JSON|OPENAPI|ASYNCAPI…, `name`, `owner`, `labels`), VersionMetaData
(`version`, `globalId`, `contentId`, `state` ENABLED|DISABLED|DEPRECATED|DRAFT),
rules VALIDITY / COMPATIBILITY (BACKWARD…) / INTEGRITY at global/group/artifact scope.

**Mock:** service connection `acme-registry` (P8) with Artifacts (details: metadata,
versions, rules, content, "Upload new version" task) and Rules sections (P2), a
"Schemas" section under every Kafka connection, and the topic "Schema" tab data
(`<topic>-value`, TopicIdStrategy). Debezium's Avro converter auto-registers
`orders.cdc.public.orders-value`.
Sources: docs/research/redhat.apicurio-registry.md.
