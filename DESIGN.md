# Meatball Rain — Design Rules

## Design direction

- Playful, hand-drawn arcade-game aesthetic.
- Keep the interface sparse and centered with generous negative space.
- Use warm, tactile colors.
- Preserve small rotations and irregular illustration strokes.
- The overall feeling should be cozy, playful, friendly, and slightly nostalgic.
- Avoid adding unnecessary UI chrome, cards, panels, navigation, or decorative complexity.

## Color palette

| Role | Color |
| --- | --- |
| Warm-paper canvas | `#F5F0E8` |
| Primary ink | `#1A1A1A` |
| Brown accent | `#7A3B1E` |
| Meatball detail | `#5A2A10` |
| Body copy | `#555555` |
| Muted caption | `#888888` |
| Soft illustration fill | `#F0E8D8` |
| Muzzle highlight | `#FDE8B0` |
| Tongue accent | `#F06080` |

Use `#1A1A1A` instead of pure black for primary ink.

Use `#7A3B1E` for “RAIN,” meatballs, the button's hard shadow, and other thematic accents.

Do not replace the warm-paper background with pure white.

## Typography

Use **Caveat** throughout the interface.

| Style | Weight | Size | Line height |
| --- | --- | --- | --- |
| Display title | Bold 700 | `96px` | `96px` |
| Supporting copy | Regular 400 | `24px` | `32px` |
| Primary button | Bold 700 | `30px` | `36px` |
| Caption | Regular 400 | `18px` | `28px` |

### Typography rules

- Display text is uppercase.
- Center-align the title, supporting copy, and button label.
- Keep copy short, friendly, and whimsical.
- Do not replace Caveat with a geometric sans-serif or another generic display font.

## Layout

- Fill the viewport with the warm-paper background.
- Center one narrow vertical composition.
- Reference canvas: approximately `1440 × 1024px`.
- The main composition is approximately `380px` wide.
- Position the composition around the upper-middle area of the reference canvas.
- Preserve this order:

  1. Two-line title
  2. Supporting sentence
  3. Character illustration
  4. Primary action
  5. Small caption

### Spacing rhythm

- Major elements use approximately `16px` spacing.
- Title consists of two tightly stacked `96px` lines.
- Dog illustration area: `140 × 130px`.
- Primary button: approximately `156 × 73px`.
- On smaller screens, maintain at least `16–24px` horizontal padding.

## Title decoration

The title has three floating meatball illustrations arranged asymmetrically around the title.

Reference sizes:

- Medium meatball: approximately `40 × 40px`
- Small meatball: approximately `28 × 28px`
- Large meatball: approximately `50 × 50px`

Preserve their loose, hand-placed arrangement rather than turning them into a perfectly symmetrical decoration.

The meatballs should feel slightly irregular and playful.

## Primary action

The START button is a tactile, slightly imperfect hand-drawn/neo-brutalist element.

- Background: `#1A1A1A`
- Border: `#1A1A1A`
- Border width: approximately `2.7px`
- Label: `#F5F0E8`
- Font: Caveat Bold
- Font size: `30px`
- Line height: `36px`
- Approximate size: `156 × 73px`
- Border radius: `4px`
- Rotation: approximately `-1deg` in the source design
- Hard shadow: `5px 5px 0 #7A3B1E`
- Shadow blur: `0px`

The button should feel physical and tactile.

Do not replace the hard offset shadow with a soft blurred shadow.

Avoid gradients and large corner radii.

## Illustration rules

- Use hand-drawn vector artwork.
- Use dark `#1A1A1A` outlines.
- Favor flat fills and restrained highlights.
- Keep the dog cute, expressive, and central.
- The dog illustration is approximately `140 × 130px`.
- Meatballs use brown fills, dark texture marks, an ink outline, a soft highlight, and a faint ground shadow.
- Keep decorative illustrations sparse.

## Assets

Use the actual Figma-provided vector assets rather than recreating the illustrations with generic shapes.

Expected assets:

- `dog.svg` — approximately `140 × 130px`
- `meatball-40.svg` — approximately `40 × 40px`
- `meatball-28.svg` — approximately `28 × 28px`
- `meatball-50.svg` — approximately `50 × 50px`

Preserve the original illustrations and their proportions.

## Voice

- Playful, direct, and affectionate.
- Supporting copy example:

  **“Catch the meatballs.  
  Make the dog happy.”**

- Use short uppercase actions such as:

  **“START”**

- Caption example:

  **“Good food. Good dog.”**

## Responsive behavior

The design should remain visually centered and uncluttered across viewport sizes.

### Desktop

- Preserve the `96px` display title where there is sufficient vertical space.
- Maintain the centered vertical composition.
- Preserve the approximate `16px` spacing rhythm.

### Short desktop/laptop screens

- Keep the composition horizontally centered.
- Reduce vertical spacing when necessary to prevent unwanted scrolling.
- Scale the title down proportionally when required.

### Mobile

- Keep horizontal padding around `16–24px`.
- Scale the title proportionally rather than allowing it to overflow.
- Keep the dog large enough to remain visually recognizable.
- Scale the decorative meatballs proportionally.
- Keep the START button comfortable to tap.

Responsive values are implementation guidance; the desktop Figma frame remains the primary visual reference.

## Motion direction

Motion should remain subtle and playful.

If animation is added:

- Decorative meatballs may have gentle floating movement.
- The dog may have a very subtle idle animation.
- Button interaction should feel immediate and tactile.

Do not introduce excessive animation that changes the calm, sparse character of the design.

## Gameplay boundary

This document defines the **visual design system and visual direction**.

The Figma reference currently establishes the title/start screen, not the complete gameplay experience.

Therefore, do not treat this document as defining gameplay mechanics.

The following should be determined separately during implementation:

- falling-meatball behavior
- player movement
- keyboard/touch controls
- collision detection
- scoring
- lives or happiness mechanics
- game speed
- difficulty progression
- game-over behavior
- restart behavior
- gameplay HUD

When designing these elements, extend the existing visual language rather than introducing an unrelated visual system.

## Guardrails

- Do not replace Caveat with another font.
- Do not use a pure-white background.
- Do not replace `#1A1A1A` with generic black.
- Do not replace `#7A3B1E` with a generic brown.
- Do not introduce gradients.
- Do not use large corner radii.
- Do not replace the button's hard shadow with a blurred shadow.
- Do not introduce dense UI or excessive decorative elements.
- Preserve intentional hand-drawn irregularity.
- Maintain clear hierarchy and strong contrast.
- Use the provided vector assets instead of recreating them with generic shapes.
- When exact Figma values are available, prefer them over approximation.
- When a value is described as approximate or implementation guidance, do not treat it as an exact Figma measurement.

## Figma source of truth

Figma file:

https://www.figma.com/design/3TUiaSkEuph3p9EEpNK0O0/Meatball-Rain-Game?node-id=4-86

Primary frame/node:

`App` — node `4:86`

The Figma file is the visual source of truth when an implementation detail is unclear.

Use the connected Figma MCP to inspect the relevant node when exact visual information is needed rather than guessing.