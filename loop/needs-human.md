
## Wave rhel (after 3 iterations: Fidelity 4 · Scaling 3 · Clarity 4 · Realism 4 · States 3 · Copy 4 · Polish 3→4)

- Shell: NavPage/SettingsPage `capitalize` turns sentence-case titles into Title Case ("Enrollment Requests", "RHEL Registration").
- Shell: connection overview mixes secondary-nav "Overview" with a DetailsPage (breadcrumb + close); VM connections get a nav with only "Overview".
- Shell: toasts stack ("started" + "completed" per task) and never collapse.
- Shell: FactoryForm progress header shows the current step label while the log still shows earlier lines; disabled ui-svelte Checkbox renders unchecked.
- Shell: Settings › Resources "Create new …" buttons wrap; long endpoints break mid-word; desktop-linux name is link-coloured.
- `redhat.redhat-authentication` comes from the OpenShift wave; until merged, Accounts shows no Red Hat SSO card in `?scenario=rhel`.
## Wave: ai (review loop/runs/ai/1/review.md, 2 iterations)

Shell-level, not fixed in the ai wave (no shell changes allowed):
- Every `runTask` shows a "… started" and a "… completed" toast; with several tasks they stack over content (playground send button). Proposal: started toast only for tasks > 5 s, cap 3 toasts.
- `NavPage`/`KubeResourceList` titles are title-cased by ui-svelte ("Model Serving") while nav labels are sentence case.
- Container group names are truncated by the "grouped by X" chip ("bookin…", "mcp…"); secondary-nav header wraps long connection names mid-word.
- `humanAge` prints "1 seconds"; ui-svelte `Checkbox` renders unchecked when `disabled`.
- Light theme: dashboard connection chips use purple border/text; inset card tiles barely contrast.
