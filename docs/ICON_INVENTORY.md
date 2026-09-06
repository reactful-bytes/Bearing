# Bearing Icon Inventory

## Scope

This inventory records the semantic icon contract. Application code uses names
from `mobile/src/design/icons.ts`; it must not depend directly on third-party
icon fonts or image paths.

| Semantic name                                       | Use                               | Target sizes | Source                                  | Decision                                              |
| --------------------------------------------------- | --------------------------------- | ------------ | --------------------------------------- | ----------------------------------------------------- |
| `bearingMark`                                       | Brand lockup and launch treatment | 24, 48, 72   | `mobile/assets/icons/bearing-mark*.png` | Transparent alpha mask; tint through the active theme |
| `plan`                                              | Plan/Schedule primary navigation  | 24, 48       | Icon-library mock crop (`home.png`)     | Mock crop mislabeled "plan"; artwork is a home glyph |
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
`mobile/assets/icons/` (alongside the legacy hand-made assets and brand mark)
and are rendered by the active semantic entries in `AppIcon`. The custom
`react-native-svg` definitions remain a secondary, scalable foundation library
for roles that do not yet have a dedicated mock crop. New icons must be added
from the supplied icon-library source rather than from a third-party vector
set.

A few mock crops share a name with an unrelated legacy hand-made icon already
in `mobile/assets/icons/` (`focus`, `goals`, `notes`); the legacy files keep a
`-1` suffix and the mock crops a `-2` suffix. The mock crop originally labeled
`plan` was renamed to `home.png` since the artwork is a home glyph, not a
plan/schedule glyph; the semantic `plan` icon key still points to it.

The official multicolor Google mark is intentionally excluded from this
registry and remains an authentication-phase requirement.

## Full Mock Extraction

`mobile/assets/icons/` contains a `.png` + `.svg` pair for every one of
the 84 unique icon glyphs shown in `docs/mockups/bearing-ui-icon-library.png`
(duplicate glyphs reused across sections, e.g. "Search" or "Notifications",
are captured once). Each crop is trimmed tightly to the glyph's alpha bounds
with a small padding margin and explicitly excludes the caption text printed
beneath every icon in the mock — captions exist only to label the glyph for
this reference sheet, not as part of the artwork.

The `.svg` file for each icon embeds the same cleaned PNG as a base64 raster
inside a minimal `<svg><image/></svg>` wrapper (viewBox matched to the crop's
native pixel size). This project has no offline vector-tracing tool available
(no `potrace`, `vtracer`, `inkscape`, or `pip`, and no passwordless package
install), so hand-tracing ~84 icons into true vector paths was not attempted;
the embedded-raster SVG keeps pixel-perfect fidelity to the approved mock and
is a drop-in replacement if a true vector trace is produced later.
