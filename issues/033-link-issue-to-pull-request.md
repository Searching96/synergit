---
id: "033"
title: "Link Issue to Pull Request Feature"
status: "closed"
priority: "high"
difficulty: "medium"
component: "Fullstack"
labels:
  - "feature"
  - "pull-requests"
  - "issues"
  - "ui"
created_at: "2026-06-21T22:45:00Z"
closed_at: "2026-06-21T22:45:00Z"
---

# Link Issue to Pull Request Feature

## Description
This issue encompasses the full implementation of linking Issues to Pull Requests in Synergit, providing a cohesive flow similar to GitHub. It includes frontend rendering of the links on both the PR and Issue timelines, proper URL resolution, UI alignment fixes, and the backend automation that closes linked issues when a PR is merged.

## Acceptance Criteria
- [x] Fix the URL routing logic so that clicking a linked issue in the PR Development sidebar navigates correctly to its URL (e.g., `/issues/1` instead of `/issues/0`).
- [x] Ensure that timelines for "Linked PR" and "Removed Link PR" in `IssueDetailPage.tsx` and `PullRequestDetailPage.tsx` are correctly styled.
- [x] Align the gap between avatar and text consistently (`gap-1.5`) across all timeline events.
- [x] Update the icons for linking/unlinking events to use the correct GitHub Octicon (`OcticonCrossReference`) instead of Lucide icons or `OcticonBookmark`.
- [x] Backend logic: When `PullRequestService.MergePullRequest` executes successfully, query all issues linked to the merged PR.
- [x] Backend logic: For each linked issue that is NOT already "Closed as Completed", update its status to `Closed` and reason to `Completed`.
- [x] Backend logic: Add an issue event `closed_completed` to represent the status transition on merge.
- [x] Backend logic: Ensure no duplicated events are generated if the issue was already closed as completed.

## Implementation Details
- **Frontend**: Fixed `issueNumberMap` prop handling in `DevelopmentSidebarItem.tsx` so the issue's sequence number correctly resolves instead of defaulting to `0`. Replaced `gap-2` with `gap-1.5` for consistency across `PullRequestDetailPage.tsx` and `IssueDetailPage.tsx`. Replaced `GitPullRequest` (Lucide) and `OcticonBookmark` with `OcticonCrossReference` to accurately mirror GitHub's cross-reference styling. 
- **Backend**: Updated `backend/internal/core/usecase/pull_request_usecase.go` within `MergePullRequest` to list all linked issues. Added logic to conditionally update their statuses via `issueStore.UpdateStatus`, accompanied by a `closed_completed` event logged via `issueStore.AddEvent`, skipping any that are already marked "Closed as Completed".
