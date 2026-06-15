---
id: "017"
title: "Implement Pagination for Commit History Page"
priority: "high"
status: "closed"
component: "fullstack"
labels: ["performance", "ui", "api"]
assignee: "antigravity"
created_at: 2026-06-15
closed_at: 2026-06-16
related_issues: ["016"]
---

# Implement Pagination for Commit History Page

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
Currently, the Commit History page (`/commits/:branch`) uses the `GetCommits` endpoint to fetch the entire commit history in a single JSON array. For repositories with tens of thousands of commits (e.g., Linux kernel), this will cause massive network bottlenecks, Out-Of-Memory (OOM) crashes on the browser tab, and backend memory exhaustion.

## Context
To prevent crashes and optimize load times, we must implement pagination (`limit` and `offset` or cursor-based) for the `GetCommits` backend API and update the `CommitHistory.tsx` frontend component to load commits in chunks (e.g., 50 at a time) with a "Load More" / "Older" button.

## Acceptance Criteria
- [x] Backend: Update `port.GitManager` and `LocalGitAdapter` to support `limit` and `offset` for commit log traversal.
- [x] Backend: Update the `GetCommits` HTTP handler to parse pagination query parameters and return a paginated response (including `total_commits`).
- [x] Frontend: Update `reposApi.getCommits` to accept pagination parameters.
- [x] Frontend: Update `CommitHistory.tsx` to display an "Older" button to fetch and append the next page of commits.

## Implementation Notes
- Changed the frontend pagination to display `< Previous` and `Next >` buttons at the bottom of the commit list rather than an "Older" button.
- Limit is set to 30 commits per page as per user request.
- The `GetCommits` endpoint now returns a `CommitPage` object containing a `commits` array and a `total_commits` count.
