---
id: "003"
title: "Create Twin Button Reusable Component"
status: "closed"
component: "frontend"
labels: ["feature", "react", "ui"]
assignee: "antigravity"
created_at: "2026-06-13"
closed_at: "2026-06-13"
related_issues: []
---

# Create Twin Button Reusable Component

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Implement a reusable "Twin Button" component in the frontend. It should act as a generic wrapper that accepts two buttons (or any clickable elements) as children. The wrapper should enforce:
- No horizontal gap between the two elements.
- The first element has left-rounded corners (`rounded-l`).
- The second element has right-rounded corners (`rounded-r`).
- Proper border overlapping (`-ml-px`) to prevent double-thick borders between them.

## Context
This component is needed to create unified, grouped actions (like a "Merge" button next to a "Dropdown" arrow) without duplicating complex Tailwind classes every time.

## Acceptance Criteria
- [x] Create `TwinButtonGroup.tsx` in `src/components/shared/`.
- [x] The component must accept generic ReactNode children.
- [x] Ensure proper z-index on hover/focus so borders highlight correctly.
- [x] Export the component for global use.

## Implementation Notes
Component successfully created using Tailwind CSS arbitrary variants. It completely decouples the grouping CSS from the underlying buttons, allowing for highly flexible UI composition.



## Implementation Notes
