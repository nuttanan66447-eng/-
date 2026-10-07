---
name: Civic Architectural Glass
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006387'
  on-tertiary: '#ffffff'
  tertiary-container: '#007da9'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-xl:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.005em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system reimagines civic infrastructure and civil engineering administration through an elite architectural lens. It shifts the perception of municipal operations, transport blueprints, and public works monitoring away from bureaucratic utilitarianism into high-craft computational luxury.

The style unites macOS desktop fluidity with infrastructural rigor. By pairing frosted optical surfaces (`backdrop-filter: blur(24px)`) and airy canvas whites with structural slate tones and cerulean telemetry accents, the interface delivers institutional authority wrapped in effortless serenity. The experience evokes the weightless, sunlit feeling of an architectural studio overlooking a modern metropolis—calm, impeccably organized, and engineered to microscopic tolerances.

## Colors

The palette draws inspiration from engineered materials: structural glass, anodized aluminum alloys, and pristine drafting paper.

- **Canvas & Backgrounds:** The base substrate rests on `#F8FAFC` to `#F1F5F9`, accented by translucent white glass layers (`rgba(255, 255, 255, 0.72)`).
- **Primary (`#0284C7`):** Precision cerulean, functioning as the high-focus vector for active states, key interactive indicators, system health anchors, and selection rings.
- **Secondary (`#0F172A`):** Deep obsidian slate, used exclusively for primary typography, structural icons, and unyielding high-contrast anchors.
- **Tertiary (`#38BDF8`):** Atmospheric sky blue, providing luminous glow states, hover treatments on transparent glass, and active telemetry badges.
- **Neutral (`#64748B`):** Architectural graphite, ensuring legible secondary labels, structural grid lines, and dimensional hairline strokes (`rgba(100, 116, 139, 0.12)`).
- **Traffic Light Status Accents:** Strict functional accents mimic macOS hardware-software parity: Close/Halt (`#FF5F56`), Minimize/Caution (`#FFBD2E`), and Maximize/Operational (`#27C93F`), applied sparingly to status widgets and control apertures.

## Typography

The typographic hierarchy bridges civic durability with premium computing. 

- **Headlines (Manrope):** Geometric clarity and rounded inner contours evoke high-end industrial design blueprints. Kerning is kept deliberately snug (`-0.01em` to `-0.03em`) to mirror executive operating system typography.
- **Body & Data (Hanken Grotesk):** Neo-grotesque discipline provides pristine legibility across tabular civil schedules, spatial metrics, and municipal reports.
- **Micro-labels:** Tracked slightly wide (`0.02em` to `0.04em`) to function as crisp hardware-style annotations, coordinates, and telemetry readouts.

## Layout & Spacing

The layout philosophy follows a floating desktop paradigm. Content floats within modular glass apertures arranged across an architectural grid.

- **Grid Architecture:** 12-column dynamic grid on desktop (1440px max viewport container, 24px gutters, 40px canvas borders); 8-column system on tablet (16px gutters); 4-column system on mobile (16px gutters, 16px margins).
- **Rhythm & Breathing Space:** Density must remain disciplined. Dense data matrices are framed by expansive padding (`space-lg` to `space-xl`) so that high-density infrastructure telemetry never feels claustrophobic.
- **Windowed Frame Layout:** Primary navigational panels emulate native floating macOS toolbars and sidebars with sticky or fixed positioning over persistent canvas viewports.

## Elevation & Depth

Visual depth is achieved through layered translucent optical materials rather than opaque drop shadows.

- **Level 0 (Foundation Base):** Solid structural canvas (`#F8FAFC`) acting as the drafting floor.
- **Level 1 (Dock & Window Panels):** Semi-translucent frosted glass (`rgba(255, 255, 255, 0.72)`) with backdrop blur (`blur(24px) saturate(180%)`), bounded by an interior highlight line (`1px solid rgba(255, 255, 255, 0.8)`) and an exterior hairline ring (`1px solid rgba(15, 23, 42, 0.06)`). Shadow: `0 20px 40px -15px rgba(0, 0, 0, 0.05)`.
- **Level 2 (Floating Inspect Panels & Flyouts):** Suspended glass (`rgba(255, 255, 255, 0.88)`), blur (`blur(32px)`), accented by dual-cast ambient shadows: `0 12px 24px -8px rgba(15, 23, 42, 0.06), 0 24px 48px -12px rgba(2, 132, 199, 0.08)`.
- **Level 3 (Modals & Command Apertures):** Elevated pure crystal (`rgba(255, 255, 255, 0.94)`), blur (`blur(40px)`), with a deep architectural shadow: `0 32px 64px -16px rgba(15, 23, 42, 0.12)`.

## Shapes

The shape hierarchy is continuous and organic, mirroring polished physical glass and precision-machined aluminum casings.

- **Base Radius:** Large elements utilize pill-grade and ultra-radii (16px to 24px, scaling to 32px or 48px on prominent modular panels).
- **Controls & Micro-surfaces:** Buttons, chips, and telemetry badges implement full continuous curvature (stadium / pill profiles) to evoke macOS control center pills.
- **Curvature Continuity:** Outer panel boundaries align seamlessly with inner nested cards by maintaining an 8px radius delta between outer parent and inner child components.

## Components

### Buttons
- **Primary:** Vibrant cerulean fill (`#0284C7`), pure white text, pill curvature (border-radius: 9999px), subtle top highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.25)`). Hover triggers brightness uplift with soft blue ambient bloom (`0 8px 20px -4px rgba(2, 132, 199, 0.4)`).
- **Secondary / Glass:** Translucent backdrop (`rgba(255, 255, 255, 0.6)`), 1px stroke (`rgba(15, 23, 42, 0.08)`), text `#0F172A`. Hover transitions fill to `rgba(255, 255, 255, 0.9)` with `0 4px 12px rgba(0, 0, 0, 0.04)`.
- **Ghost:** Borderless, zero fill. Hover initiates smooth `rgba(2, 132, 199, 0.08)` tinting with cerulean text.

### Cards & Modular Windows
- **Structure:** Encapsulated in 24px rounded frosted panes with 1px dual borders (`rgba(255, 255, 255, 0.8)` inner, `rgba(226, 232, 240, 0.8)` outer).
- **Header:** Features an integrated macOS window control strip with optional traffic light status markers (`#FF5F56`, `#FFBD2E`, `#27C93F`), followed by Manrope display titles and metadata counters.

### Chips & Telemetry Badges
- **Status Pills:** Pill-shaped (`rounded-full`), padded with `4px 12px`, backdrop blur 12px.
- **Variations:** 
  - Structural Health Active: Tinted emerald surface (`rgba(39, 201, 63, 0.12)`), text `#15803D`, 6px pulsating dot.
  - Inspection Pending: Amber tint (`rgba(255, 189, 46, 0.15)`), text `#B45309`.
  - Blue Telemetry: Cerulean tint (`rgba(2, 132, 199, 0.1)`), text `#0284C7`.

### Input Fields & Search Bars
- **Surface:** Recessed frosted trough (`rgba(241, 245, 249, 0.7)`), 16px corner radius, internal inset shadow (`inset 0 1px 2px rgba(0,0,0,0.04)`), 1px border (`rgba(100, 116, 139, 0.15)`).
- **Focus:** Crisp 2-ring highlight with `#0284C7` at 2px expansion, accompanied by canvas light shift to pure white (`rgba(255, 255, 255, 0.95)`).

### Selection Controls (Checkboxes & Radios)
- **Checkboxes:** 18px rounded squares (radius: 6px), soft border in neutral rest state, shifting on check to solid cerulean (`#0284C7`) displaying a razor-sharp white SVG tick.
- **Radio Buttons:** Concentric pill spheres with animated liquid expansion of the inner dot from 0px to 8px during activation.

### Domain-Specific Components (Public Works Telemetry)
- **CAD/GIS Floating Inspector:** Floating bottom dock housing layer toggles, GIS coordinates, scale calibration, and structural load monitors, bound in a single continuous frosted glass capsule.
- **Permit & Blueprint Timeline:** Vertical architectural pipeline using 2px anodized hairline paths, segmented with micro-glass step capsules and live cerulean pulse nodes.