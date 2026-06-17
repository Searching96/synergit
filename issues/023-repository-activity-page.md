---
id: "023"
title: "Repository Activity Page"
priority: "medium"
status: "closed"
component: "fullstack"
labels: ["feature", "ui", "database", "git"]
assignee: "antigravity"
created_at: 2026-06-16
closed_at: 2026-06-17
related_issues: []
---

# Repository Activity Page

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
Currently, the repository activity is not fully tracked or displayed. Users want an "Activity" page similar to GitHub's that shows recent git operations such as direct pushes, pull request merges, branch creations, and branch deletions.

This task requires creating a `repo_events` backend tracking mechanism and a frontend UI for filtering and viewing these activities chronologically.

## Acceptance Criteria
- [x] Create `repo_events` table in PostgreSQL.
- [x] Track Git pushes, branch creations/deletions during `git receive-pack`.
- [x] Track PR merges and Web UI commits.
- [x] Build Frontend `ActivityPage` component.
- [x] Add filtering dropdown (Direct pushes, PR merges, Branch creations/deletions, etc.).
- [x] Ensure accurate chronological sorting.

## Implementation Notes
- Created `repo_events` table and the respective repository/usecase layers.
- Integrated `repo_events` into Git push `ReceivePack`, PR merge, and Web UI commit operations.
- Added `/api/v1/repos/:repo_id/events` endpoint.
- Built `ActivityPage` component in frontend with event filtering.
- Re-architected `FileExplorer` into `RepoRootPage` and `RepoFileTreeBrowserPage` to follow GitHub's exact rendering layout and provide the "Activity" link.
