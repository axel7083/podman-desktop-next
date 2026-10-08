
## Wave: ai (review loop/runs/ai/1/review.md, 2 iterations)

Shell-level, not fixed in the ai wave (no shell changes allowed):
- Every `runTask` shows a "… started" and a "… completed" toast; with several tasks they stack over content (playground send button). Proposal: started toast only for tasks > 5 s, cap 3 toasts.
- `NavPage`/`KubeResourceList` titles are title-cased by ui-svelte ("Model Serving") while nav labels are sentence case.
- Container group names are truncated by the "grouped by X" chip ("bookin…", "mcp…"); secondary-nav header wraps long connection names mid-word.
- `humanAge` prints "1 seconds"; ui-svelte `Checkbox` renders unchecked when `disabled`.
- Light theme: dashboard connection chips use purple border/text; inset card tiles barely contrast.
