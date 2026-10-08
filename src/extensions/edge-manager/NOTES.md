# Red Hat Edge Manager (`redhat.edge-manager`)

## Real objects / API
flightctl v1beta1 Device (`summary.status Online|Error|Rebooting…`, `updated.status`, `applicationsSummary`), Fleet (`selector, template.spec.os.image, rolloutPolicy`), EnrollmentRequest (approve with labels).

## Auth
Red Hat SSO (hosted) or OIDC.

## Journeys
1. bootc edge-kiosk VM → Enrollment requests → Approve into fleet kiosks → Device Online.
2. Fleets › kiosks → Roll out edge-kiosk:1.2 → Updating → Rebooting → Online; store-207 Error "greenboot … rolled back".

## Placement
service connection (P8), navSections Devices/Fleets/Enrollment requests (P2), tasks (P15).

## Sources
docs/research/redhat.edge-manager.md
