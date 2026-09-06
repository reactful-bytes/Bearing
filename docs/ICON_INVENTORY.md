# Bearing Icon Inventory

## Scope

This inventory records the Phase 1 semantic icon contract. Application code
uses names from `mobile/src/design/icons.ts`; it must not depend directly on
MaterialIcons names or image paths.

| Semantic name | Use                               | Target sizes | Source                                  | Decision                                              |
| ------------- | --------------------------------- | ------------ | --------------------------------------- | ----------------------------------------------------- |
| `bearingMark` | Brand lockup and launch treatment | 32, 48, 64   | Existing Bearing artwork                | Static image; do not tint the existing colored source |
| `goal`        | Goals                             | 24, 32, 48   | MaterialIcons `flag`                    | Vector match is legible at row and action sizes       |
| `focus`       | Focus mode                        | 24, 32, 48   | MaterialIcons `center-focus-strong`     | Vector match is legible at row and action sizes       |
| `idea`        | Idea Dump                         | 24, 32, 48   | MaterialIcons `lightbulb-outline`       | Vector match is legible at row and action sizes       |
| `note`        | Notes                             | 24, 32       | MaterialIcons `description`             | Vector match is legible at row size                   |
| `task`        | Tasks                             | 24, 32       | MaterialIcons `check-box-outline-blank` | Vector match is legible at row size                   |
| `timeline`    | Milestones                        | 24, 32       | MaterialIcons `outlined-flag`           | Vector match is legible at row size                   |
| `calendar`    | Calendar                          | 24, 32       | MaterialIcons `calendar-today`          | Vector match is legible at row and action sizes       |
| `profile`     | Profile                           | 24, 32       | MaterialIcons `person-outline`          | Vector match is legible at row size                   |
| `back`        | Navigation control                | 24           | MaterialIcons `arrow-back`              | Generic control remains vector                        |
| `close`       | Dismiss control                   | 24           | MaterialIcons `close`                   | Generic control remains vector                        |
| `create`      | Create action                     | 24, 32       | MaterialIcons `add`                     | Generic control remains vector                        |
| `edit`        | Edit action                       | 24           | MaterialIcons `edit`                    | Generic control remains vector                        |
| `more`        | Overflow control                  | 24           | MaterialIcons `more-horiz`              | Generic control remains vector                        |
| `search`      | Search control                    | 24           | MaterialIcons `search`                  | Generic control remains vector                        |

## Asset Follow-up

The supplied design references are persisted under `docs/mockups/` and have
been reviewed against this table. The current `bearingMark` source has an
opaque white background and cannot be used on the dark surfaces shown in the
references. MaterialIcons also does not match the distinctive Bearing ship or
mountain-and-flag goal glyph closely enough for feature treatments.

Before M22.6 closes, export approved transparent monochrome 24/48/72px PNG
assets under `mobile/assets/icons/` for the Bearing mark and goal glyph. Recheck
the focus reticle, Idea Dump bulb, note, task, timeline, calendar, and profile
at their documented target sizes after those assets are available; keep a
MaterialIcons source only where it remains a close visual match.

The official multicolor Google mark is intentionally excluded from this
registry and remains an authentication-phase requirement.
