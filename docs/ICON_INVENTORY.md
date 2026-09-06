# Bearing Icon Inventory

## Scope

This inventory records the semantic icon contract. Application code uses names
from `mobile/src/design/icons.ts`; it must not depend directly on third-party
icon fonts or image paths.

| Semantic name                                       | Use                               | Target sizes | Source                                  | Decision                                              |
| --------------------------------------------------- | --------------------------------- | ------------ | --------------------------------------- | ----------------------------------------------------- |
| `bearingMark`                                       | Brand lockup and launch treatment | 24, 48, 72   | `mobile/assets/icons/bearing-mark*.png` | Transparent alpha mask; tint through the active theme |
| `plan`                                              | Plan/Schedule primary navigation  | 24, 48       | Google Play feature graphic crop        | Full-color approved Schedule artwork                  |
| `goal`                                              | Goals primary navigation          | 24, 48       | Google Play feature graphic crop        | Full-color approved Goals artwork                     |
| `focus`                                             | Focus Mode                        | 24, 32, 48   | Google Play feature graphic crop        | Full-color approved Focus Mode artwork                |
| `note`                                              | Notes & Ideas primary navigation  | 24, 48       | Google Play feature graphic crop        | Full-color approved Notes & Ideas artwork             |
| `calendar`                                          | Event/date controls               | 24, 32       | Supplied Bearing SVG path               | Custom calendar line icon                             |
| `task`                                              | Tasks and task completion         | 24, 32       | Supplied Bearing SVG path               | Custom checkbox/check line icon                       |
| `timeline`                                          | Goal timeline and milestones      | 24, 32       | Supplied Bearing SVG path               | Custom timeline line icon                             |
| `idea`                                              | Idea Dump actions                 | 24, 32       | Supplied Bearing SVG path               | Custom lightbulb line icon                            |
| `profile`                                           | Profile/account                   | 24, 32       | Supplied Bearing SVG path               | Custom profile line icon                              |
| `back`, `close`, `create`, `edit`, `more`, `search` | Global controls                   | 24, 32       | Supplied Bearing SVG paths              | Custom control icon family; no third-party icon font  |

## Asset Follow-up

The supplied design references are persisted under `docs/mockups/`. `plan`,
`goal`, `focus`, and `note` are transparent icon-only crops of the approved
Google Play feature graphic and retain their original colored line work.
`AppIcon` renders the other active semantic entries using the supplied Bearing
SVG paths through `react-native-svg`, with the active theme supplying the line
color. New icons must be added from the supplied icon-library source rather
than from a third-party vector set.

The official multicolor Google mark is intentionally excluded from this
registry and remains an authentication-phase requirement.
