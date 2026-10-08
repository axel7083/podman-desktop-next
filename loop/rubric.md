# Review rubric (plan §8)

Reviewer: a fresh subagent with no authoring context. Inputs: the step PNGs of a
run (`loop/runs/<run>/<scenario>/<theme>/`), the matching `references/` images,
`docs/ia.md`, `docs/design-spec.md` and the extension `NOTES.md` files.

Score each axis 1–5 (5 = indistinguishable from a shipped PD screen):

| Axis | What it checks |
|---|---|
| Fidelity | Looks like PD: tokens, type scale, spacing, icons, components |
| Scaling and IA consistency | Same pattern for the same problem; no clutter with combined scenarios |
| Clarity | Obvious primary action; visual hierarchy |
| Realism | Data and field names match NOTES.md / the real product |
| States and feedback | Tasks, toasts, empty, stopped, filtered and error states |
| Copy | PD copy rules (sentence case, "Delete container?", Cancel link, product names) |
| Polish | Alignment, overflow, truncation, dark/light parity |

Output `loop/runs/<wave>/<iter>/review.md`:

```
## Scores
Fidelity 4 · Scaling 3 · Clarity 4 · Realism 4 · States 3 · Copy 5 · Polish 3

## Defects (most severe first)
1. [Scaling] 03-containers.png (dark): …  → Fix: …
```

Every defect names the screenshot, the theme, the location and a concrete fix.
Stop condition: every axis ≥ 4, or 3 iterations; leftovers go to `loop/needs-human.md`.
