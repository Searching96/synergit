---
id: "035"
title: "Issue Blocking Relationships"
priority: "medium"
difficulty: "medium"
status: "closed"
component: "fullstack"
labels: ["feature", "issues", "relationships", "api", "ui"]
assignee: "codex"
created_at: 2026-06-22
closed_at: 2026-06-22
related_issues: ["034"]
---

# Issue Blocking Relationships

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
Implement persistent issue relationships for `Blocked by` and `Is blocking`.

## Context
The Issue Detail sidebar currently has relationship picker UI, but selections are not persisted. Synergit should store these relationships, render them after reload, prevent circular blocking graphs, and stop users from closing an issue as completed while it is still blocked by open issues.

## Acceptance Criteria
- [x] `Blocked by` and `Is blocking` relationships persist through backend APIs.
- [x] Relationship picker checkboxes immediately link or unlink the selected issue.
- [x] Relationship badges count selected issues with `OPEN` status in each group.
- [x] Creating direct or indirect circular blocking references is rejected.
- [x] Closing an issue as completed is blocked when any `Blocked by` issue is still open.
- [x] Closing as not planned, closing as duplicate, and reopening are not blocked by open blockers.
- [x] Frontend build and backend tests pass.

## Implementation Notes
Backend relationships logic implemented in `IssueService` with circular dependency validation.
Frontend updated to fetch and post `issuesApi.linkRelationship`. UI updated to show `hasOpenBlockers` and disable close button. All Eslint issues fixed to pass CI build.
