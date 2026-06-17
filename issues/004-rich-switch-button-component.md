---
id: "004"
title: "Create Rich Switch Button Component"
priority: "low"
difficulty: "low"
status: "in-progress"
component: "frontend"
labels: ["feature", "ui"]
assignee: "antigravity"
created_at: 2026-06-13
closed_at: null
closed_at: 2026-06-13
related_issues: []
---

# Create Rich Switch Button Component

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Implement a `RichSwitchButton` component that replicates the GitHub Primer ToggleSwitch. It includes "On/Off" text labels, and a switch with a sliding knob and inline SVG icons (Line for On, Circle for Off). The button must accurately reflect the visual styling of Primer (e.g., transparent/white background with border when Off, blue background when On).

## Context
The "Add README" toggle in the Create Repository page uses a generic HTML structure. The user requested to replace it with a reusable `RichSwitchButton` that looks and feels exactly like the native Primer design.

## Acceptance Criteria
- [x] Create `RichSwitchButton` component in `frontend/src/components/shared/`
- [x] Replace the existing toggle in `CreateRepositoryPage.tsx`
- [x] Match the exact visual style of Primer (track background, border, knob style, icon colors)

## Implementation Notes
- Initial implementation was incorrect (used solid grey background for 'Off' state instead of transparent/bordered). Needs to be updated to match the correct CSS.
- Successfully applied Primer styles, adjusting dimensions to 32px height and utilizing exact HTML structure requested by the user. Color scheme properly tied to CSS variables.
