# Bearing Icon Inventory

## Scope

This inventory records the semantic icon contract. Application code uses names
from `mobile/src/design/icons.ts`; it must not depend directly on third-party
icon fonts or image paths.

| Semantic name                                       | Use                               | Target sizes | Source                                  | Decision                                              |
| --------------------------------------------------- | --------------------------------- | ------------ | --------------------------------------- | ----------------------------------------------------- |
| `bearingMark`                                       | Brand lockup and launch treatment | 24, 48, 72   | `mobile/assets/icons/bearing-mark*.png` | Transparent alpha mask; tint through the active theme |
| `plan`                                              | Plan/Schedule primary navigation  | 24, 48       | Icon-library mock crop                  | Approved Plan artwork                                 |
| `goal`                                              | Goals primary navigation          | 24, 48       | Icon-library mock crop                  | Approved Goal artwork                                 |
| `focus`                                             | Focus Mode                        | 24, 32, 48   | Icon-library mock crop                  | Approved Focus Mode artwork                           |
| `note`                                              | Notes & Ideas primary navigation  | 24, 48       | Icon-library mock crop                  | Approved Note artwork                                 |
| `calendar`                                          | Event/date controls               | 24, 32       | Icon-library mock crop                  | Approved calendar artwork                             |
| `task`                                              | Tasks and task completion         | 24, 32       | Icon-library mock crop                  | Approved task artwork                                 |
| `timeline`                                          | Goal timeline and milestones      | 24, 32       | Supplied Bearing SVG path               | Custom timeline line icon                             |
| `idea`                                              | Idea Dump actions                 | 24, 32       | Supplied Bearing SVG path               | Custom lightbulb line icon                            |
| `profile`                                           | Profile/account                   | 24, 32       | Supplied Bearing SVG path               | Custom profile line icon                              |
| `back`, `close`, `create`, `edit`, `more`, `search` | Global controls                   | 24, 32       | Supplied Bearing SVG paths              | Custom control icon family; no third-party icon font  |

## Asset Follow-up

The supplied icon-library mock at `docs/mockups/bearing-ui-icon-library.png` is
the primary artwork source. Its icon cells are retained under
`mobile/assets/icon-library/` and are rendered by the active semantic entries
in `AppIcon`. The custom `react-native-svg` definitions remain a secondary,
scalable foundation library for roles that do not yet have a dedicated mock
crop. New icons must be added from the supplied icon-library source rather than
from a third-party vector set.

The official multicolor Google mark is intentionally excluded from this
registry and remains an authentication-phase requirement.
