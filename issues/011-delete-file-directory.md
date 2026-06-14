---
id: "011"
title: "Implement Delete File / Directory Action"
priority: "low"
status: "open"
component: "fullstack"
labels: ["feature", "git", "api"]
assignee: "antigravity"
created_at: 2026-06-14
closed_at: null
related_issues: []
---

# Implement Delete File / Directory Action

> [!NOTE]
> **Component**: Fullstack | **Status**: Open

## Description
The UI currently has a "Delete file" and "Delete directory" button in the file explorer's 3-dot menu. However, clicking them only closes the menu and does nothing. We need to implement the backend API endpoint to delete a file or directory via a Git commit, and hook up the frontend buttons to trigger this API.

## Context
Users must be able to delete files and folders directly from the web interface without cloning the repository.

## Acceptance Criteria
- [ ] Backend provides a `DELETE /api/v1/repos/:repo_id/contents` or similar endpoint.
- [ ] `GitManager` interface supports removing files/directories from the tree and creating a commit.
- [ ] Frontend delete buttons trigger the API, and upon success, refresh the file list.
- [ ] Added a confirmation modal before deleting.

## Implementation Notes
(To be filled when implemented)
