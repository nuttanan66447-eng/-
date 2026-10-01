---
name: Si Kaeo Municipal Engineering e-GovTech
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
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#a73a00'
  on-secondary: '#ffffff'
  secondary-container: '#fd651e'
  on-secondary-container: '#571a00'
  tertiary: '#122c45'
  on-tertiary: '#ffffff'
  tertiary-container: '#2a425c'
  on-tertiary-container: '#96aecd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb599'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#7f2b00'
  tertiary-fixed: '#d1e4ff'
  tertiary-fixed-dim: '#b0c9e8'
  on-tertiary-fixed: '#011d35'
  on-tertiary-fixed-variant: '#314863'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: publicSans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: publicSans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: publicSans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: publicSans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: publicSans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  body-lg:
    fontFamily: sourceSans3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: sourceSans3
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: sourceSans3
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: publicSans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: publicSans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: publicSans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  gutter-mobile: 0.75rem
  gutter-desktop: 1rem
  margin-mobile: 1rem
  margin-desktop: 1.5rem
---

## Brand & Style

This design system delivers an authoritative, modern civic management interface for municipal civil engineers, site inspectors, and executive municipal leaders. The emotional tone balances constitutional governance with operational engineering rigour: dependable, uncompromisingly clear, efficient, and technologically progressive.

The aesthetic blends **Corporate Civic Modernism** with dense, technical utility. Interfaces avoid ornamental visual clutter in favor of crisp structural discipline, clear hierarchical data presentation, and immediate legibility under high-stress administrative workflows and field inspections. High-contrast state communication, authoritative royal navy structures, and functional safety-amber accents convey technical precision and legal institutional permanence.

## Colors

The palette establishes institutional trust, civil engineering utility, and strict municipal accountability:

- **Primary (`#1E3A8A`)**: Deep Royal Blue symbolizing civic authority, stability, and legal integrity. Used for primary navigation, critical interactive controls, and key active states.
- **Secondary (`#EA580C`)**: Civil Engineering Safety Amber/Orange. Applied purposefully to operational status markers, construction site actions, budget alerts, and active field tasks.
- **Tertiary (`#0F2942`)**: Midnight Navy. Serves as the top-level structural anchor for enterprise navigation headers, sidebars, and high-level municipal metric headings.
- **Neutral (`#64748B`)**: Slate neutral scale. Grounded in `#F8FAFC` for base canvases, `#F1F5F9` for secondary structural surfaces, `#CBD5E1` for rigid table borders, and `#0F172A` for high-contrast alphanumeric and Thai text.
- **System Diagnostics**:
  - **Success / On-Schedule (`#059669`)**: Project delivery on track, approved engineering drawing, signed inspection.
  - **Warning / Review Required (`#D97706`)**: Pending municipal clerk audit, structural permit hold, budget revision needed.
  - **Critical / Delayed (`#DC2626`)**: Schedule overrun, compliance hazard, halted site work.

## Typography

Typography prioritizes extreme legibility for complex administrative IDs, civil engineering coordinates, fiscal budget tallies, and mixed bilingual Thai/Latin records.

- **Headlines & Labels (`publicSans`)**: An institutional, highly legible geometric sans-serif that lends governance weight to project titles, municipal departmental divisions, and technical metrics.
- **Body & Data (`sourceSans3`)**: A clean, balanced workhorse designed for dense tabular data, project descriptions, regulatory clauses, and procurement specifications.
- **Tabular Numerals**: All numerical data (Thai Baht values, project progress percentages, BOQ item codes) must enforce monospace or tabular figures (`font-variant-numeric: tabular-nums`) to preserve vertical alignment across ledger grids.

## Layout & Spacing

The layout is architected around a dense, high-utility **fluid grid system** tailored for wide-display municipal workstations, rugged site tablets, and inspection smartphones:

- **Desktop (1200px+)**: 12-column layout with a fixed 260px administrative navigation sidebar. Gutters are compact (16px / `space-base`) to maximize horizontal table density for Bill of Quantities (BOQ) and construction schedules.
- **Tablet (768px - 1199px)**: 8-column layout with a collapsible drawer sidebar. Field engineers gain priority access to site photo uploads, milestone checkboxes, and GPS mapping viewports.
- **Mobile (<768px)**: 4-column reflow. Tables transition into structured micro-cards; secondary analytical charts collapse beneath action triggers.

A rigorous 4px baseline rhythm enforces consistent vertical rhythm across tight form groupings, metadata clusters, and tabular ledgers.

## Elevation & Depth

This design system uses **low-contrast outlines** paired with **subtle architectural elevation** rather than deep, floating shadows. This mirrors official engineering blueprints and administrative forms:

- **Level 0 (Canvas Base)**: `#F8FAFC`. Background for application frames, structural scaffolds, and backdrops.
- **Level 1 (Card & Table Surface)**: Pristine `#FFFFFF` resting on `#F8FAFC`, delimited by a sharp `1px solid #E2E8F0` border.
- **Level 2 (Popovers, Tooltips & Dropdowns)**: `#FFFFFF` surface with `1px solid #CBD5E1` and a disciplined shadow: `0 4px 6px -1px rgba(15, 41, 66, 0.08), 0 2px 4px -2px rgba(15, 41, 66, 0.04)`.
- **Level 3 (Modals & Urgent Audit Dialogs)**: `#FFFFFF` with `1px solid #94A3B8` border and focused backdrop: `0 20px 25px -5px rgba(15, 41, 66, 0.16), 0 8px 10px -6px rgba(15, 41, 66, 0.08)`, backed by an authoritative navy dimming veil (`rgba(15, 41, 66, 0.60)`).

## Shapes

The design uses a compact **Soft (`roundedness: 1`)** shape vocabulary (0.25rem / 4px base radius):

- **Buttons, Inputs & Badges**: 4px (`rounded-sm` / 0.25rem) corner radius. Conveys functional precision, structural rigidity, and compact compactness.
- **Containers, Modals & Inspection Cards**: 8px (`rounded-lg` / 0.5rem) corner radius. Delivers subtle modern refinement without sacrificing tabular screen real estate.
- **Pill Exceptions**: Reserved strictly for high-visibility real-time status chips (e.g., "กำลังดำเนินการ" / In Progress, "ส่งมอบงาน" / Completed) using a fully rounded perimeter to contrast with rectilinear engineering cards.

## Components

### Buttons
- **Primary Civic Action**: Navy background (`#1E3A8A`), white text, 4px corner radius, dense vertical padding (8px × 16px). Hover: `#172554`. Focus: 2px outline in `#EA580C` with 2px offset.
- **Field Engineering Action**: Safety Amber background (`#EA580C`), white text, bold weight. Used for field photo captures, site approval sign-offs, and critical dispatches.
- **Secondary & Ghost**: White background, `1px solid #CBD5E1`, text `#0F2942`. Hover: `#F1F5F9`.

### Data Tables (Engineering BOQ & Project Ledgers)
- Header row uses `#F1F5F9` background, `11px` uppercase slate text, `1px solid #CBD5E1` bottom rule.
- Row heights are compact (40px default, 32px dense mode) with alternate row striping (`#FFFFFF` to `#F8FAFC`). Monospace tabular layout for all budget columns.

### Status Indicators & Chips
- **On Schedule**: Green tinted badge (`#ECFDF5` background, `#047857` text, `1px solid #A7F3D0` border).
- **Inspection Pending**: Amber tinted badge (`#FFFBEB` background, `#B45309` text, `1px solid #FDE68A` border).
- **Critical Delay**: Red tinted badge (`#FEF2F2` background, `#B91C1C` text, `1px solid #FECACA` border).

### Input Fields & Search Bars
- Background `#FFFFFF`, border `1px solid #CBD5E1`, height 36px, typography `14px sourceSans3`.
- Active focus state: `border-color: #1E3A8A; box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.15)`.

### Cards & Project Overview Containers
- White surfaces with `1px solid #E2E8F0` borders and 8px border radius.
- Header bands incorporate a left 4px accent strip (Deep Navy for Administrative oversight, Safety Amber for Active Field Sites).