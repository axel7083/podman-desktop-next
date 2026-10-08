# RHEL Lightspeed command-line assistant

## 1. Identity
- **Display name:** RHEL Lightspeed
- **Extension id:** `redhat.rhel-lightspeed` (real; `ext-redhat-lightspeed/packages/extension/package.json`, name `rhel-lightspeed`)
- **Icon:** `/home/astefani/github/podman-desktop/ext-redhat-lightspeed/packages/extension/icon.png`
- **Description:** Get help from RHEL Lightspeed (command-line assistant) inside Podman Desktop.

## 2. Real objects & fields
- Runs container `rhel-lightspeed-podman-desktop` from image `quay.io/vrothberg/command-line-assistant:41` (`helper/lightspeed-container-helper.ts:20-21`) on a **subscribed** Podman machine (README: "You need a valid RHEL subscription in the podman instance… install the Red Hat account extension first").
- Controllers: `chat-prompt-impl.ts` (prompt → answer stream), `lightspeed-impl.ts`, `state-manager.ts` (container state). Webview = chat UI.
- Upstream `c` CLI (command-line-assistant, RHEL 9.6+/10): `c "question"`, `c -a file` (attach), `c history`, backend `https://cert.console.redhat.com/api/lightspeed/v1/infer` with RHSM entitlement cert; answers carry a "Always review AI-generated content" disclaimer.

## 3. Placement
- **tools:** "RHEL Lightspeed" chat in Tools group (D, P3). **menus:** "Explain with Lightspeed" on container logs/error toasts and on Advisor hits (passes text as context); terminal tab button "Ask Lightspeed" on RHEL connections. **when:** enabled only if a connection with `rhel.registered == true` exists (P2-style `when`). P#: **P3, P14, P17**.

## 4. Journeys
1. **Ask from a failed container.** Container `orders-api` exited 1 → Logs → select `SELinux is preventing /usr/bin/python3 from write access` → "Explain with Lightspeed" → answer with `ausearch`/`:Z` volume suffix suggestion + "Copy command".
2. **Chat for a RHEL task.** Tools > RHEL Lightspeed → "How do I enable the CodeReady Builder repo on RHEL 9?" → streaming answer `subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms`.
3. **Failure:** no registered machine → empty state "Needs a RHEL-registered Podman machine" with "Register podman-machine-default" CTA; image pull fails → retry; backend 403 `entitlement not valid` → "Subscription expired".

## 5. Sample data
```json
{
  "container":{"name":"rhel-lightspeed-podman-desktop","image":"quay.io/vrothberg/command-line-assistant:41","engineId":"podman.rhel-9","state":"running","startedAt":"2026-10-08T07:30:12Z"},
  "conversations":[
    {"id":"conv-01","createdAt":"2026-10-08T07:31:00Z","messages":[
      {"role":"user","text":"How do I enable the CodeReady Builder repo on RHEL 9?"},
      {"role":"assistant","text":"Run:\n\n```\nsudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms\n```\nThen `dnf repolist` to verify.","references":["https://access.redhat.com/articles/4348511"]}]},
    {"id":"conv-02","createdAt":"2026-10-08T08:02:41Z","context":{"source":"container-logs","container":"orders-api"},"messages":[
      {"role":"user","text":"Explain: SELinux is preventing /usr/bin/python3 from write access on the directory /data"},
      {"role":"assistant","text":"The bind-mounted host directory lacks the container_file_t label. Re-run with `-v ./data:/data:Z` or `chcon -Rt container_file_t ./data`."}]},
    {"id":"conv-03","createdAt":"2026-10-07T16:10:05Z","context":{"source":"advisor","rule_id":"sshd_secure|SSHD_SECURE"},"messages":[
      {"role":"user","text":"How do I fix SSHD_SECURE on rhel10-dev?"},
      {"role":"assistant","text":"Set `PermitRootLogin no` in /etc/ssh/sshd_config.d/50-redhat.conf and `sudo systemctl restart sshd`."}]}
  ],
  "disclaimer":"Always review AI-generated content prior to use."
}
```
