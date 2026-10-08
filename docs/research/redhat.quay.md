# Red Hat Quay / quay.io

## 1. Identity
- **Display name:** Red Hat Quay
- **Extension id:** `redhat.quay` (proposed; absorbs feloy/…-image-checker-clair)
- **Icon:** https://github.com/quay.png
- **Description:** Browse your Quay repositories, manage robot accounts and see Clair scan results before and after push.

## 2. Real objects & fields ([Quay API](https://docs.quay.io/api/swagger/))
- Repos `GET /api/v1/repository?namespace=acme&last_modified=true` → `{repositories:[{namespace, name, description, is_public, kind:"image", state:"NORMAL"|"READ_ONLY"|"MIRROR", last_modified, popularity, is_starred}]}`.
- Tags `GET /api/v1/repository/{ns}/{repo}/tag/?onlyActiveTags=true` → `{tags:[{name, reversion, start_ts, end_ts, manifest_digest, is_manifest_list, size, last_modified, expiration}], page, has_additional}`.
- Robots `GET /api/v1/organization/{org}/robots?permissions=true` → `{robots:[{name:"acme+ci_push", description, created, last_accessed, teams, repositories, token}]}`.
- Security `GET /api/v1/repository/{ns}/{repo}/manifest/{digest}/security?vulnerabilities=true` → `{status:"scanned"|"queued"|"failed"|"unsupported", data:{Layer:{Name, NamespaceName, IndexedByVersion, Features:[{Name, Version, VersionFormat, AddedBy, BaseScores, CVEIds, Vulnerabilities:[{Name, Severity:"Critical"|"High"|"Medium"|"Low"|"Negligible"|"Unknown", FixedBy, Link, Description, NamespaceName, Metadata}]}]}}}`.

## 3. Placement
- **connections/registries:** Registry entry `quay.io` (and self-hosted `quay.acme.internal`) with OAuth token.
- **tools:** "Quay" workspace page (repos → tags → scan).
- **imageCheckers:** "Quay Clair" (by reference for pushed images; P5 structured `cve`, `fixedIn`, `package`).
- **tabs:** image details "Registry scan" tab; **menus:** image "Push and scan", robot "Use as registry credential". P#: **P5, P14, P17**.

## 4. Journeys
1. **Push and scan.** Local image `payments-api:1.5.0` → Push and scan → push task → `queued` → `scanned` → Registry scan tab: 1 High, 3 Medium with FixedBy. Failure: `unsupported` (scratch image) → info.
2. **Robot credential.** Quay page → Robots → `acme+ci_push` → "Use for this registry" → stored in Registries.
3. **Fix with rebase.** High CVE in `openssl-libs` FixedBy `1:3.2.2-6.el9_6` → "Rebuild on latest ubi9" quick action.

## 5. Sample data
```json
{
  "repositories":[
    {"namespace":"acme","name":"payments-api","is_public":false,"state":"NORMAL","last_modified":1791367200,"popularity":42},
    {"namespace":"acme","name":"payments-edge","is_public":false,"state":"NORMAL","last_modified":1791280800},
    {"namespace":"acme","name":"payments-edge-disk","is_public":false,"state":"NORMAL","last_modified":1791453600},
    {"namespace":"acme","name":"ledger-worker","is_public":false,"state":"MIRROR","last_modified":1790848800}
  ],
  "tags":[
    {"name":"1.5.0","manifest_digest":"sha256:7f3c1d9a5e2b48c06a1f9e7d3b5c8a2e4f6d0b1c3a5e7f9d2b4c6e8a0f1d3b5c","size":118734512,"last_modified":"Thu, 08 Oct 2026 09:02:11 -0000","is_manifest_list":false},
    {"name":"1.4.0","manifest_digest":"sha256:2a9e4c7b1d3f5a8c0e2b4d6f8a1c3e5b7d9f0a2c4e6b8d1f3a5c7e9b0d2f4a6c","size":117902336,"last_modified":"Mon, 21 Sep 2026 14:40:52 -0000","expiration":"Mon, 21 Dec 2026 14:40:52 -0000"}
  ],
  "robots":[
    {"name":"acme+ci_push","description":"Tekton push","created":"Tue, 03 Feb 2026 10:00:00 -0000","last_accessed":"Thu, 08 Oct 2026 08:55:00 -0000"},
    {"name":"acme+argocd_pull","description":"GitOps pull","created":"Tue, 03 Feb 2026 10:05:00 -0000","last_accessed":"Thu, 08 Oct 2026 09:10:00 -0000"}
  ],
  "security":{"status":"scanned","features":[
    {"Name":"openssl-libs","Version":"1:3.2.2-6.el9_5","AddedBy":"sha256:4b1e…","Vulnerabilities":[{"Name":"RHSA-2026:4412","Severity":"High","FixedBy":"1:3.2.2-6.el9_6","Link":"https://access.redhat.com/errata/RHSA-2026:4412","Metadata":{"cve":"CVE-2026-31790"}}]},
    {"Name":"glibc","Version":"2.34-168.el9_6","Vulnerabilities":[{"Name":"CVE-2026-0915","Severity":"Medium","FixedBy":"2.34-168.el9_6.4"}]},
    {"Name":"python3","Version":"3.9.21-2.el9","Vulnerabilities":[{"Name":"CVE-2026-1299","Severity":"Medium","FixedBy":""}]},
    {"Name":"curl-minimal","Version":"7.76.1-31.el9","Vulnerabilities":[{"Name":"CVE-2026-2241","Severity":"Low","FixedBy":"7.76.1-31.el9_6.1"}]}
  ]}
}
```
