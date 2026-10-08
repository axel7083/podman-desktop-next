# Red Hat OpenShift Checker (`redhat.openshift-checker`)

## Real objects / API
`ImageCheck{name, status, severity, markdownDescription}` rules user-root, chmod-permissions, expose-privileged-port.

## Auth
None.

## Journeys
1. orders-api → USER root (line 28), chmod 700 (lines 10-18).
2. Hardened rebuild → OpenShift ready.

## Placement
imageCheckers (P5).

## Sources
docs/research/redhat.openshift-checker.md
