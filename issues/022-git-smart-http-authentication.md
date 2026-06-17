---
id: "022"
title: "Git Smart HTTP Basic Authentication"
priority: "high"
difficulty: "high"
status: "closed"
component: "backend"
labels: ["security", "git", "api"]
assignee: "antigravity"
created_at: 2026-06-16
closed_at: 2026-06-16
related_issues: []
---

# Git Smart HTTP Basic Authentication

> [!NOTE]
> **Component**: Backend | **Status**: Closed

## Description
Currently, the Git Smart HTTP endpoints (`/info/refs`, `/git-upload-pack`, `/git-receive-pack`) are exposed publicly without any authentication checks. This allows any user who knows the repository clone URL to push and pull code, even for private repositories, bypassing all access controls.

We need to implement HTTP Basic Authentication to secure these routes. 

## Context
Git clients natively support HTTP Basic Authentication by prompting the user for credentials when the server responds with a `401 Unauthorized` and `WWW-Authenticate: Basic` header. Synergit needs a custom Gin middleware to intercept Git operations, enforce authentication rules, and evaluate permissions based on repository visibility and collaborator roles.

## Acceptance Criteria
- [x] Create `GitAuthMiddleware` to handle Git Smart HTTP authentication.
- [x] Parse `Authorization: Basic` header.
- [x] Authenticate users using `UserRepository` and `PasswordHasher`.
- [x] READ operations (`git-upload-pack`) on PUBLIC repos bypass authentication.
- [x] READ operations on PRIVATE repos require authentication and Collaborator/Owner role.
- [x] WRITE operations (`git-receive-pack`) ALWAYS require authentication and Collaborator/Owner role.
- [x] Unauthorized accesses return `401 Unauthorized` with appropriate WWW-Authenticate challenge, or `404 Not Found` if private repo hiding is required.
- [x] Apply the middleware to all `/:username/:repo_git` routes in `main.go`.

## Implementation Notes
(Agents and developers append notes, findings, or links to commits here)
