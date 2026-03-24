# Design System Specification

## 1. Overview & Creative North Star: "The Kinetic Command"

This design system is engineered for high-stakes AI orchestration. Our Creative North Star is **The Kinetic Command**—a visual language that balances the cold, mechanical precision of aerospace telemetry with the fluid, intuitive responsiveness of high-end consumer operating systems.

To move beyond the "standard dashboard" look, we reject the rigid grid in favor of **Intentional Asymmetry** and **Tonal Depth**. We do not use borders to define space; we use light and density. Every pixel must feel like a deliberate calculation. The atmosphere is intellectually superior, rigorous, and lightning-fast.

---

## 2. Color & Surface Architecture

Our palette is rooted in a deep obsidian foundation, utilizing Material Design 3 tonal tokens to create a sophisticated, multi-layered environment.

### The Foundation
- **Background:** `#131313` (The void)
- **Primary (Action Blue):** `#adc6ff` (Refined from `#4285F4` for dark-mode legibility)
- **Secondary (Success Emerald):** `#7dffa2` (High-visibility telemetry)
- **Surface (The Base Layer):** `#131313`

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning. Structural separation must be achieved through **Background Color Shifts** only. Use the `surface-container` hierarchy to define boundaries. A `surface-container-low` section sitting on a `surface` background provides all the definition a sophisticated eye requires.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of darkened obsidian. 
- **Base Layer:** `surface` (`#131313`)
- **Main Content Areas:** `surface-container-low` (`#1c1b1b`)
- **Interactive Cards:** `surface-container` (`#201f1f`)
- **Floating Overlays:** `surface-container-highest` (`#353534`) with `backdrop-blur-xl`.

### The "Glass & Gradient" Rule
To inject "soul" into the technical interface, use subtle linear gradients for primary CTAs:
- **Primary Action Gradient:** From `primary` (`#adc6ff`) to `primary_container` (`#4d8efe`) at a 135° angle.
- **Glassmorphism:** For modals or floating HUDs, use `surface_variant` at 60% opacity with a 24px backdrop blur.

---

## 3. Typography: Geometric Clarity vs. Technical Data

We employ a dual-font strategy to distinguish between human-centric navigation and machine-centric data.

- **Primary Typeface (Manrope):** Used for all UI labels, headlines, and body copy. Its geometric nature provides an approachable yet precise feel.
- **Technical Typeface (JetBrains Mono/Space Grotesk):** Used for AI logs, hex codes, timestamps, and performance metrics. This signals "raw data" to the user.

### Typography Scale
- **Display-LG (3.5rem):** Reserved for hero metrics or arena status.
- **Headline-SM (1.5rem):** Section headers within the cockpit.
- **Label-MD (0.75rem / JetBrains Mono):** Metadata, AI agent IDs, and system status logs.
- **Body-MD (0.875rem):** Standard instructional text.

*Note: All "On-Surface" text should be `#e5e2e1` (90% white) to prevent the jarring vibration of pure #FFFFFF against obsidian.*

---

## 4. Elevation & Depth: Tonal Layering

We convey hierarchy through **Tonal Layering** rather than traditional drop shadows or lines.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift. This "inset" look feels more integrated into the "machine."
- **Ambient Shadows:** Only use shadows for high-importance floating elements (e.g., Command Palettes). Use a 32px blur at 8% opacity using the `on_surface` color—not black. This mimics natural ambient light.
- **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (`#424753`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary_fixed` text, 8px (`DEFAULT`) rounding.
- **Secondary:** `surface-container-high` background, no border, `primary` text.
- **Tertiary:** Transparent background, `on_surface_variant` text, shifts to `surface-container-lowest` on hover.

### AI Log Chips
- Small, 4px rounding. Background: `surface-container-highest`. Text: `secondary_fixed` (Success Emerald) in JetBrains Mono.

### Input Fields
- Background: `surface-container-lowest`.
- No border. Bottom-only highlight (2px) using `primary` only when focused.
- Labels: `label-sm` positioned 0.4rem above the input.

### Cards & Lists
- **Prohibition:** Do not use divider lines.
- **Execution:** Separate list items using `0.5rem` vertical whitespace. Use a subtle background shift (`surface-container-low` to `surface-container`) on hover to indicate interactivity.

### The "Arena HUD" (Special Component)
A custom component for AI agent battles. Use a `surface_bright` container with `backdrop-blur-xl`. Use `secondary` (Emerald) for "Live" status indicators and `error` (`#ffb4ab`) for system alerts.

---

## 6. Do’s and Don’ts

### Do
- **Do** use `0.9rem` (Spacing 4) as your default inner padding for cards.
- **Do** lean into "intellectual" white space. If a layout feels crowded, remove a background container before reducing text size.
- **Do** use `secondary_fixed_dim` for all success states to maintain technical sophistication.

### Don't
- **Don't** use 100% opaque white for secondary text; use `on_surface_variant` (`#c2c6d5`).
- **Don't** use "rounded-full" for buttons unless they are icon-only; stick to the `8px` (`DEFAULT`) standard.
- **Don't** use standard "Blue" links. Every interaction must be an "Action Blue" (`#4285F4`) or a surface shift.
- **Don't** add "fluff" animations. Transitions should be fast (150ms) and linear or "out-expo" to feel high-performance.