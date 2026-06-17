---
id: 006
title: "Global Sidebar Menu Fix"
status: "closed"
priority: "medium"
difficulty: "medium"
labels: ["bug", "ui", "refactoring"]
assignee: "antigravity"
created_at: 2026-06-14
closed_at: 2026-06-14
related_issues: []
---

# Global Sidebar Menu Fix

The hamburger menu button on the `TopHeader` component was inconsistently implemented across the application. In some views like `CreateRepositoryPage`, clicking it navigated the user back to the overview dashboard. In `ProfilePage`, it triggered a duplicate inline sidebar component. 

The correct behavior should be opening the global sidebar menu without navigating away, across all views.

## Acceptance Criteria
- [x] Lift `SidebarMenu` to the top layout of `App.tsx` so it wraps all view modes.
- [x] Update `CreateRepositoryPage.tsx` to accept `onMenuClick` and pass it to `TopHeader`, removing the back navigation logic.
- [x] Remove the inline duplicate sidebar from `ProfilePage.tsx` and pass `onMenuClick` to `TopHeader`.
- [x] Ensure `App.tsx` passes `onMenuClick={() => setIsSidebarMenuOpen(true)}` globally.

## Implementation Notes
- Restructured `App.tsx` to use a `renderContent()` wrapper, with `SidebarMenu` rendered at the root level alongside it.
- `CreateRepositoryPageProps` and `GithubProfilePagesProps` now properly accept `onMenuClick`.
