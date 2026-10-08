# redhat.quay (proposed)

**Real objects / API.** Quay API repositories, tags, robots, manifest security (Clair Features/Vulnerabilities, FixedBy).

**Placement.** Registry quay.io (robot acme+ci_push), TOOLS › Quay, Clair image checker (P5), Push and scan (with ACS pre-push gate) and Rebuild on latest UBI 9 image actions, Pushed badge (P14).

**Journeys.** payments-api:1.5.0 Push and scan → blocked by ACS → Rebuild → push → Clair report.

**Notes.** Imports acs/data.ts for the pre-push gate when ACS is enabled (P5 pre-push hook stand-in).

**Sources.** docs/research/redhat.quay.md
