# JetBrains "Islands" theme: research for the v3 style switch

Islands is the default look of JetBrains IDEs since 2025.3. The v3 mockup copies its
structure as a theme layer (`src/lib/theme/islands.css`, root class `style-islands`).
Classic (`style=classic`) is the v2 P13 look.

## Sources

- [S1] JetBrains blog, "Meet the Islands theme" (Dec 2025):
  https://blog.jetbrains.com/platform/2025/12/meet-the-islands-theme-the-new-default-look-for-jetbrains-ides/
- [S2] `platform/platform-resources/src/themes/islands/ManyIslandsDark.theme.json` and
  `ManyIslandsLight.theme.json` in https://github.com/JetBrains/intellij-community
- [S3] `platform/platform-impl/src/com/intellij/openapi/application/impl/islands/IslandsUICustomization.kt` (same repo)
- [S4] `platform/platform-resources/src/themes/metadata/IntelliJPlatform.themeMetadata.json` (key descriptions, `since 2026.1`)

## Layout [S1]

- Each region (editor, tool windows, panels) is its own rounded "island" floating on the
  window background; the title bar, tool-window stripes and status bar sit on that background.
- More distinct tool-window edges make panels easier to resize and arrange.
- The active tab is "very obvious".
- Rationale: softer, calmer surface that supports focus, aligned with current macOS and
  Windows 11 design. Based on user feedback, research and hands-on testing.

## Concrete values [S2, S3, S4]

| Key | Value | Meaning / our use |
|---|---|---|
| `Island.arc` | `20` (compact `16`) | Swing arc = corner **diameter**, so **10px radius** (compact 8px). Default in code is also 20 [S3]. |
| `Island.borderWidth` | `6` (compact `4`) | Width of the band around each island, painted in the canvas colour. We read it as the **gap: 6px** (guess: it could add up to 12px between two islands; 6px looks right on screen-sized mockups). |
| `Island.borderArcLength` | `14` (compact `10`) | Length of the visible border arc at corners (we draw a full 1px border instead). |
| `Island.borderColor` | `tool-window-bg` (alt: `tool-window-bg-alt`) | Border blends into the island; contrast comes from the canvas. |
| `Island.inactiveAlpha` | `0.56` (code default 0.5) | Islands that are not focused are painted at reduced strength. We use it for the island border and the selected tab (focused island = accent tab, others = neutral grey). |
| `Island.toolWindowAlpha` | `0.2` | Tool-window tint strength (not used). |
| `Islands.emptyGap` | `4` (code default) | Gap used when a side has no tool-window stripe. |
| `EditorTabs.underlineHeight` / `underlineArc` | `4` / `4` | Active tab: rounded 4px underline plus a filled background (`underlinedTabBackground`). |
| `EditorTabs.underlinedTabBackground` | dark `blue-40 #233558`, light `blue-150 #E3EBFE` | Filled selected-tab background (we use PD purple instead of blue). |
| `EditorTabs.underlinedBorderColor` | dark `blue-60 #2E4D89`, light `blue-120 #A7C5FF` | Selected-tab accent. |
| `inactiveUnderlinedTabBackground` | dark `gray-30 #26282C`, light `gray-150 #E9EAEE` | Selected tab in an unfocused island: neutral. |
| `EditorTabs.unselectedAlpha` | `0.75` | Unselected tabs are dimmed. |
| `MainToolbar/ToolWindow/StatusBar.borderColor` | transparent [S3] | No hard divider lines in Islands mode. |

Colours [S2]:

| Surface | Dark | Light |
|---|---|---|
| Window canvas (`main-window-bg`) | `gray-30 #26282C` | `gray-150 #E9EAEE` |
| Editor / tool-window island (`editor-bg`, `tool-window-bg`) | `gray-10 #191A1C` | `white` |
| Alt canvas (`main-window-bg-alt`) | `gray-40 #33353B` | `#E8E8EB` |
| Alt tool window (`tool-window-bg-alt`) | `gray-20 #212326` | `#F7F6F8` |

Note: in JetBrains dark, the canvas is *lighter* than the islands. PD's dark title bar
(`#0f0f11`) is darker than its content (`#222222`), so the mockup keeps PD's order:
**dark canvas, lighter islands**. In light both agree: grey canvas, lighter islands.

### "Different tool window background" [S1, S2]

Settings | Appearance option of the Islands theme. It switches to the `alt` block: tool
windows (and their island border) take `tool-window-bg-alt`, the window takes
`main-window-bg-alt`, so the editor stands out from the tool windows.

## Mockup mapping (PD tokens)

| Variable | Dark | Light |
|---|---|---|
| `--pdn-canvas` | `--pd-titlebar-bg` #0f0f11 | `--pd-global-nav-bg-border` #e4e4e4 |
| `--island-bg` | `--pd-content-bg` #222222 | `--pd-content-bg` #f6f6f6 |
| `--island-tool-bg` (twbg on) | `--pd-global-nav-bg` #27272a | `--pd-terminal-background` #ffffff |
| island border / active | white 6% / 16% | black 7% / 18% |
| active tab pill | `--pd-button-primary-bg` 30% + 65% ring | 16% + 55% ring |
| `--island-radius` / `--island-gap` | 10px / 6px | 10px / 6px |

Not reproduced (guesses or out of scope): compact mode, corner-only border arcs,
tool-window stripes, window tabs.
