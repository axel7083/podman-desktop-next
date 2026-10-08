# redhat.kaoto – Kaoto & Camel (proposed)

**Real objects.** Camel YAML DSL routes (`*.camel.yaml`: `route.id`, `from.uri`, `steps[]` unmarshal / setHeader / to /
split / toD) and Kamelet Pipes (`*.pipe.yaml`: source / steps / sink). Camel JBang CLI: `camel run <file> --dev`,
`camel ps` (PID, NAME, READY, STATUS, AGE, TOTAL, FAIL, INFLIGHT), `camel get route` (PID, NAME, ID, FROM, STATUS, AGE,
TOTAL, FAIL, MEAN, MIN, MAX), `camel stop`, `camel export --runtime=quarkus`.

**Versions.** Kaoto 2.13.0, Red Hat build of Apache Camel 4.14 (`4.14.0.redhat-00006` in logs), JBang 0.131.0.

**Placement.**
- P3 tool `kaoto` ("Kaoto", `/tools/kaoto`): left = files in `~/dev/acme-integrations`; center = vertical route canvas
  (step nodes with FontAwesome icons, selected node highlighted) or "Source" (YAML DSL); right = step properties;
  bottom = "Running integrations" (`camel ps` + `camel get route`) with Stop. Nav badge = running integrations.
- P15 tasks: `camel run … --dev`, `camel stop`, Export to Quarkus.
- P17 cliTools: `camel` (Camel JBang) and `jbang`.
- No containers are seeded: Camel runs on the JVM. `{{kafka.brokers}}` resolves to the acme-kafka service (P8).

**Journeys.** (1) Kaoto → orders-to-kafka.camel.yaml → Run with Camel JBang → row in Running integrations.
(2) Source view. (3) Export to Quarkus.

**Sources.** camel.apache.org camel-jbang + yaml-dsl, KaotoIO/kaoto releases, Red Hat build of Apache Camel 4.14 docs;
dossier `docs/research/redhat.kaoto.md`.
