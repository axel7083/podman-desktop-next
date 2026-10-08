# redhat.openshift-lightspeed (proposed)

**Real objects / API.** OLS `/v1/query` with attachments (log, api object), referenced_documents, token counts; kubernetes-mcp-server flags.

**Placement.** TOOLS › Lightspeed chat scoped to a cluster, Ask Lightspeed on pods/PipelineRuns/VMs/Deployments (P4), MCP tab on Kubernetes connections (P9).

**Journeys.** ledger-worker CrashLoopBackOff → Ask Lightspeed (YAML + logs attached) → streamed answer → apply fix → pod Running; start MCP server read-only and copy client config.

**Notes.** Not installed on ocp-prod → EmptyScreen linking to Operators.

**Sources.** docs/research/redhat.openshift-lightspeed.md
