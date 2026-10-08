# Red Hat Ecosystem Catalog (Pyxis) — health grade & newer tag (R17)

## 1. Identity
- **Display name:** Red Hat Ecosystem Catalog
- **Extension id:** `redhat.catalog-checker` (new) — anonymous API
- **Icon:** Red Hat Ecosystem Catalog icon (https://catalog.redhat.com favicon); fallback `/home/astefani/github/podman-desktop/ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Health grade, freshness and newer tags for Red Hat base images; browse certified images.

## 2. Real objects & fields
- `GET https://catalog.redhat.com/api/containers/v1/repositories/registry/{registry}/repository/{repo}/images` and `/images/id/{id}` (verified 2026-10-08): `freshness_grades[{grade "A"…"F", start_date, end_date?, creation_date}]`, `content_sets[]` (e.g. `rhel-9-for-x86_64-appstream-rpms`, `rhel-9-for-x86_64-baseos-rpms`), `architecture`, `repositories[{registry, repository, tags[{name, added_date}], published}]`, `parsed_data.labels`, `cpe_ids`, `docker_image_digest`, `image_id`.
- Grade semantics: A = no known unapplied fixes; B = Important/Critical fixes < ~7 days; C/D/E increasingly stale; F = Critical unfixed > 30 days. Live: `ubi9` latest tag `9.8` (grade A, 2026-10-06), `ubi10` latest `10.2` (grade A).
- Repo object: `/repositories/registry/{r}/repository/{repo}`: `display_data{name, short_description}`, `eol_date`, `release_categories ("Generally Available"|"Deprecated"|"Tech Preview")`, `vendor_label`, `privileged_images_allowed`.

## 3. Placement
- **imageCheckers** (P5) on images whose base is RH content → row "Health grade C (since 2026-09-12) — newer tag 9.8-1791269371 grade A". **columns:** grade chip in image list. **tools:** "Red Hat Catalog" browser (certified images, pull) in Tools (D). **menus:** "Rebase to newer tag" (edits FROM). P#: **P5, P14, P3**.

## 4. Journeys
1. **Stale base.** Images list shows grade **C** chip on `orders-api:2.3` (FROM ubi9:9.5) → Checks: "Base ubi9/ubi-minimal 9.5-1736404155 grade C; newer 9.8 grade A" → "Update FROM in Containerfile" → rebuild → chip A.
2. **Browse certified.** Tools > Red Hat Catalog → search "postgresql" → `rhel9/postgresql-16` → tags + grade → Pull (uses registry.redhat.io creds).
3. **Failure:** image from private registry with no catalog match → "Not a Red Hat catalog image"; deprecated repo (`ubi8/python-39`, `release_categories: Deprecated`) → warning with replacement.

## 5. Sample data
```json
[
  {"repository":"ubi9/ubi-minimal","tag":"9.5-1736404155","grade":"C","freshness_grades":[{"grade":"A","start_date":"2025-01-09T00:00:00Z","end_date":"2025-02-11T00:00:00Z"},{"grade":"B","start_date":"2025-02-11T00:00:00Z","end_date":"2025-03-05T00:00:00Z"},{"grade":"C","start_date":"2025-03-05T00:00:00Z"}],"newerTag":"9.8-1791269371","newerGrade":"A"},
  {"repository":"ubi9/ubi","tag":"9.8","grade":"A","freshness_grades":[{"grade":"A","creation_date":"2026-10-06T07:40:35Z","start_date":"2026-10-06T07:40:35Z"}],"content_sets":["rhel-9-for-x86_64-appstream-rpms","rhel-9-for-x86_64-baseos-rpms"]},
  {"repository":"ubi10/ubi","tag":"10.2","grade":"A","content_sets":["rhel-10-for-x86_64-appstream-rpms","rhel-10-for-x86_64-baseos-rpms"]},
  {"repository":"ubi9/python-311","tag":"9.6-1749000000","grade":"D","newerTag":"9.8-1791100000","newerGrade":"A"},
  {"repository":"ubi8/nodejs-18","tag":"1-130","grade":"F","release_categories":"Deprecated","eol_date":"2025-04-30T00:00:00Z","replacement":"ubi9/nodejs-22"},
  {"repository":"rhel9/postgresql-16","tag":"9.8","grade":"A","release_categories":"Generally Available"},
  {"repository":"rhel10/rhel-bootc","tag":"10.1","grade":"B","newerTag":"10.2","newerGrade":"A"}
]
```
