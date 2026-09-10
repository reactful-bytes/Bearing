# Bearing Icon Inventory

## Scope

This inventory records the semantic icon contract. Application code uses names
from `mobile/src/design/icons.ts`; screens and components do not import Tabler
components or image paths directly. `AppIcon` owns sizing, theme color, and
accessibility behavior.

## Sources and Mapping

| Semantic names | Use | Source and decision |
| --- | --- | --- |
| `plan`, `planOutline` | Plan and schedule navigation | Tabler `IconHome`, a clear visual approximation for the plan hub |
| `goal`, `goals`, `goalsOutline`, `newGoal`, `goalSvg` | Goals and goal creation | Tabler target icons; targets communicate direction and outcomes |
| `focus`, `focusOutline`, `focusMode`, `focusBlock` | Focus mode and focus blocks | Bearing custom green target/crosshair paths |
| `task`, `tasks`, `newTask`, `completed`, `complete` | Tasks and completion | Tabler checklist, list, and circle-check icons |
| `note`, `notes`, `newNote`, `notesSvg` | Notes | Tabler note icons |
| `idea`, `ideas`, `ideaDump` | Idea Dump and captured ideas | Bearing custom orange light bulb with seven light rays |
| `calendar`, `calendarOutline`, `date`, `event`, `targetDate`, `newEvent`, `importedCalendar` | Calendar and date controls | Tabler calendar variants |
| `timeline`, `milestone`, `goalMilestone`, `progress` | Progress and milestones | Tabler timeline, flag, and chart icons |
| `back`, `next`, `forward`, `close`, `create`, `add`, `edit`, `more`, `search` | Global controls | Tabler navigation and action icons |
| `bearingMark` | Brand lockup and launch treatment | Bearing PNG artwork remains the only image exception and is theme-tinted |

The remaining semantic entries in the registry use the closest Tabler
counterpart for their role: account, settings, notifications, security,
billing, legal, sharing, visibility, archive, deletion, and external links.
The registry intentionally preserves semantic names so consumers remain
independent of the library and abstract mappings can evolve without screen
changes.

## Dependency

The mobile app uses `@tabler/icons-react-native` for its library icons. Tabler
components and the two Bearing custom path families are rendered through
`react-native-svg`; they are not generated PNG/SVG crops. Add new library icons
to the semantic registry and render them through `AppIcon`. Keep brand-specific
artwork as an explicit image entry only when a library glyph would not
represent the Bearing identity.

The official multicolor Google mark is intentionally excluded from this
registry and remains an authentication-phase requirement.
