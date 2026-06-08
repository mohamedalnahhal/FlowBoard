---
name: Modern Enterprise Logic
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#516072'
  on-secondary: '#ffffff'
  secondary-container: '#d2e1f7'
  on-secondary-container: '#556477'
  tertiary: '#4651b9'
  on-tertiary: '#ffffff'
  tertiary-container: '#606ad4'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#2f3aa3'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar-width: 260px
  sidebar-collapsed: 80px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

This design system is built for high-velocity team collaboration where information density and cognitive clarity are paramount. The aesthetic is **Corporate Modern**, leveraging a "Software as a Service" (SaaS) visual language that prioritizes functional elegance.

The personality is professional, precise, and dependable. By utilizing a refined "Tonal Layering" approach, the system organizes complex data into digestible visual chunks. It evokes a sense of "organized flow" through the strategic use of ample whitespace, soft shadows, and a sophisticated indigo-led palette. The experience should feel like a premium productivity tool: crisp, responsive, and intentionally structured.

## Colors

The color strategy uses a vibrant indigo primary to draw attention to interactive elements and brand identifiers. 

- **Primary Canvas:** The background utilizes a very soft grey (`#f8fafc`) to reduce eye strain and provide a subtle contrast against white card surfaces.
- **Typography:** The primary text color is a deep Slate (`#1e293b`) for maximum legibility, while metadata and secondary labels use a lighter grey-blue (`#64748b`).
- **Semantic Logic:** Status indicators use high-saturation tints for icons/text and low-opacity backgrounds (10-15%) of the same hue to create recognizable status badges without overwhelming the layout.

## Typography

This design system utilizes **Inter** exclusively to maintain a clean, systematic feel across all data types. 

The hierarchy is built on a tight scale. **Display** and **Headline** levels use a slightly tighter letter-spacing and heavier weights to create distinct section anchors. **Body** text is optimized for readability with a generous line height. **Label** styles are used for navigation items, tags, and table headers, often utilizing medium or semi-bold weights to distinguish them from standard prose.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains at a fixed width (260px) or collapsed state (80px), while the main content area utilizes a fluid grid that expands up to a maximum container width of 1440px.

- **Grid:** A 12-column grid is used for the main dashboard views.
- **Rhythm:** An 8pt spacing system governs the vertical and horizontal rhythm. 
- **Margins:** Main page margins are set to 32px (xl) on desktop to create a feeling of openness, reducing to 16px (md) on mobile devices.
- **Breakpoints:**
  - Mobile: < 768px (Sidebar hidden, accessible via hamburger)
  - Tablet: 768px - 1024px (Sidebar collapsed by default)
  - Desktop: > 1024px (Full layout)

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Ambient Shadows**.

1.  **Level 0 (Background):** The system background (`#f8fafc`) serves as the base layer.
2.  **Level 1 (Cards & Sidebar):** Primary interaction containers use a pure white background with a subtle, highly diffused shadow (Y: 2px, Blur: 4px, Color: 0.05 opacity black) and a 1px border of `#e2e8f0`.
3.  **Level 2 (Active States/Modals):** Elements requiring immediate attention or floating over content (like dropdowns) use a more pronounced shadow (Y: 10px, Blur: 20px, Color: 0.1 opacity black) to provide clear depth.

The sidebar uses a light grey right-border instead of a shadow to maintain a clean vertical split from the main content.

## Shapes

The shape language is consistently "Rounded."

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) radius to feel modern and approachable without being overly playful.
- **Large Containers:** Board columns and main dashboard panels may scale up to a 1rem (16px) radius to emphasize their role as primary content buckets.
- **Badges:** Status labels use a full "pill" radius (999px) to clearly distinguish them from interactive buttons or input fields.

## Components

### Buttons
- **Primary:** Solid indigo (`#6366f1`) with white text. 8px corner radius. Subtle hover state: darken primary color.
- **Secondary:** White background with a 1px Slate-200 border and Slate-700 text.
- **Ghost:** No background/border, indigo text. Used for tertiary actions like "Cancel" or "View All."

### Sidebar
- **Nav Items:** 12px horizontal padding. Icons are 20px. Active state features a soft indigo tint background and a 3px vertical "indicator" on the far left.
- **Collapsible Logic:** In collapsed state, only icons are visible; labels appear on hover tooltips.

### Cards (Task/Board)
- **Structure:** 16px internal padding. Title in `title-lg`, metadata in `label-sm`.
- **Interaction:** Cards have a subtle 2px lift transition on hover.

### Inputs & Form Builder
- **Outlined Style:** 1px border (`#e2e8f0`). Focused state uses a 2px indigo ring with 20% opacity.
- **Labels:** Positioned above the field in `label-md` weight.

### Status Badges
- Pill-shaped. Background is 10% opacity of the semantic color (Success/Warning/Error), text is 100% opacity of the same color, darkened by 20% for contrast.