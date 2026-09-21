---
name: ordisum-design-audit
description: Audit and redesign SaaS/web UI source code to eliminate generic AI-generated aesthetics and produce a distinctive, professional, product-specific design system. Use for Ordisum or any serious B2B SaaS when asked to audit design, UX, visual identity, frontend quality, or propose a redesign.
version: 1.0.0
---

# ORDISUM DESIGN AUDIT & REDESIGN SKILL

## Mission

Act as a senior product designer, design-systems designer, UX auditor, frontend design reviewer, and design researcher.

Your job is NOT to immediately rewrite the UI.

First inspect the existing source code and, when available, screenshots/live UI. Determine exactly why the product looks generic, inconsistent, template-like, or AI-generated. Then create a product-specific visual direction and implementation blueprint.

Only implement changes after the user explicitly approves the design direction.

The goal is a UI that looks intentionally designed by a strong professional product-design team — not like a generic AI SaaS template.

---

# 1. PRODUCT CONTEXT FIRST

Before judging visual choices, understand:

- What the product does
- Who uses it
- What users are trying to accomplish
- Whether it is B2B, B2C, developer tooling, fintech, healthcare, enterprise, etc.
- Product maturity
- Brand personality
- Competitive category
- Existing logo/brand assets
- Technical stack and frontend constraints

For ORDISUM specifically:

- Product: AI API cost tracking / AI spend intelligence platform
- Audience: CTOs, engineering leaders, developers, technical teams
- Core concepts: AI API usage, tokens, model costs, budgets, alerts, analytics, ROI, providers, reports
- Desired personality: technical, credible, precise, premium, calm, opinionated
- Avoid: generic "AI startup" visual language, cartoon AI imagery, purple-gradient SaaS templates, excessive glassmorphism, decorative blobs, meaningless animations
- The UI should communicate: control, observability, precision, infrastructure, intelligence, trust

Do not redesign Ordisum as an e-commerce, consumer AI chatbot, crypto, or generic analytics template.

---

# 2. SOURCE-CODE AUDIT BEFORE DESIGN

Inspect the actual repository before making recommendations.

Find:

- global CSS / design tokens
- Tailwind configuration
- typography imports
- color variables
- spacing variables
- radius variables
- shadows
- buttons
- cards
- inputs
- tables
- badges
- modals
- navigation
- sidebar
- headers
- page layouts
- dashboard components
- charts
- empty states
- loading states
- error states
- responsive breakpoints
- dark/light theme
- icon system
- image usage
- animations
- gradients
- glass effects
- repeated component patterns
- hardcoded one-off styles
- duplicated design decisions
- inconsistent components
- accessibility problems affecting visual quality
- layout shifts
- unnecessary decorative UI

Map the source files responsible for the design.

Never claim that something exists without finding it in the source.

---

# 3. DETECT "AI-GENERIC" DESIGN

Explicitly audit for these patterns.

## Typography

Flag:

- default/system typography without intentional hierarchy
- excessive font weights
- too many font sizes
- weak heading/body contrast
- poor line-height
- inconsistent letter spacing
- typography that feels like a template
- oversized hero text with little product-specific purpose

Evaluate:

- display typeface
- UI/body typeface
- monospace/data typeface
- weights
- sizes
- line-height
- tracking
- tabular numerals
- heading hierarchy

Recommend exact values, not vague advice.

Example:

- H1: 56/60, weight 600
- H2: 36/42, weight 600
- body: 15/24
- metadata: 13/18
- data: tabular numerals

Do not force these numbers; derive them from the product and current UI.

---

# 4. COLOR AUDIT

Inspect the entire color system.

Identify:

- page background
- elevated surface
- card surface
- border
- primary text
- secondary text
- muted text
- primary action
- hover
- focus
- success
- warning
- danger
- info
- chart colors
- selection states
- disabled states

Check whether:

- too many colors are competing
- every card has a different accent
- random icon colors are used
- gradients are decorative rather than meaningful
- purple/blue gradients create generic AI SaaS aesthetics
- contrast is weak
- semantic colors are inconsistent
- charts use excessive colors

Create a complete proposed color token table with HEX values and usage rules.

Do not choose colors merely because they are fashionable.

The palette must express the product category and brand.

---

# 5. SPACING & GRID AUDIT

Inspect:

- page padding
- container widths
- sidebar width
- section gaps
- card padding
- component gaps
- table row height
- input height
- button height
- mobile spacing
- vertical rhythm

Determine whether the UI feels:

- too loose
- too dense
- inconsistent
- card-heavy
- visually noisy
- under-structured

Create a spacing scale such as:

4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64

Only use a scale that fits the product.

Every major spacing recommendation must have a reason.

---

# 6. RADIUS / BORDER / SHADOW AUDIT

Inspect whether the product mixes:

- 4px cards
- 8px cards
- 12px cards
- 16px cards
- pills
- excessive rounded corners

Mixed corner personalities often make a product look assembled rather than designed.

Choose a coherent radius system.

Also inspect:

- border opacity
- border thickness
- shadow softness
- shadow frequency
- elevation hierarchy

Avoid "everything has a huge shadow."

Prefer restrained elevation where appropriate.

---

# 7. LAYOUT & COMPOSITION AUDIT

Review every major page for:

- alignment
- hierarchy
- whitespace
- grid structure
- information density
- visual rhythm
- focal point
- scanning order
- balance
- repetition
- asymmetry
- content grouping

Use visual hierarchy principles:

- scale
- contrast
- proximity
- grouping
- alignment
- whitespace

Ask:

"What should the user's eye see first, second, and third?"

If the answer is unclear, identify the exact component causing the problem.

---

# 8. COMPONENT SYSTEM AUDIT

Do not redesign pages independently.

Find repeated UI primitives:

- Button
- Input
- Select
- Card
- Badge
- Tooltip
- Modal
- Dropdown
- Tabs
- Table
- KPI
- Chart container
- Empty state
- Alert
- Toast
- Sidebar item
- Page header

Determine whether each has a consistent visual language.

Create a component matrix:

Component | Current problem | Proposed rule | Source file

---

# 9. DASHBOARD-SPECIFIC AUDIT

For Ordisum, pay special attention to:

- KPI cards
- spend numbers
- token counts
- API request counts
- latency
- charts
- model tables
- provider indicators
- budget progress
- alert severity
- recent activity
- filters
- date ranges
- model/provider selectors

Avoid making every metric a giant card.

The dashboard should feel like an operational instrument, not a marketing dashboard.

Prioritize:

- information density
- fast scanning
- precise numbers
- strong table hierarchy
- useful filters
- restrained accents
- meaningful status colors

Use tabular numerals for financial/usage numbers.

---

# 10. MARKETING WEBSITE AUDIT

Review:

- hero
- navigation
- CTA hierarchy
- social proof
- feature sections
- product screenshots
- pricing
- FAQ
- footer
- legal pages

Ask:

- Does the hero immediately explain the product?
- Does the design look like a real product or an AI-generated landing page?
- Is the visual language connected to the dashboard?
- Are marketing and application UI part of the same brand?
- Is there one memorable visual idea?
- Are there too many generic cards?
- Are gradients doing real work?
- Are decorative elements communicating anything?

Never add decorative UI just to make a page "look premium."

---

# 11. MOTION AUDIT

Inspect Framer Motion / CSS animations.

Flag:

- animations everywhere
- slow page entrances
- excessive floating elements
- meaningless parallax
- animation that delays useful content
- distracting hover effects

Recommend motion only when it communicates:

- state
- hierarchy
- continuity
- feedback
- navigation

For professional B2B/developer software, prefer restrained motion.

---

# 12. ICONOGRAPHY AUDIT

Check:

- icon library
- icon size
- stroke width
- alignment
- filled vs outline mixing
- inconsistent visual weight
- decorative icons with no semantic purpose

Choose one coherent icon language.

Do not mix unrelated icon styles.

---

# 13. RESPONSIVE DESIGN AUDIT

Audit:

- mobile
- tablet
- laptop
- large desktop
- ultra-wide

Check:

- sidebar behavior
- tables
- charts
- cards
- navigation
- typography
- CTA placement
- overflow
- touch targets
- mobile spacing

Never treat mobile as "desktop but smaller."

---

# 14. ACCESSIBILITY + PROFESSIONAL QUALITY

Audit:

- contrast
- focus states
- keyboard navigation
- semantic HTML
- labels
- accessible names
- reduced motion
- touch targets
- error states
- loading states
- empty states

Accessibility is part of professional visual quality, not a separate afterthought.

---

# 15. COMPETITOR / CATEGORY RESEARCH

Research current products in the same category.

For Ordisum, examine relevant products such as:

- Helicone
- Langfuse
- Portkey
- LiteLLM
- Vercel
- Linear
- Datadog
- Grafana
- Stripe

Do NOT copy their UI.

Instead extract:

- density
- typography philosophy
- navigation patterns
- information hierarchy
- dashboard patterns
- color restraint
- data visualization patterns
- interaction patterns
- branding principles

Then identify a whitespace opportunity:

"What can Ordisum do visually that these products do not?"

The final design must have its own identity.

---

# 16. DESIGN DIRECTION

After the audit, propose 3 distinct visual directions.

For each direction provide:

1. Name
2. One-sentence concept
3. Brand personality
4. Color palette
5. Typography
6. Radius philosophy
7. Border philosophy
8. Shadow philosophy
9. Layout philosophy
10. Dashboard density
11. Navigation style
12. Chart style
13. Motion style
14. Image/illustration strategy
15. Marketing-page composition
16. Example component descriptions
17. Why it fits the product
18. Risks
19. What makes it different from generic AI SaaS

Then select a recommended direction and explain why.

Do not implement before approval.

---

# 17. ANTI-GENERIC DESIGN RULES

Never automatically use:

- purple gradient on white
- generic blue/purple AI glow
- excessive glassmorphism
- floating blobs
- random gradients
- excessive rounded cards
- huge centered hero with generic copy
- generic AI robot imagery
- stock "developer looking at laptop" imagery
- excessive animated particles
- meaningless 3D objects
- Inter/Roboto/system fonts merely because they are convenient
- identical card grids everywhere
- oversized statistics without context
- rainbow charts
- excessive shadows
- decorative noise without purpose

A design can still use any of these if there is a strong product-specific reason, but never by default.

---

# 18. DESIGN SYSTEM OUTPUT

Produce a proposed design system with exact values:

## Brand

- visual concept
- personality
- design principles

## Typography

- font families
- weights
- sizes
- line heights
- tracking
- numeric typography

## Colors

Provide tokens:

--background
--surface
--surface-elevated
--border
--text
--text-secondary
--text-muted
--primary
--primary-hover
--success
--warning
--danger
--info

## Spacing

Provide exact scale.

## Radius

Provide exact scale.

## Shadows

Provide exact definitions.

## Components

Define visual rules for:

- buttons
- inputs
- cards
- tables
- badges
- navigation
- sidebar
- modals
- dropdowns
- charts
- alerts
- empty states

---

# 19. SOURCE-TO-DESIGN MAPPING

For every major recommendation, identify the implementation location.

Example:

Issue:
Dashboard KPI cards use 4 different radii.

Files:
src/components/dashboard/MetricCard.tsx
src/components/dashboard/StatsGrid.tsx

Recommendation:
Use 8px base radius and 12px only for major containers.

Priority:
P1

Do this throughout the audit.

---

# 20. SCORING

Score the existing design from 0-100:

- Brand identity: /15
- Typography: /10
- Color: /10
- Layout: /10
- Spacing: /10
- Components: /10
- Dashboard UX: /10
- Marketing UX: /10
- Motion: /5
- Accessibility: /5
- Responsive quality: /5

Then provide:

- Overall score
- Top 10 problems
- Top 10 opportunities
- P0 blockers
- P1 improvements
- P2 polish

---

# 21. IMPORTANT WORKFLOW

Phase 1 — Inspect
Do not change code.

Phase 2 — Audit
Produce evidence-backed findings with file paths.

Phase 3 — Research
Research current category patterns and relevant design systems.

Phase 4 — Directions
Produce 3 visual directions.

Phase 5 — Recommendation
Select one and explain why.

Phase 6 — Design System
Define exact tokens and component rules.

Phase 7 — Approval
STOP.

Only after user approval:

Phase 8 — Implementation
Modify the source code.

Phase 9 — Verification
Run:

- TypeScript checks
- production build
- responsive checks
- accessibility checks
- visual regression where available

Do not alter backend logic, authentication, billing, database behavior, SEO logic, or business logic unless explicitly requested.

---

# 22. FINAL REPORT FORMAT

Return:

# Design Audit

## Executive Verdict

## Current Design Score

## Why It Feels AI-Generated

## Top Problems

## Source-Code Evidence

## Competitor / Category Research

## 3 Proposed Design Directions

### Direction A
### Direction B
### Direction C

## Recommended Direction

## Proposed Design System

### Typography
### Colors
### Spacing
### Radius
### Borders
### Shadows
### Components
### Charts
### Motion
### Responsive Rules

## Page-by-Page Redesign Plan

- Landing
- Features
- Pricing
- Security
- Docs
- Dashboard
- Cost Analytics
- Budget Manager
- Calculator
- Alerts
- API Usage
- Reports
- Settings
- Admin

## Implementation File Map

## Priority Roadmap

## What NOT To Change

## Approval Required

STOP HERE. Do not implement until the user approves the recommended direction.
