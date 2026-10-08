# Certification preflight (`redhat.preflight`)

- **Objects:** openshift-preflight 1.21.1 `preflight check container localhost:5000/acme/orders-api:2.3 [--submit --certification-component-id …]` → `results.json {passed, certification_hash, results{passed[], failed[{name, suggestion}], errors[]}}`. Checks HasLicense, HasUniqueTag, LayerCountAcceptable, HasNoProhibitedPackages, HasRequiredLabel, RunAsNonRoot, HasModifiedFiles, BasedOnUbi.
- **Contributes:** checker (after a run), "cert n/8" image badge, menus "Run certification checks" (pushes to the local registry first, hence `dependsOn podman-desktop.local-registry`) and "Submit to Partner Connect", preflight CLI, settings. Results, one-click Containerfile fix and Submit render in the RHADS Supply chain tab.
- **Journeys:** orders-api 6/8 (HasLicense, RunAsNonRoot) → fix → 8/8 + certification_hash → submit; legacy-portal BasedOnUbi fails.
- **P#:** P5, P15. Source: redhat.preflight.md.
