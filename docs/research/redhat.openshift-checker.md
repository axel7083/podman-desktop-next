# Red Hat OpenShift Checker

## 1. Identity
- **Display name:** Red Hat OpenShift Checker
- **Extension id:** `redhat.openshift-checker` (real; `ext-image-checker-openshift/podman-desktop-extension/package.json`, Go analyzer in `pkg/`)
- **Icon:** `/home/astefani/github/podman-desktop/ext-image-checker-openshift/podman-desktop-extension/icon.png`
- **Description:** Flags Containerfile directives that misbehave under OpenShift's restricted SCC (arbitrary UID, root group).

## 2. Real objects & fields
- Registered with `imageChecker.registerImageCheckerProvider` (`src/extension.ts:22-48`), returns `ImageCheck{name, status ("success"|"failed"), severity ("low"|"medium"|"high"|"critical"), markdownDescription}` — today's unstructured shape (P5 adds `ruleId`).
- Rules (README): `USER root` / numeric 0; `RUN chmod` without group perms (e.g. `chmod 700 /app`); `chown` not to root group; `EXPOSE` < 1024 (privileged ports); `VOLUME` permissions; `sudo`/`su` usage. Messages e.g. *"USER directive set to root at line 28 could cause an unexpected behavior. In OpenShift, containers are run using arbitrarily assigned user ID"*.

## 3. Placement
- **imageCheckers** → Checks tab group "OpenShift readiness" (P5 `ruleId`, line number). **menus:** "Open Containerfile at line" (when build context known). P#: **P5**.

## 4. Journeys
1. Image `orders-api:2.3` → Checks → 2 findings (USER root L28, chmod 700 L10) → "Open at line" → fix → rebuild → green "OpenShift ready".
2. Before "Deploy to OpenShift Local" (crc) → checker auto-runs → warning dialog with findings.
3. Failure: image has no history/Containerfile metadata → "Only layer history analyzed".

## 5. Sample data
```json
[
  {"image":"quay.io/acme/orders-api:2.3","name":"user-root","status":"failed","severity":"high","line":28,"markdownDescription":"USER directive set to root at line 28 could cause an unexpected behavior.\nIn OpenShift, containers are run using arbitrarily assigned user ID"},
  {"image":"quay.io/acme/orders-api:2.3","name":"chmod-permissions","status":"failed","severity":"medium","line":"10-18","markdownDescription":"permission set on `chmod 700 /app` at line 10-18 could cause an unexpected behavior. Directories must be read/writable by the root group"},
  {"image":"quay.io/acme/legacy-portal:1.9","name":"expose-privileged-port","status":"failed","severity":"medium","line":14,"markdownDescription":"EXPOSE 80: ports below 1024 require privileges not granted by restricted-v2 SCC"},
  {"image":"quay.io/acme/legacy-portal:1.9","name":"user-root","status":"success","severity":"low"},
  {"image":"registry.access.redhat.com/ubi9/ubi-minimal:9.8","name":"all","status":"success","severity":"low","markdownDescription":"No OpenShift issues found"}
]
```
