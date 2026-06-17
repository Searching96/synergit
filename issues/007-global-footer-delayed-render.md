---
id: 007
title: "Global Footer with Delayed Render"
status: "closed"
priority: "low"
difficulty: "low"
labels: ["feature", "ui", "ux"]
assignee: "antigravity"
created_at: 2026-06-14
closed_at: 2026-06-14
related_issues: []
---

# Global Footer with Delayed Render

The application lacks a standard footer. A fixed GitHub-like footer should be added to the overall layout.
However, to prevent UI jumping or flickering when the content of a page is still loading asynchronously, the footer must only render at the exact moment the content finishes rendering.

## Acceptance Criteria
- [x] Create a `Footer` component containing the required links (Terms, Privacy, Security, Status, Docs, Contact, Manage cookies, Do not share info).
- [x] Implement a `PageReadyContext` generic mechanism to delay visibility.
- [x] Update `App.tsx` layout to include the Footer.
- [x] Wire up main route pages to signal readiness.

## Implementation Notes
- Created `Footer.tsx` using a single flex list container to ensure equal spacing between all sub-elements including the GitHub logo and Copyright text.
- Integrated `PageReadyContext` to control footer visibility, preventing UI jumping during asynchronous data loading.
- Verified that all route pages properly call `setPageReady(true)` when their content has finished rendering.
