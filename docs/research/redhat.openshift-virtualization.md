# OpenShift Virtualization

## 1. Identity
- **Display name:** OpenShift Virtualization
- **Extension id:** `redhat.openshift-virtualization` (proposed)
- **Icon:** https://github.com/kubevirt.png
- **Description:** List and control VMs on your OpenShift clusters; run a bootc image as a VM on the cluster.

## 2. Real objects & fields ([KubeVirt API](https://kubevirt.io/api-reference/))
- `VirtualMachine` (`kubevirt.io/v1`): `spec.runStrategy` (`Always`|`RerunOnFailure`|`Manual`|`Halted`|`Once`), `spec.instancetype.name` (e.g. `u1.medium`), `spec.preference.name` (`rhel.9`, `fedora`), `spec.template.spec.volumes[].containerDisk.image` / `dataVolume.name`, `spec.dataVolumeTemplates[]`; `status.printableStatus` (`Stopped`|`Provisioning`|`Starting`|`Running`|`Paused`|`Stopping`|`Terminating`|`Migrating`|`ErrorUnschedulable`|`ErrImagePull`|`CrashLoopBackOff`|`DataVolumeError`), `status.ready`, `status.conditions`.
- `VirtualMachineInstance`: `status.phase` (`Pending`|`Scheduling`|`Scheduled`|`Running`|`Succeeded`|`Failed`), `status.nodeName`, `status.interfaces[].{name,ipAddress,mac}`, `status.guestOSInfo.{prettyName,kernelRelease}`, `status.migrationState`.
- `virtctl console <vm>`, `virtctl vnc`, `virtctl ssh`, `virtctl start|stop|restart|migrate`, `virtctl image-upload`.
- bootc path: `bootc-image-builder --type qcow2` → wrap as containerDisk (`FROM scratch; ADD --chown=107:107 disk.qcow2 /disk/`) → push `quay.io/...-disk` → VM with `containerDisk.image`.

## 3. Placement
- **navSections:** "Virtual Machines" under OpenShift connections `when kube.hasCRD('virtualmachines.kubevirt.io')`.
- **tabs:** VM details: Summary / Console (serial via virtctl, xterm) / YAML / Events. **menus:** Start, Stop, Restart, Migrate, Open console.
- **menus on bootc images** (ext-bootc): "Run as VM on OpenShift…" P#: **P2, P4, P14, P15**.

## 4. Journeys
1. **bootc → VM on ocp-dev.** bootc image `quay.io/acme/payments-edge:9.6` → "Run as VM on OpenShift" → task: build qcow2 → build containerDisk → push → create VM → `Running` → Console tab shows login prompt. Failure: `ErrImagePull` (private repo) → "Add pull secret".
2. **Serial console.** VMs → `rhel9-db-01` → Console → login prompt; Stop → `Stopping` → `Stopped`.
3. **Live migrate.** Kebab → Migrate → `Migrating` → new node. Failure: `LiveMigratable=False` (RWO PVC) → explanation.

## 5. Sample data
```json
[
  {"name":"rhel9-db-01","namespace":"payments","printableStatus":"Running","runStrategy":"Always","instancetype":"u1.large","preference":"rhel.9","node":"worker-1.ocp-dev.acme.internal","ip":"10.131.0.48","guestOS":"Red Hat Enterprise Linux 9.6 (Plow)","created":"2026-07-14T11:03:22Z"},
  {"name":"payments-edge-test","namespace":"payments","printableStatus":"Starting","runStrategy":"Always","instancetype":"u1.medium","containerDisk":"quay.io/acme/payments-edge-disk:9.6","created":"2026-10-08T09:21:40Z"},
  {"name":"win2022-build","namespace":"ci","printableStatus":"Stopped","runStrategy":"Halted","instancetype":"u1.xlarge","preference":"windows.2k22","created":"2026-03-02T08:00:00Z"},
  {"name":"fedora-sandbox","namespace":"jdoe","printableStatus":"ErrImagePull","runStrategy":"Always","containerDisk":"quay.io/containerdisks/fedora:44","created":"2026-10-07T16:45:10Z"},
  {"name":"rhel10-app-02","namespace":"payments","printableStatus":"Migrating","runStrategy":"Always","instancetype":"u1.large","preference":"rhel.10","node":"worker-2.ocp-dev.acme.internal","created":"2026-08-21T13:30:00Z"}
]
```
