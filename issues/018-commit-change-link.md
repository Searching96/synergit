---
id: "018"
title: "Implement CommitChangeLink Component"
priority: "medium"
status: "closed"
component: "frontend"
labels: ["feature", "ui", "refactor"]
assignee: "antigravity"
created_at: 2026-06-16
closed_at: 2026-06-16
related_issues: []
---

# Implement CommitChangeLink Component

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Create a reusable `CommitChangeLink` component that navigates users to a specific commit's detail page. It must accept flexible inputs (`text` and `tooltipText` props) to render varying content, such as a shortened hash or a full commit message.

## Context
Currently, commit links are scattered across the File Browser, Commit History, and Pull Request pages. As we expand the UI, we will need the ability to use full commit messages as clickable links instead of just shortened hashes. Abstracting this into a single, format-agnostic component ensures design consistency, while extracting the hash-shortening logic to a global utility keeps the presentation layer clean and adaptable.

## Acceptance Criteria
- [x] Create a `shortenHash` utility function in `src/utils/stringUtils.ts`.
- [x] Implement the `CommitChangeLink` component accepting `hash`, `text`, `tooltipText`, and `className` props.
- [x] Ensure the component only focuses on rendering a link to the commit detail view.
- [x] Replace all inline commit link implementations across the frontend with the new `CommitChangeLink` component.

## Implementation Notes
- Extracted `shortenHash` to `frontend/src/utils/stringUtils.ts`.
- Implemented `CommitChangeLink` in `frontend/src/components/shared/CommitChangeLink.tsx`.
- Refactored `FileExplorer.tsx`, `CommitHistory.tsx`, `RepoTreeBrowserPage.tsx`, `PullRequestDetailPage.tsx`, and `PullRequestComparePage.tsx` to use the new component and global utility.
