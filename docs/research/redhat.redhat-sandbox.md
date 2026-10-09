# Developer Sandbox

## 1. Identity
- **Display name:** Developer Sandbox
- **Extension id:** `redhat.redhat-sandbox` (real; `ext-sandbox/package.json`)
- **Icon:** `../ext-sandbox/icon.png`
- **Description:** Free 30-day shared OpenShift cluster on Red Hat infrastructure, provisioned with your Red Hat account.

## 2. Real objects & fields
- Registration service (`redhat.sandbox.registrationServiceUrl` = `https://registration-service-toolchain-host-operator.apps.sandbox.x8i5.p1.openshiftapps.com`): `GET /api/v1/signup` → `{ apiEndpoint, clusterName, company, compliantUsername, consoleURL, familyName, givenName, status:{ready, reason:"Provisioned"|"PendingApproval"|"VerificationRequired"|"Deactivated", verificationRequired}, username, proxyURL, rhodsMemberURL, cheDashboardURL, defaultUserNamespace, startDate, endDate }`; `POST /api/v1/signup` to sign up; `PUT /api/v1/signup/verification` (phone).
- Extension creates a ServiceAccount token kube context `dev-sandbox-context` (setting `redhat.sandbox.context.name`), waits `serviceAccountProvisionMaxWaitTime` 180 s.
- Namespace: `<username>-dev`; quotas ~ 3 CPU limits / 14 GiB RAM / 40 GiB storage; idling after 12 h (shown as info).

## 3. Placement
- **connections:** Kubernetes connection type `sandbox` (remote, no start/stop; shows "expires in 23 days").
- **navSections:** standard Kubernetes resources scoped to `<user>-dev`; `OpenShift AI` link (`rhodsMemberURL`), `Dev Spaces` link.
- **menus:** Open Console, Renew (after deactivation), Push image to sandbox (existing "push to cluster").
- **accounts:** depends on `redhat.redhat-authentication`. **dashboardCards:** "Sandbox: 23 days left". P#: **P1, P16, P17 (dashboard card)**.

## 4. Journeys
1. **One-click provision.** Create Sandbox → already signed in → task "Signing up" → "Waiting for approval" → "Provisioning service account" → connection appears. Failure: `verificationRequired: true` → phone verification dialog (code `123456` succeeds in mockup).
2. **Deploy local image to Sandbox.** Image `quay.io/jdoe/payments-api:1.4.0` → Push to Kubernetes → choose `dev-sandbox-context` → Deployment + Route created → open Route. Failure: quota exceeded (`limits.memory`) → error with "Reduce replicas".
3. **Expired sandbox.** Connection shows `Deactivated` → Renew → back to Provisioned.

## 5. Sample data
```json
{
  "signup": {"username":"jdoe-acme","compliantUsername":"jdoe-acme","givenName":"Jane","familyName":"Doe","company":"Acme Bank","clusterName":"sandbox-m2.ll9k.p1","apiEndpoint":"https://api.sandbox-m2.ll9k.p1.openshiftapps.com:6443","consoleURL":"https://console-openshift-console.apps.sandbox-m2.ll9k.p1.openshiftapps.com/","defaultUserNamespace":"jdoe-acme-dev","rhodsMemberURL":"https://rhods-dashboard-redhat-ods-applications.apps.sandbox-m2.ll9k.p1.openshiftapps.com","cheDashboardURL":"https://devspaces.apps.sandbox-m2.ll9k.p1.openshiftapps.com","startDate":"2026-09-22T09:03:11Z","endDate":"2026-10-22T09:03:11Z","status":{"ready":true,"reason":"Provisioned","verificationRequired":false}},
  "context": {"name":"dev-sandbox-context","namespace":"jdoe-acme-dev","user":"pipeline-sa"},
  "quota": [{"resource":"limits.cpu","used":"1500m","hard":"3"},{"resource":"limits.memory","used":"6Gi","hard":"14Gi"},{"resource":"requests.storage","used":"5Gi","hard":"40Gi"},{"resource":"count/pods","used":"7","hard":"50"}],
  "workloads": [{"kind":"Deployment","name":"payments-api","ready":"1/1","image":"quay.io/jdoe/payments-api:1.4.0"},{"kind":"Deployment","name":"postgresql","ready":"1/1","image":"registry.redhat.io/rhel9/postgresql-16:1-48"},{"kind":"Route","name":"payments-api","host":"payments-api-jdoe-acme-dev.apps.sandbox-m2.ll9k.p1.openshiftapps.com"}]
}
```
