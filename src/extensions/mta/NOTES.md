# redhat.mta – Migration Toolkit for Applications (mock)

**Real product:** MTA 8.1 (CLI `mta-cli` 8.1.1 = downstream of Konveyor `kantra`), Konveyor AI / MTA Developer Lightspeed.

## Real objects & fields
- `kantra analyze --input --output --source eap7 --target eap8 --target quarkus --mode source-only|full --run-local=true|false --overwrite`.
- Containerless is the default; hybrid (`--run-local=false`) runs `quay.io/konveyor/java-external-provider:latest` with Podman (random 16-char container name, port 6734, source volume), removed at the end.
- `output.yaml`: rulesets → `violations: {ruleID: {description, category: mandatory|optional|potential, labels (konveyor.io/target=…), incidents: [{uri, lineNumber, message}], links, effort}}`. `data.ts › VIOLATIONS` mirrors it.
- Konveyor AI: generates a diff per incident from an OpenAI-compatible model (`provider-settings.yaml`); user Accepts/Rejects.

## Placement (P#)
| Contribution | Where | P# |
|---|---|---|
| tool `mta` "Migration toolkit" | `/tools/mta` projects + runs, `?view=analyze` wizard, `?report=<id>&target=<t>` report | P3, P15 |
| analyze task + transient provider container (label `konveyor.io/analysis`) | Tasks, Containers list | P15 |
| Konveyor AI fix via AI Lab local inference (`granite-3.3-8b`) | report → incident | P9 |
| image checker `mta-eol` (eap74 / jboss-eap-7 images) | Image › Security | P5 |
| CLI tool `mta-cli`, dashboard card "Migration readiness", command "Analyze application with MTA" | Settings › CLI Tools, Dashboard, palette | P17 |
| seed: `jboss-eap-7/eap74-openjdk11-openshift-rhel8:7.4.22` image + exited `inventory-service-eap7` | podman-machine-default | – |

## Journeys
1. Tools › Migration toolkit › **Analyze** › **Run** → task `kantra analyze inventory-service` (~10 s, provider container appears then disappears) → report eap8: 14 / 9 / 5 issues, **63** story points; tab `quarkus` = 128 pts.
2. Expand `keycloak-openid-00001` › **Generate fix with Konveyor AI** → task "Generating solution" → diff dialog › **Accept** → incident resolved, 63 → 62.
3. **Containerize with EAP 8.1** → `/tools/eap?war=…` (redhat.jboss-eap).

## Mock decisions
- Story points per rule are explicit (`storyPoints`) instead of effort × incidents, so the scenario totals hold (eap8 63, quarkus 128) with 212 namespace incidents.
- Issue counts stay at 14/9/5 after an accepted fix (as the static report would until re-analysis); only points/incidents drop.
- One prior run (`analysis-20261005-1647`) is seeded so the dashboard card has data; the first new run is `analysis-20261008-0912`.
- Rules tagged `cloud-readiness` that matter for the container path (`localhost-jdbc-00002`, `embedded-cache-libraries-01000`) also carry the eap8 target label.

## Sources
docs/research/redhat.mta.md; github.com/konveyor/kantra (usage, hybrid, settings.go); github.com/konveyor/rulesets `stable/java`; docs.redhat.com MTA 8.1.
