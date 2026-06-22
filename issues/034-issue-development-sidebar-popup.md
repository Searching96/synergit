---
id: 34
title: "Issue Development Sidebar Popup"
status: "closed"
priority: "medium"
difficulty: "medium"
component: "Fullstack"
labels: ["feature", "issues", "ui", "api"]
created_at: "2026-06-22T04:16:00Z"
closed_at: "2026-06-22T04:17:00Z"
---

# Issue Development Sidebar Popup

## Description
Implement the "Development" popup sidebar item for the Issue Detail page. This popup allows users to link branches and pull requests to an issue. When an item is selected/linked, it should be moved to a "Group selected" section.

## Acceptance Criteria
- [x] Create backend APIs and usecases for linking branches to issues.
- [x] Update frontend `issues.ts` API client with branch and PR linking methods.
- [x] Implement `IssueDevelopmentSidebarItem.tsx`.
- [x] Display linked PRs and branches under "Group selected" and others under "Suggestions".
- [x] Integrate component into the Issue Detail Page.

## Implementation Notes
- Created `issue_linked_branches` table and the necessary repository and usecase methods.
- Added API routes for managing branch links and listing linked PRs.
- Built a UI component that mirrors the PR sidebar but splits items into two separate sections based on selection state.
