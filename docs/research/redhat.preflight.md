# Preflight — container certification readiness (R18)

## 1. Identity
- **Display name:** Red Hat Certification Preflight
- **Extension id:** `redhat.preflight` (proposed)
- **Icon:** https://github.com/redhat-openshift-ecosystem.png
- **Description:** Run the Red Hat container certification checks on your image before you submit it to Partner Connect.

## 2. Real objects & fields
- **CLI:** [openshift-preflight](https://github.com/redhat-openshift-ecosystem/openshift-preflight) **1.21.1** (2026-09-28). `preflight check container localhost:5000/acme/orders-api:2.3 [--docker-config ~/.docker/config.json] [--platform amd64] [--submit --certification-component-id <id> --pyxis-api-token <tok>]`. Needs the image **in a registry** (by reference) → push to the local registry first.
- **Container checks** (source `internal/policy/container/`): `HasLicense` (`/licenses`), `HasUniqueTag` (not only `latest`), `LayerCountAcceptable` (< 40 layers), `HasNoProhibitedPackages` (no RHEL kernel pkgs), `HasRequiredLabel` (`name, vendor, version, release, summary, description[, maintainer]`), `RunAsNonRoot`, `HasModifiedFiles` (no modified RPM files from RH layers), `BasedOnUbi`, plus `HasProhibitedContainerName` and `HasNoProhibitedLabels` (trademark validator).
- **Output** `artifacts/<arch>/results.json`: `{image, passed, certification_hash?, test_library:{name:"github.com/redhat-openshift-ecosystem/openshift-preflight", version, commit}, results:{passed:[{name, elapsed_time, description}], failed:[{name, elapsed_time, description, help, suggestion, knowledgebase_url, check_url}], errors:[]}}` plus `preflight.log`.

## 3. Placement
- **imageCheckers:** "Certification readiness" (P5 by reference + `ruleId`=check name, `markdownDescription`=suggestion). **menus:** image "Run certification checks" (auto-push to local registry), "Submit to Partner Connect". **cliTools:** `preflight`. Depends on `podman-desktop.local-registry`. P#: **P5, P15**.

## 4. Journeys
1. **Readiness.** `orders-api:2.3` → Run certification checks → task (push localhost:5000, preflight) → 6/8 passed; `HasLicense` and `RunAsNonRoot` failed with suggestions → "Add /licenses + USER 1001 to Containerfile" → rebuild → 8/8 → certification_hash shown.
2. **Not UBI.** `legacy-portal:1.9` (FROM node:18-alpine) → `BasedOnUbi` failed → CTA "Rebase on ubi9/nodejs-22".
3. **Submit.** Partner account + component id → `--submit` → link to Partner Connect project.

## 5. Sample data
```json
{"image":"localhost:5000/acme/orders-api:2.3","passed":false,
 "test_library":{"name":"github.com/redhat-openshift-ecosystem/openshift-preflight","version":"1.21.1","commit":"4f2a9c1e"},
 "results":{
  "passed":[
   {"name":"HasUniqueTag","elapsed_time":182,"description":"Checking if container has a tag other than 'latest', so that the image can be uniquely identified."},
   {"name":"LayerCountAcceptable","elapsed_time":0,"description":"Checking if container has less than 40 layers.  Too many layers within the container images can degrade container performance."},
   {"name":"HasNoProhibitedPackages","elapsed_time":611,"description":"Checks to ensure that the image in use does not include prohibited packages, such as Red Hat Enterprise Linux (RHEL) kernel packages."},
   {"name":"HasRequiredLabel","elapsed_time":0,"description":"Checking if the required labels (name, vendor, version, release, summary, description, maintainer) are present in the container metadata and that they do not violate Red Hat trademark."},
   {"name":"HasModifiedFiles","elapsed_time":2304,"description":"Checks that no files installed via RPM in the base Red Hat layer have been modified"},
   {"name":"BasedOnUbi","elapsed_time":95,"description":"Checking if the container's base image is based upon the Red Hat Universal Base Image (UBI)"}],
  "failed":[
   {"name":"HasLicense","elapsed_time":1,"description":"Checking if terms and conditions applicable to the software including open source licensing information are present.","help":"Check HasLicense encountered an error. Please review the preflight.log file for more information.","suggestion":"Create a directory named /licenses and include all relevant licensing and/or terms and conditions as text file(s) in that directory.","knowledgebase_url":"https://access.redhat.com/documentation/en-us/red_hat_software_certification/","check_url":"https://access.redhat.com/documentation/en-us/red_hat_software_certification/"},
   {"name":"RunAsNonRoot","elapsed_time":0,"description":"Checking if container runs as the root user because a container that does not specify a non-root user will fail the automatic certification, and will be subject to a manual review before the container can be approved for publication","suggestion":"Indicate a specific USER in the dockerfile or containerfile"}],
  "errors":[]}}
```
