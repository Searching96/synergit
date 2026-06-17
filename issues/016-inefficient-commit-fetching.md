---
id: "016"
title: "Inefficient Commit Fetching for Header"
priority: "medium"
difficulty: "medium"
status: "closed"
component: "fullstack"
labels: ["performance", "api", "tech-debt"]
assignee: "Antigravity"
created_at: 2026-06-15
closed_at: 2026-06-15
related_issues: []
---

# Inefficient Commit Fetching for Header

> [!NOTE]
> **Component**: Fullstack | **Status**: Open

## Description
The `commits?branch=master` endpoint retrieves ALL commits for a given branch without any pagination or payload limits. The frontend currently uses this endpoint merely to display the latest commit message and the total commit count in the file browser header. 

## Context
Fetching the entire list of commits (which could be tens of thousands of records) across the network just to obtain a single commit object and a simple integer count causes a severe breach in efficiency and bandwidth consumption. We need a way to obtain this metadata without downloading the complete historical commit array.

## Acceptance Criteria
- [ ] Add a new endpoint or update an existing one (e.g., `GetCommitStats`) to fetch exactly what the file browser header needs: `latest_commit` details and `total_commits` count.
- [ ] Ensure this new mechanism does not transmit the entire commit history array.
- [ ] Update the frontend `RepoTreeBrowserPage.tsx` to utilize this new optimized API instead of pulling the whole commit list.

## Implementation Notes
- Added `GetCommitStats` API which uses `go-git` iterator internally with efficient `countDirectoryCommits` and `countCommits` functions to prevent loading the full history into memory.
- Updated both `RepoTreeBrowserPage.tsx` and `FileExplorer.tsx` on the frontend to pull lightweight stats for the File Browser Header.
