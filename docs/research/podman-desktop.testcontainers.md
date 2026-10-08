# Testcontainers

## 1. Identity
- **Display name:** Testcontainers
- **Extension id:** `podman-desktop.testcontainers` (proposed; community project, no existing Podman Desktop extension)
- **Icon:** https://raw.githubusercontent.com/testcontainers/testcontainers-java/main/docs/logo.svg (verified 200 image/svg+xml; PNG alt https://raw.githubusercontent.com/testcontainers/testcontainers-java/main/docs/logo.png)
- **Description:** Make Podman a first-class Testcontainers runtime: socket setup, session view, Ryuk and reuse management.

## 2. Real objects / fields / enums
- **Versions:** testcontainers-java 2.0.5 (2026-04-20, also pinned by Quarkus); Ryuk `testcontainers/ryuk:0.14.0` (latest moby-ryuk release; exact pin per TC version unverified).
- **Labels on every container/network/volume** (`DockerClientFactory.markerLabels()`):
  - `org.testcontainers=true`
  - `org.testcontainers.sessionId=<uuid>` (one per JVM; Ryuk reaps by this)
  - `org.testcontainers.lang=java` (other langs: `go`, `node`, `dotnet`, `python`)
  - `org.testcontainers.version=2.0.5`
  - reuse: `org.testcontainers.hash=<sha1 of create cmd>`, `org.testcontainers.copied_files.hash=<hex>` (GenericContainer; reusable containers have **no** sessionId so Ryuk keeps them)
  - Ryuk container: `org.testcontainers.ryuk=true` (unverified exact key)
- **`~/.testcontainers.properties` keys:** `docker.host` (e.g. `unix:///run/user/1000/podman/podman.sock`), `docker.client.strategy`, `testcontainers.reuse.enable=true`, `ryuk.disabled` (env `TESTCONTAINERS_RYUK_DISABLED`), `ryuk.container.privileged` (default true), `ryuk.container.timeout` (30 s), `ryuk.container.image`, `checks.disable`, `image.substitutor`, `hub.image.name.prefix`, `pull.timeout` (120), `client.ping.timeout` (10), `transport.type` (`httpclient5`).
- **Env vars for Podman:** `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock` (Linux rootless) or the machine socket path on macOS (`podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'`); `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/run/user/1000/podman/podman.sock` (path mounted into Ryuk); `TESTCONTAINERS_RYUK_CONTAINER_PRIVILEGED=true` (rootful); `TESTCONTAINERS_HOST_OVERRIDE`.
- **Socket readiness:** `systemctl --user is-active podman.socket` / `systemctl --user enable --now podman.socket`; `curl --unix-socket $SOCK http://d/_ping` -> `OK`; Fedora rootless Ryuk works when privileged mode is allowed (SELinux label disable via `--security-opt label=disable`, unverified need).
- **Other images TC pulls:** `alpine:3.17` (tinyimage checks), `testcontainers/sshd:1.3.0` (host port exposure), `testcontainers/vnc-recorder`.

## 3. Placement in the mockup
- **connections (container):** decorates Podman connection `podman-machine-default` with badge "Testcontainers ready" (socket + config ok).
- **tools (P3):** Tools > Testcontainers: environment checklist (socket active, `DOCKER_HOST`, `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE`, Ryuk mode), editable `~/.testcontainers.properties`, sessions list.
- **groupers (P10):** group by `org.testcontainers.sessionId` -> "Test session a3f0... (java, 2.0.5, 5 containers)"; reusable containers grouped "Reused (hash)".
- **columns:** "TC session", "Reusable" (has `org.testcontainers.hash`).
- **menus:** session group kebab: "Kill session" (stop + remove all with sessionId), "Copy env exports"; toolbar: "Clean leaked containers" (sessionId whose Ryuk is gone).
- **settings:** auto-set `DOCKER_HOST` in shell profile; default Ryuk privileged.
- **statusItems:** "TC: 1 active session".
- **onboarding:** "Configure Podman for Testcontainers" steps (enable socket, write properties, smoke test).
- **tasks (P15):** smoke test container run; links to project (P15) when sessions come from `~/dev/acme-orders` (`mvn verify`).

## 4. Journeys
1. **Onboarding.** Tools > Testcontainers shows red "podman.socket inactive". Click "Fix" -> task "Enable Podman socket" (~3 s, log `systemctl --user enable --now podman.socket`, `_ping -> OK`) -> task "Write ~/.testcontainers.properties" (adds `docker.host`, `testcontainers.reuse.enable=true`) -> task "Smoke test" (pulls `testcontainers/ryuk:0.14.0`, `alpine:3.17`, ~12 s). Checklist turns green; Podman connection gets "Testcontainers ready" badge.
2. **Watch a test run.** Maya runs `./mvnw verify` in acme-orders. Containers list shows new group "Test session a3f0c9e2 (java)" with ryuk, postgres:18, kafka:4.2.0, keycloak, apicurio. When the JVM exits Ryuk reaps them; group fades and toast "Session ended, 5 containers removed".
3. **Leaked/reused cleanup.** Toolbar "Clean leaked containers" -> dialog lists 3 containers from a session with no live Ryuk, and 1 reusable postgres (hash label). Confirm -> task "Remove 3 leaked containers" -> list updates; reused container kept.

## 5. Sample data
```json
[
  {"sessionId":"a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa","lang":"java","version":"2.0.5","project":"~/dev/acme-orders","startedAt":"2026-10-08T10:14:02Z","ryuk":"tc-ryuk-a3f0c9e2","containers":5,"state":"active"},
  {"sessionId":"7c1d0e55-03aa-4b2e-8f19-6e4a2b9d0c31","lang":"java","version":"2.0.5","project":"~/dev/inventory-service","startedAt":"2026-10-07T16:40:55Z","ryuk":null,"containers":3,"state":"leaked"},
  {"Id":"1f2e3d4c5b6a","Image":"testcontainers/ryuk:0.14.0","State":"running","Ports":[{"PrivatePort":8080,"PublicPort":32769}],"Labels":{"org.testcontainers":"true","org.testcontainers.ryuk":"true","org.testcontainers.sessionId":"a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa","org.testcontainers.lang":"java","org.testcontainers.version":"2.0.5"},"Mounts":[{"Source":"/run/user/1000/podman/podman.sock","Destination":"/var/run/docker.sock"}]},
  {"Id":"8a9b0c1d2e3f","Image":"docker.io/library/postgres:18","State":"running","Labels":{"org.testcontainers":"true","org.testcontainers.sessionId":"a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa","org.testcontainers.lang":"java","org.testcontainers.version":"2.0.5"},"Created":"2026-10-08T10:14:05Z"},
  {"Id":"4d5e6f7a8b9c","Image":"docker.io/apache/kafka:4.2.0","State":"running","Labels":{"org.testcontainers":"true","org.testcontainers.sessionId":"a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa","org.testcontainers.lang":"java","org.testcontainers.version":"2.0.5"},"Created":"2026-10-08T10:14:07Z"},
  {"Id":"b0c1d2e3f4a5","Image":"docker.io/library/postgres:18","State":"running","Labels":{"org.testcontainers":"true","org.testcontainers.lang":"java","org.testcontainers.version":"2.0.5","org.testcontainers.hash":"3e9a1f0c7b52d48e6a1f2c3d4e5f60718293a4b5","org.testcontainers.copied_files.hash":"0"},"Created":"2026-10-01T08:30:00Z"},
  {"Id":"c6d7e8f9a0b1","Image":"quay.io/keycloak/keycloak:26.7.4","State":"exited","Labels":{"org.testcontainers":"true","org.testcontainers.sessionId":"7c1d0e55-03aa-4b2e-8f19-6e4a2b9d0c31","org.testcontainers.lang":"java"},"Created":"2026-10-07T16:41:10Z"},
  {"propertiesFile":"~/.testcontainers.properties","entries":{"docker.host":"unix:///run/user/1000/podman/podman.sock","testcontainers.reuse.enable":"true","ryuk.container.privileged":"true"}},
  {"environment":{"DOCKER_HOST":"unix:///run/user/1000/podman/podman.sock","TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE":"/run/user/1000/podman/podman.sock","TESTCONTAINERS_RYUK_DISABLED":null},"socket":{"unit":"podman.socket","active":true,"ping":"OK","apiVersion":"5.7.0"}}
]
```

## Sources
- https://github.com/testcontainers/testcontainers-java/blob/main/core/src/main/java/org/testcontainers/DockerClientFactory.java
- https://github.com/testcontainers/testcontainers-java/blob/main/core/src/main/java/org/testcontainers/containers/GenericContainer.java
- https://github.com/testcontainers/testcontainers-java/blob/main/core/src/main/java/org/testcontainers/utility/TestcontainersConfiguration.java
- https://java.testcontainers.org/features/configuration/
- https://java.testcontainers.org/supported_docker_environment/
- https://github.com/testcontainers/moby-ryuk/releases
- https://podman-desktop.io/tutorial/testcontainers-with-podman
