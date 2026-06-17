---
id: "019"
title: "Create Reusable Tooltip Component"
priority: "low"
difficulty: "low"
status: "closed"
component: "frontend"
labels: ["feature", "ui"]
assignee: "antigravity"
created_at: 2026-06-16
closed_at: 2026-06-16
related_issues: []
---

# Create Reusable Tooltip Component

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Implement a generic, reusable `Tooltip` component that wraps around any valid React element. The tooltip should appear on hover or focus and use `@floating-ui/react` to ensure it stays within the viewport. The styling must be aligned with a dark theme (background `#25292E`, white text, rounded corners).

## Context
Currently, the application relies on native browser tooltips (`title` attribute) or specific implementations like `TooltipButton`. The native tooltips are slow to appear and cannot be styled. A reusable generic `Tooltip` component ensures a consistent, custom UI experience across the entire repository.

## Acceptance Criteria
- [x] Create `Tooltip.tsx` in `frontend/src/components/shared/`.
- [x] Use `@floating-ui/react` for positioning and interactions.
- [x] Apply a dark layout styling (`bg-[#25292E]`).
- [x] Replace the native `title` attribute in `CommitChangeLink` with the new `Tooltip` component.

## Implementation Notes
- Created `Tooltip` component that wraps any children element safely using `cloneElement`.
- Updated `CommitChangeLink` to conditionally render the new `Tooltip` if `tooltipText` is provided.
