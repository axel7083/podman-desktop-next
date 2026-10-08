# redhat.service-interconnect (proposed)

**Real objects / API.** Skupper v2 Site / Link / Listener / Connector / AccessGrant (skupper.io/v2alpha1), system mode on Podman.

**Placement.** Service network section under podman-machine-default and clusters with sites.skupper.io (P2, P11), reusing KubeResourceList; Expose to cluster container action (P14).

**Journeys.** Link to cluster (AccessGrant → AccessToken → Link Ready); postgres → Expose → Connector local + Listener payments-db on ocp-dev.

**Sources.** docs/research/redhat.service-interconnect.md
