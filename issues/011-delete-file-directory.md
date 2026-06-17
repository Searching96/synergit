---
id: "011"
title: "Implement Delete File / Directory Action"
priority: "low"
difficulty: "low"
status: "closed"
component: "fullstack"
labels: ["feature", "git", "api"]
assignee: "antigravity"
created_at: 2026-06-14
closed_at: 2026-06-14
related_issues: []
---

# Implement Delete File / Directory Action

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
The UI currently has a "Delete file" and "Delete directory" button in the file explorer's 3-dot menu. However, clicking them only closes the menu and does nothing. We need to implement the backend API endpoint to delete a file or directory via a Git commit, and hook up the frontend buttons to trigger this API.

## Context
Users must be able to delete files and folders directly from the web interface without cloning the repository.

## Acceptance Criteria
- [x] Backend provides a `DELETE /api/v1/repos/:repo_id/contents` or similar endpoint.
- [x] `GitManager` interface supports removing files/directories from the tree and creating a commit.
- [x] Frontend delete buttons trigger the API, and upon success, refresh the file list.
- [x] Added a confirmation modal before deleting.

## Implementation Notes
- Implemented `CommitModal` to handle generic commit messages and branch selections.
- Created a dedicated `DeletePath` API (`DELETE /api/v1/repos/:repo_id/contents`) and Git port method to handle both file and directory deletions efficiently.
- Connected the frontend's 3-dot menu "Delete" buttons to trigger the `DeletePath` API with the new modal.
