# podman-desktop.postgresql

**Real extension:** `ext-postgresql` 0.6.0-next ("Manage local PostgreSQL services
for development"): discovers `postgres:*` / `pgvector:*` containers (credentials
from env), creates new ones (db/user/password/port, init scripts), optional pgAdmin
(`dpage/pgadmin4`, label `pgadmin.port`).

**Mock:** re-expressed with the services-catalog pattern: factory "Create
PostgreSQL" (P12), service connection `acme-postgres` (postgres:18, db `orders`)
(P8), section Databases (tables with row estimates, JDBC URL copy) (P2).
Debezium's "Capture changes" menu and CDC tab target its containers.
Sources: ~/github/podman-desktop/ext-postgresql, docs/research/redhat.debezium.md.
