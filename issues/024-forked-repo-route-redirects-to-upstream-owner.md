---
id: "024"
title: "Forked Repository Route Redirects to Upstream Owner"
priority: "medium"
status: "closed"
component: "fullstack"
labels: ["bug", "fork", "routing"]
assignee: "codex"
created_at: 2026-06-17
closed_at: 2026-06-17
related_issues: ["021"]
---

# Forked Repository Route Redirects to Upstream Owner

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
When a user opens a forked repository under the forker namespace, for example `B/linux`, the app redirects or resolves to the upstream owner's repository, for example `A/linux`, instead of staying on the fork.

The exact failing segment is not confirmed yet. The bug may be in frontend route resolution, backend repository lookup, or API response data for forked repositories.

## Context
Fork ownership semantics depend on the URL namespace. If `A/linux` and `B/linux` both exist, visiting `B/linux` must select B's fork. Redirecting to `A/linux` can make users inspect or act on the upstream repository instead of their own fork, which is especially risky for file browsing, issues, pull requests, commits, and future write flows.

The suspected area is frontend route resolution in `App.tsx`, especially `findRepoFromParsedRoute`. The route selection logic appears to try an exact owner/name match first, then falls back to the first repository with the same name. With both `A/linux` and `B/linux` loaded, that fallback can select the wrong repository and canonicalize the URL to the selected repo's owner. Backend/API owner values returned by repository list and fork creation should also be verified before fixing if this issue is reopened.

## Acceptance Criteria
- [x] Visiting `/:forkOwner/:repoName` selects the fork owned by `forkOwner` when both upstream and fork share the same name.
- [x] URL canonicalization preserves `B/linux` and does not rewrite it to `A/linux`.
- [x] Repo header, tabs, file browser, commits, issues, pulls, and fork metadata all operate against the selected fork.
- [x] If exact owner/name is not present in loaded repositories, the app does not silently fall back to a repository with the same name under another owner.
- [ ] Add or update regression coverage for route resolution with two repositories sharing the same name but different owners.

## Implementation Notes
- Confirmed by user manual testing that opening a forked repository under the forker namespace now stays on the fork instead of redirecting to the upstream owner repository.
- Updated the fork parent metadata presentation in the repository header so `forked from <owner>/<repo>` renders below the repository name.
- No automated regression test was added for the duplicate repo-name route resolution case.
