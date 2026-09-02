# First Move Friends visual thesis

## Direction

**Generative geometry: a lantern table drawn by rules.** The game looks like a night-time paper game assembled from circles, cuts, and orbit lines. Repeated geometry explains adjacency and ownership before words do. The board is the main image on every game screen; the generated hero scene supports it as a quiet backdrop rather than becoming a separate marketing spectacle.

The identity avoids a generic game portal or card-grid landing page. The landing composition is asymmetric: useful copy and controls occupy one side while a playable 4×4 board overlaps the geometric night scene on the other.

## Palette

The palette comes from warm paper lanterns against an ink-blue table:

This is intentionally a single-mode night treatment. The dark table is part of the game state, and all controls meet contrast requirements within it.

| Token | Value | Use |
| --- | --- | --- |
| Night | `#0b1628` | Page background |
| Deep ink | `#111f35` | Raised surfaces |
| Paper | `#f7f0df` | Primary text and board cells |
| Mist | `#bac6d9` | Secondary text |
| Amber | `#f2b84b` | Player Sun, primary actions |
| Amber ink | `#211606` | Text on amber |
| Tide | `#65c7d0` | Player Moon and focus |
| Coral | `#ff7a72` | Errors and destructive states |
| Moss | `#74c69d` | Success |

Ownership never depends on color: Sun tiles carry a radial sun mark and solid border; Moon tiles carry a crescent and double border. Legal cells use a dotted ring plus the word “Place”.

## Typography

Display type uses **Fraunces**, an OFL variable serif, for the round carved feeling of a physical game title. Body and controls use **Atkinson Hyperlegible**, OFL, because its differentiated letterforms support quick instructions. Both are self-hosted and subset to one WOFF2 file each. If font delivery fails, Georgia and system sans-serif fallbacks preserve hierarchy.

## Spacing and shape

An 8 px base rhythm drives spacing (`8, 16, 24, 32, 48, 64, 96`). Controls are at least 44 px. Board cells use clipped corners and inset rings, like folded paper lanterns. Panels use 18–28 px radii; buttons use a compact 12 px radius so they remain controls, not cards.

## Interaction grammar

- A legal board cell lifts 3 px and gains a dotted orbit on hover or focus.
- A placed lantern expands from its cell center over 220 ms.
- The active player marker travels between two fixed seats.
- The first three turns expose one instruction at a time: choose a centre cell, touch the first tile, then make the first scored pattern.
- Keyboard players use arrow keys to move between cells and Enter or Space to place. Pointer and touch use the same visible cells.
- A turn is validated by the deterministic core before the board changes.

## Motion policy

Motion communicates placement and turns only. UI transitions run 160–260 ms using opacity and transform. A very slow 18 px background drift gives the geometric scene depth. No effect flashes or loops quickly. Under `prefers-reduced-motion`, all transforms, smooth scrolling, and ambient drift stop; state changes remain visible through borders, labels, and live text.

## Difficulty and session curve

The first three moves restrict legal cells and teach one rule per turn. Moves 4–8 allow any empty cell touching the group. The final eight moves reward planning around the public goal and the known next tile. A complete match has 16 placements and is intended to last 6–10 minutes between two new players. Three seeded public goals change scoring, while deterministic shuffled tile symbols change each rematch.

## Art direction and provenance

Hero prompt sheet: *an overhead editorial still life of a 4×4 tabletop lantern game, impossible concentric paper lantern geometry, cut-paper circles and orbital linework, midnight indigo surface, warm amber and cool turquoise light, soft long shadows, subtle paper grain, generous dark negative space, no people, no hands, no text, no letters, no watermark, no logos, no branded objects, no interface screenshot.*

The raster hero is generated for this product with the factory image model on 2026-09-02, reviewed for text, brands, seams, and symbols, then exported to responsive WebP. The board marks, favicon, and UI ornaments are original inline SVG/CSS geometry authored in the repository. Generated imagery is disclosed in the footer.
