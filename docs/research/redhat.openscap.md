# OpenSCAP image compliance checker (R9)

## 1. Identity
- **Display name:** OpenSCAP Compliance
- **Extension id:** `redhat.openscap-checker` (new) — offline; runs `oscap-podman` (or `oscap` in a helper container `registry.redhat.io/rhel9/openscap`)
- **Icon:** OpenSCAP logo https://www.open-scap.org/wp-content/uploads/2016/02/openscap-logo.png (fallback `ext-redhat-account/icons/redhat-logo.svg`)
- **Description:** Scan container images against CIS, STIG, OSPP and PCI-DSS profiles from SCAP Security Guide.

## 2. Real objects & fields
- Command: `oscap-podman <image> xccdf eval --profile <id> --results arf.xml --report report.html /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml`.
- **Profiles (SSG, RHEL 9/10):** `xccdf_org.ssgproject.content_profile_cis` (Server L2), `…_cis_server_l1`, `…_cis_workstation_l1/_l2`, `…_stig`, `…_stig_gui`, `…_ospp`, `…_pci-dss`, `…_e8`, `…_hipaa`, `…_anssi_bp28_high`.
- **rule-result `result` enum:** `pass | fail | error | unknown | notapplicable | notchecked | notselected | informational | fixed`; rule `severity`: `low | medium | high | unknown`; `idref`, `title`, `ident` (CCE), score (0–100).
- Remediation: `oscap xccdf generate fix --fix-type bash|ansible|blueprint` (blueprint output feeds Image Builder R5).

## 3. Placement
- **imageCheckers** (P5, `ruleId`) → Checks tab group "Compliance (CIS L1 server): score 71.4%", profile picker in checker settings. **menus:** "Generate remediation (Containerfile RUN / Ansible)". Settings: default profile. P#: **P5, P17 (cliTools for oscap-podman)**.

## 4. Journeys
1. **CIS scan.** Image `orders-api:2.3` → Checks → Run OpenSCAP (profile CIS L1 server) → task 40 s → 112 pass / 18 fail / 63 notapplicable → filter fail+high → `rpm_verify_permissions` details.
2. **Fix & rescan.** "Generate bash fix" → snippet appended to Containerfile → rebuild → score 71 → 88.
3. **Failure:** non-RHEL base → "No matching SSG datastream (detected alpine 3.20)"; rootless podman → `oscap-podman requires root` → "Run in rootful machine rhel-9".

## 5. Sample data
```json
{"image":"quay.io/acme/orders-api:2.3","profile":"xccdf_org.ssgproject.content_profile_cis_server_l1","datastream":"ssg-rhel9-ds.xml","ssgVersion":"0.1.78","scannedAt":"2026-10-08T08:14:02Z","score":71.4,"counts":{"pass":112,"fail":18,"notapplicable":63,"notchecked":4,"error":0},
"rules":[
 {"idref":"xccdf_org.ssgproject.content_rule_rpm_verify_permissions","title":"Verify and Correct File Permissions with RPM","severity":"high","result":"fail","ident":"CCE-90840-2"},
 {"idref":"xccdf_org.ssgproject.content_rule_no_empty_passwords","title":"Prevent Login to Accounts With Empty Password","severity":"high","result":"pass","ident":"CCE-83611-6"},
 {"idref":"xccdf_org.ssgproject.content_rule_package_aide_installed","title":"Install AIDE","severity":"medium","result":"fail","ident":"CCE-90843-6"},
 {"idref":"xccdf_org.ssgproject.content_rule_file_permissions_etc_shadow","title":"Verify Permissions on /etc/shadow","severity":"medium","result":"pass","ident":"CCE-83615-7"},
 {"idref":"xccdf_org.ssgproject.content_rule_ensure_gpgcheck_globally_activated","title":"Ensure gpgcheck Enabled In Main dnf Configuration","severity":"high","result":"pass","ident":"CCE-83457-4"},
 {"idref":"xccdf_org.ssgproject.content_rule_sshd_disable_root_login","title":"Disable SSH Root Login","severity":"medium","result":"notapplicable","ident":"CCE-90799-0"},
 {"idref":"xccdf_org.ssgproject.content_rule_grub2_password","title":"Set Boot Loader Password","severity":"high","result":"notapplicable","ident":"CCE-83849-2"},
 {"idref":"xccdf_org.ssgproject.content_rule_configure_crypto_policy","title":"Configure System Cryptography Policy","severity":"high","result":"fail","ident":"CCE-83450-9"},
 {"idref":"xccdf_org.ssgproject.content_rule_accounts_password_minlen_login_defs","title":"Set Password Minimum Length in login.defs","severity":"medium","result":"fail","ident":"CCE-83433-5"},
 {"idref":"xccdf_org.ssgproject.content_rule_audit_rules_immutable","title":"Make the auditd Configuration Immutable","severity":"medium","result":"notchecked"}
]}
```
