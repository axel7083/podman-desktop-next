# podman-desktop-next

Interactive, static mockup of a provider-first Podman Desktop in which every
integration is a mock extension. Architecture and conventions: [AGENTS.md](AGENTS.md).

## How to review

```bash
pnpm install
pnpm dev                    # hot reload on http://localhost:5173/
# or the production build:
pnpm build && pnpm preview  # http://localhost:4173/
```

Open the app with URL parameters to jump straight to a setup:

| Parameter | Values | Effect |
|---|---|---|
| `scenario` | `community`, `rhel`, `openshift`, `appdev`, `ai`, `platform`, `automation`, `windows`, `everything`; combine with `+` (`openshift+rhel`) | Enables the extensions of those personas |
| `theme` | `dark`, `light` | Colour theme |
| `inspect` | `on` | Outlines every contribution with `<extension> · <point> · P#` |
| `welcome` | `off` | Skips the first-visit scenario picker |
| `chrome` | `off` | Hides the lime "Mockup" pill |
| `template` | `on` | Loads `src/extensions/_template` (every contribution kind) |

Example: `http://localhost:5173/?scenario=everything&theme=light&inspect=on`.

The app uses **hash routing**: mockup parameters go in the real query string,
the route (and its own params such as `?tab=`) after `#`:
`http://localhost:5173/?scenario=openshift&theme=light#/c/ocp-dev?tab=mcp`.
`everything` (~75 extensions, 34 connections) is the scaling stress test.
Inside the app, the lime "Mockup" pill switches scenario and theme.

Scenarios: Community (baseline developer), RHEL customer, OpenShift customer,
App developer (Java and middleware), AI developer, Platform engineer (supply chain
and portals), Automation (Ansible), Windows developer (WSL-first).

Where to look:

- `docs/ia.md`: information architecture and the scaling rules the shell follows.
- `docs/design-spec.md`, `docs/decisions.md`: tokens, proposed tokens, decisions.
- `src/extensions/<id>/NOTES.md`: what each mock extension models and why.
- `loop/runs/<timestamp>/<journey>/<theme>/`: screenshots from
  `node loop/run-all.mjs` (run `pnpm build` first; git-ignored).
- `loop/reviews/`: reviewer reports per wave (`everything-4.md` is the latest).
- `loop/needs-human.md`: open UX decisions, unverified data and known limitations.

## Versions & publishing

Published on GitHub Pages: <https://axel7083.github.io/podman-desktop-next/>
(redirects to the latest release; `versions.json` lists every published version).

| URL | What |
|---|---|
| `/podman-desktop-next/v1/`, `/v2/`, … | Releases, one folder per `v*` tag, frozen once published |
| `/podman-desktop-next/next/` | Preview of `main`, rebuilt on every push |
| `/podman-desktop-next/pr-<n>/` | Preview of a same-repo pull request, removed when it closes |
| `/podman-desktop-next/versions.json` | `[{ id, kind: release \| preview \| pr, ref, date }]` |

Deep links work on any version: `…/v1/?scenario=openshift#/settings/resources`.
The lime Mockup pill shows the version, its commit, and a switcher to the same
screen in another published version. Each version keeps its own state
(localStorage keys are prefixed `pdn:<version>:`).

Cut a release from the current `main`:

```bash
git tag v2 && git push origin v2
```

`.github/workflows/pages.yml` builds with `BASE_PATH=/podman-desktop-next/<id>` and
`PUBLIC_MOCKUP_VERSION=<id>`, copies `build/` into `<id>/` on the `gh-pages` branch
(other folders untouched), then regenerates the root `versions.json` and `index.html`
with `scripts/pages/update-site.mjs`. Deploys are serialized (`concurrency: pages`).
Local builds are stamped `dev`.
