# Red Hat Ecosystem Catalog (`redhat.catalog-checker`)

## Real objects / API
Pyxis `/api/containers/v1/repositories/registry/{r}/repository/{repo}/images` `freshness_grades[{grade,start_date}]`, newer tags, `release_categories` Deprecated.

## Auth
Anonymous.

## Journeys
1. orders-api base ubi9/python-311:9.5 grade C → Rebase to 9.8 (task, new tag).
2. legacy-portal ubi8/nodejs-18 grade F, deprecated → Rebase to ubi9/nodejs-22.
3. Grade badge in the image list.

## Placement
imageCheckers (P5), image list column badge (P14).

## Sources
docs/research/redhat.pyxis-catalog.md
