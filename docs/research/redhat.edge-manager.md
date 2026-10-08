# Red Hat Edge Manager (flightctl) — local device dev loop (R11)

## 1. Identity
- **Display name:** Red Hat Edge Manager
- **Extension id:** `redhat.edge-manager` (new) — dependsOn `redhat.redhat-authentication` (hosted) or own OIDC (self-hosted), `redhat.bootc`, `redhat.rhel-vms`
- **Icon:** flightctl logo https://raw.githubusercontent.com/flightctl/flightctl/main/docs/images/flightctl-logo.png (unverified path; fallback `ext-redhat-account/icons/redhat-logo.svg`)
- **Description:** Build a bootc image with the flightctl agent, boot it as a local "device", enroll it and roll fleet updates.

## 2. Real objects & fields (`flightctl/api/core/v1beta1/types.gen.go`, flightctl v1.3.1, 2026-09-29)
- **Device:** `metadata{name (fingerprint), labels}`, `spec{os{image}, config[], applications[], consoles[], decommissioning}`, `status{summary.status, updated.status, applicationsSummary.status, lifecycle.status, integrity.status, systemInfo{agentVersion, architecture, bootID, bootcVersion, operatingSystem, …}, os{image, imageDigest}, lastSeen}`.
  - summary.status: `Online | Degraded | Error | Rebooting | PoweredOff | AwaitingReconnect | ConflictPaused | Unknown`
  - updated.status: `UpToDate | OutOfDate | Updating | Unknown`
  - applicationsSummary.status: `Healthy | Degraded | Error | NoApplications | Unknown`
  - lifecycle.status: `Enrolled | Decommissioning | Decommissioned | Unknown`; integrity: `Verified | Failed | Unsupported | Unknown`
- **Fleet:** `spec{selector{matchLabels}, template{metadata, spec: DeviceSpec}, rolloutPolicy{deviceSelection, disruptionBudget, successThreshold, defaultUpdateTimeout, deltaGeneration}}`; status rollout condition.
- **EnrollmentRequest:** `spec{csr, deviceStatus, labels, knownRenderedVersion, osMode}`, `status{approval{approved, approvedBy, labels}, certificate, conditions[]}`; approve via `flightctl approve er/<name> -l fleet=…`.
- Agent config in image: `/etc/flightctl/config.yaml` (from `flightctl certificate request --signer=enrollment`).

## 3. Placement
- **connections:** "Edge Manager" service connection (server URL, org) (P8). **navSections** under it: Devices, Fleets, Enrollment requests (badge = pending) (P2). **menus:** bootc image kebab "Build as Edge device image" (adds agent + config); RHEL VM "Enroll as device". P#: **P8, P2, P14, P15**.

## 4. Journeys
1. **Local device.** bootc image `edge-kiosk:1.0` → "Build as Edge device" (qcow2) → Boot in RHEL VMs → Enrollment requests badge 1 → Approve with labels `fleet=kiosks, site=lab` → Device `Online / UpToDate`.
2. **Fleet rollout.** Push `edge-kiosk:1.1` → Fleet `kiosks` template os.image → 1.1 → devices `Updating → Rebooting → Online UpToDate`; failure: device `Error` "greenboot health check failed — rolled back to 1.0".
3. **Failure:** agent cannot reach server (VM NAT) → ER never appears → hint "Use host.containers.internal / check firewall"; ER `Denied`.

## 5. Sample data
```json
{"server":"https://api.edge-manager.acme.corp","devices":[
 {"metadata":{"name":"dev-6a0f5c1e9b2d4c7aa1f3b2e8d9c0a4b1","labels":{"fleet":"kiosks","site":"lab","alias":"rhel-vm-kiosk-01"}},"spec":{"os":{"image":"quay.io/acme/edge-kiosk:1.1"}},"status":{"summary":{"status":"Online"},"updated":{"status":"UpToDate"},"applicationsSummary":{"status":"Healthy"},"lifecycle":{"status":"Enrolled"},"integrity":{"status":"Unsupported"},"systemInfo":{"agentVersion":"v1.3.1","architecture":"amd64","bootID":"3f9c…","bootcVersion":"1.8.0","operatingSystem":"linux"},"lastSeen":"2026-10-08T08:15:30Z"}},
 {"metadata":{"name":"dev-0b2c4e6f8a1c3e5f7a9b1d3f5e7c9a1b","labels":{"fleet":"kiosks","site":"store-112"}},"spec":{"os":{"image":"quay.io/acme/edge-kiosk:1.1"}},"status":{"summary":{"status":"Rebooting"},"updated":{"status":"Updating"},"applicationsSummary":{"status":"Unknown"},"lifecycle":{"status":"Enrolled"},"lastSeen":"2026-10-08T08:14:02Z"}},
 {"metadata":{"name":"dev-9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b","labels":{"fleet":"kiosks","site":"store-207"}},"spec":{"os":{"image":"quay.io/acme/edge-kiosk:1.1"}},"status":{"summary":{"status":"Error","info":"greenboot: health check failed, rolled back"},"updated":{"status":"OutOfDate"},"applicationsSummary":{"status":"Degraded"},"lifecycle":{"status":"Enrolled"},"os":{"image":"quay.io/acme/edge-kiosk:1.0"},"lastSeen":"2026-10-08T08:09:44Z"}},
 {"metadata":{"name":"dev-1a3c5e7a9c1e3a5c7e9a1c3e5a7c9e1a","labels":{"fleet":"sensors"}},"spec":{"os":{"image":"quay.io/acme/edge-sensor:0.9"}},"status":{"summary":{"status":"PoweredOff"},"updated":{"status":"UpToDate"},"applicationsSummary":{"status":"NoApplications"},"lifecycle":{"status":"Enrolled"},"lastSeen":"2026-10-02T19:00:00Z"}}],
"fleets":[{"metadata":{"name":"kiosks"},"spec":{"selector":{"matchLabels":{"fleet":"kiosks"}},"template":{"spec":{"os":{"image":"quay.io/acme/edge-kiosk:1.1"},"applications":[{"name":"kiosk-ui","image":"quay.io/acme/kiosk-ui:3.2","appType":"compose"}]}},"rolloutPolicy":{"disruptionBudget":{"maxUnavailable":1},"successThreshold":"90%","defaultUpdateTimeout":"30m"}},"status":{"devicesSummary":{"total":3,"updateStatus":{"UpToDate":1,"Updating":1,"OutOfDate":1}}}},
 {"metadata":{"name":"sensors"},"spec":{"selector":{"matchLabels":{"fleet":"sensors"}},"template":{"spec":{"os":{"image":"quay.io/acme/edge-sensor:0.9"}}}}}],
"enrollmentRequests":[{"metadata":{"name":"dev-4d6f8a0c2e4a6c8e0a2c4e6a8c0e2a4c","creationTimestamp":"2026-10-08T08:16:10Z"},"spec":{"csr":"-----BEGIN CERTIFICATE REQUEST-----\nMIIB…","labels":{"alias":"rhel-vm-kiosk-02"}},"status":{"conditions":[]}},
 {"metadata":{"name":"dev-6a0f5c1e9b2d4c7aa1f3b2e8d9c0a4b1"},"status":{"approval":{"approved":true,"approvedBy":"alice","labels":{"fleet":"kiosks","site":"lab"}},"conditions":[{"type":"Approved","status":"True"}]}}]}
```
