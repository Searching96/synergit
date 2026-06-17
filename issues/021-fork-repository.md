---
id: "021"
title: "Implement Repository Fork Feature"
priority: "medium"
difficulty: "medium"
status: "closed"
component: "fullstack"
labels: ["feature", "ui", "api", "git"]
assignee: "antigravity"
created_at: 2026-06-16
closed_at: 2026-06-16
related_issues: []
---

# Implement Repository Fork Feature

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
Allow users to fork a repository. A fork is a copy of a repository that allows users to freely experiment with changes without affecting the original project. The user will be able to customize the name and description of the fork and choose whether to copy only the default branch or all branches.

## Context
Forking is a core feature for collaborative development in SCM platforms. It allows contributors to work on their own copy of a repository and later submit Pull Requests back to the upstream repository.

## Acceptance Criteria
- [x] Add `parent_id` or similar fork reference to the `repositories` table in the database schema.
- [x] Add a "Fork" button next to "Watch" and "Star" buttons in the repository header.
- [x] The "Fork" button should be disabled if the current user is the owner of the repository.
- [x] Clicking "Fork" redirects the user to `/:owner/:repo/fork`.
- [x] The Fork page includes fields to set:
  - Repository Name (defaults to the upstream repo name)
  - Description (defaults to the upstream description)
  - A checkbox for "Copy the `main` branch only" (where `main` is the default branch).
- [x] Clicking "Create fork" creates a new repository under the current user's namespace.
- [x] The Git bare repository is cloned or duplicated accordingly.
- [x] The user is redirected to the newly created fork.
- [x] The newly created fork displays "forked from <upstream-owner>/<upstream-repo>" under its name.

## Implementation Notes
- Added `parent_id` to `domain.Repo` and `repositories` database schema.
- Implemented `ForkRepository` use case that creates a new repository entry and delegates the Git cloning to `port.GitManager.BootstrapRepository` using `local_git.go`.
- Designed `CreateForkPage.tsx` React component based on the create repo wizard.
- Wired Fork button in `FileExplorer.tsx` to redirect to `/:owner/:repo/fork` and disabled it if the current user is the repository owner.
- Implemented `GET /api/v1/repos/:repo_id` backend API and `reposApi.getRepoById` in frontend to lazily fetch parent repository details.
- Added `forked from` link under the repository name in the header when viewing a forked repository.
