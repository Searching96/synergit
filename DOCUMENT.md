# DOCUMENT

> This is the single source of truth for the Synergit project.
> It is updated at the end of every AI-assisted prompt where a file is created, edited, or deleted.
> All coding agents working on this codebase must read this document before starting work and
> update the relevant sections plus the Changelog after completing work.
> To trigger a full re-sync from the codebase, say: "re-sync DOCUMENT.md".

---

## Overview

Synergit is a self-hosted, GitHub-inspired Source Code Management (SCM) platform. It allows teams to host Git repositories on their own server,
collaborate through Pull Requests, track work with an Issue tracker, star repositories, and
inspect repository analytics -- all through a React web UI.

The core technical challenge is bridging two very different storage worlds: relational data
(users, repositories, pull requests, issues) stored in PostgreSQL, and actual Git object data
stored on the filesystem as bare repositories. The `port.GitManager` interface (24 methods) is
the architectural seam that keeps these worlds decoupled inside a Clean Architecture monolith.

Correctness of Git operations and data integrity across the two storage backends is the highest
priority. Business rules (permissions, PR merge conditions, issue state transitions) and API
contract stability are also treated as correctness concerns. The planned microservices migration
is a scalability concern and belongs to a lower priority development track that must never
compromise correctness.

---

## Details

### Backend Architecture

The backend is a single Go monolith following Clean Architecture (Ports and Adapters):

```
backend/
├── cmd/server/main.go
│     Entry point. Loads env, connects to Postgres, wires all adapters into use-cases,
│     wires use-cases into handlers, registers Gin routes, starts HTTP server on :8080.
│
└── internal/
    ├── core/
    │   ├── domain/     Pure domain structs and value objects. No framework imports.
    │   ├── port/       Go interfaces that define every contract this system depends on.
    │                   Use-cases depend only on these interfaces, never on concrete types.
    │   └── usecase/    Business logic. Each use-case receives its dependencies through
    │                   port interfaces injected at startup. No HTTP, no Postgres, no go-git.
    │
    └── adapter/
        ├── handler/http/       Gin HTTP handlers. Translate HTTP requests into use-case calls
        │                       and use-case results into HTTP responses.
        ├── repository/
        │   ├── local_git.go    Implements port.GitManager. Owns all Git filesystem operations
        │   │                   using go-git. At ~49 KB this is the heaviest single file.
        │   └── postgres/       9 files, one per domain entity. Implement the *Store ports.
        ├── git_analysis/       Implements port.RepoInsightsMetricComputer. Computes language
        │                       breakdown, commit trends, contributor stats, and profile activity.
        └── security/           Implements port.TokenManager (JWT) and port.PasswordHasher (bcrypt).
```

The dependency rule is strict: domain has no outward dependencies, port depends only on domain,
usecase depends only on port and domain, adapter depends on all layers. The entry point
(`main.go`) is the only place where concrete adapters are instantiated and injected.

### Domain Models

| Model | Key Fields | Notes |
|---|---|---|
| User | id, username, email, password_hash | Owns a namespace on the filesystem under GIT_ROOT/username/ |
| Repo | id, name, path, visibility, owner, primary_language | path is the bare Git repo path; visibility is PUBLIC or PRIVATE |
| Collaborator | repo_id, user_id, role | role is owner or collaborator |
| PullRequest | id, repo_id, title, source_branch, target_branch, status | status: open, merged, closed |
| Issue | id, repo_id, title, body, status | status: open, closed |
| Label | id, repo_id, name, color | Shared between issues and PRs |
| RepoStar | repo_id, user_id | Join table, no extra fields |
| RepoInsights | repo_id, snapshot fields | Cached analytics; see Insights section below |

Git-side models (live only in memory, never persisted to Postgres):

| Model | Description |
|---|---|
| Commit | hash, message, author, timestamp, parent hashes |
| RepoFile | path, type (file/dir), size |
| DiffFile | path, old/new content, hunks |
| Branch | name, last commit hash |
| LanguageStat | language name, byte count, percentage |
| PullRequestCompareResult | commits ahead, commits behind, diff files, conflicting files |
| ConflictResolution | file path, resolved content |

### Port Interfaces (Contracts)

All 11 port files live in `internal/core/port/`. These are the contracts every use-case depends on.

**port.GitManager** (24 methods, defined in `git_port.go`):
The central seam of the entire system. Groups into five functional areas:

- Repository lifecycle: `InitBareRepo`, `DeleteRepository`, `RenameRepository`, `BootstrapRepository`
- Git Smart HTTP (clone/push/pull over HTTP): `AdvertiseRefs`, `UploadPack`, `ReceivePack`
- Read operations: `GetTree`, `GetBlob`, `GetCommits`, `GetCommitDetail`, `GetCommitDiff`, `GetLanguageBreakdown`
- Branch management: `GetBranches`, `CreateBranch`, `RenameBranch`, `DeleteBranch`
- Write and merge: `CommitFileChange`, `CommitFilesChange`, `CompareRefs`, `MergeBranches`, `CreateRevertBranch`
- Conflict resolution: `GetConflictingFiles`, `GetConflictContent`, `ResolveConflictsAndCommit`

Today `LocalGitAdapter` is the only implementation. In the planned microservices migration,
`GitStorageHTTPClient` will implement the same interface, leaving all use-cases unchanged.

**port.RepoInsightsMetricComputer** (6 methods, defined in `repo_insights_port.go`):
Computes analytics from raw Git data. Implemented by `git_analysis.RepoInsightsMetricComputer`.

**port.RepoInsightsRepository** -- save and load analytics snapshots from Postgres.
**port.RepoInsightsUseCase** -- orchestrates trigger, recompute, and fetch operations.

**Other *Store ports** (one per domain entity): `RepoStore`, `UserStore`, `CollaboratorStore`,
`PullRequestStore`, `IssueStore`, `LabelStore`, `StarStore`, each implemented by the
corresponding `postgres/postgres_*.go` file.

**port.TokenManager** -- issue and verify JWT tokens.
**port.PasswordHasher** -- hash and verify passwords.

### Use-Cases

| Use-Case | File | Responsibilities |
|---|---|---|
| RepoService | repo_usecase.go | Create, rename, delete, list repos; branch ops; file ops; Git read ops |
| AuthService | auth_usecase.go | Register, login; password hashing; token issuance |
| PullRequestService | pull_request_usecase.go | Open, merge, revert, close, reopen PRs; compare refs; conflict detection |
| IssueService | issue_usecase.go | Create, list, get, update status; assignees; events; comments |
| LabelService | label_usecase.go | Create labels; attach/detach to issues |
| CollaboratorService | collaborator_usecase.go | Add, list, remove collaborators |
| StarService | star_usecase.go | Star, unstar, list starred, count starred |
| RepoInsightsService | repo_insights_usecase.go | Trigger recompute; get latest snapshot; get profile activity |

### HTTP API Surface

All routes are under `/api/v1/` except Git Smart HTTP which is at the root.
JWT authentication is required for all routes except `/auth/*`.

| Group | Method | Path | Handler |
|---|---|---|---|
| Auth | POST | /auth/register | Register |
| Auth | POST | /auth/login | Login |
| Repos | POST | /repos | CreateRepo |
| Repos | GET | /repos | GetRepos |
| Repos | GET | /repos/count | GetOwnedRepoCount |
| Repos | PATCH | /repos/:repo_id/visibility | UpdateRepoVisibility |
| Repos | PATCH | /repos/:repo_id/name | RenameRepo |
| Repos | DELETE | /repos/:repo_id | DeleteRepo |
| Branches | POST | /repos/:repo_id/branches | CreateBranch |
| Branches | PATCH | /repos/:repo_id/branches | RenameBranch |
| Branches | GET | /repos/:repo_id/branches | GetBranches |
| Branches | DELETE | /repos/:repo_id/branches/:branchName | DeleteBranch |
| Git Read | GET | /repos/:repo_id/tree | GetTree |
| Git Read | GET | /repos/:repo_id/blob | GetBlob |
| Git Read | GET | /repos/:repo_id/commits | GetCommits |
| Git Read | GET | /repos/:repo_id/commits/:commitHash | GetCommitDetail |
| Git Read | GET | /repos/:repo_id/commits/:commitHash/diff | GetCommitDiff |
| Git Write | POST | /repos/:repo_id/commit-file | CommitFileChange |
| Git Write | POST | /repos/:repo_id/commit-files | CommitFilesChange |
| Pull Requests | GET | /repos/:repo_id/compare | ComparePullRequestRefs |
| Pull Requests | POST | /repos/:repo_id/pulls | CreatePullRequest |
| Pull Requests | GET | /repos/:repo_id/pulls | ListPullRequests |
| Pull Requests | GET | /repos/:repo_id/pulls/:pull_id | GetPullRequest |
| Pull Requests | GET | /repos/:repo_id/pulls/:pull_id/events | ListPullRequestEvents |
| Pull Requests | POST | /repos/:repo_id/pulls/:pull_id/merge | MergePullRequest |
| Pull Requests | POST | /repos/:repo_id/pulls/:pull_id/revert | RevertPullRequest |
| Pull Requests | POST | /repos/:repo_id/pulls/:pull_id/close | ClosePullRequest |
| Pull Requests | POST | /repos/:repo_id/pulls/:pull_id/reopen | ReopenPullRequest |
| Conflicts | GET | /repos/:repo_id/pulls/:pull_id/conflicts | GetMergeConflicts |
| Conflicts | POST | /repos/:repo_id/pulls/:pull_id/conflicts/resolve | ResolveConflicts |
| PR Labels | GET/POST/DELETE | /repos/:repo_id/pulls/:pull_id/labels/* | PRLabel CRUD |
| PR Assignees | GET/POST/DELETE | /repos/:repo_id/pulls/:pull_id/assignees/* | PR Assignee CRUD |
| Issues | POST | /repos/:repo_id/issues | CreateIssue |
| Issues | GET | /repos/:repo_id/issues | ListIssues |
| Issues | GET | /repos/:repo_id/issues/:issue_id | GetIssue |
| Issues | PATCH | /repos/:repo_id/issues/:issue_id/status | UpdateIssueStatus |
| Issues | GET/POST/DELETE | /repos/:repo_id/issues/:issue_id/assignees/* | Issue Assignee CRUD |
| Issues | GET | /repos/:repo_id/issues/:issue_id/events | ListIssueEvents |
| Issues | GET/POST | /repos/:repo_id/issues/:issue_id/comments/* | Issue Comments |
| Labels | GET | /repos/:repo_id/labels | ListLabels |
| Issue Labels | GET/POST/DELETE | /repos/:repo_id/issues/:issue_id/labels/* | Issue Label CRUD |
| Stars | GET/POST/DELETE | /repos/:repo_id/star | GetStarStatus / Star / Unstar |
| Insights | GET | /repos/:repo_id/insights | GetLatestInsights |
| Insights | POST | /repos/:repo_id/insights/recompute | TriggerRecompute |
| Collaborators | POST/GET/DELETE | /repos/:repo_id/collabs/* | Collaborator CRUD |
| Profile | GET | /profile/activity | GetProfileActivity |
| Profile | GET | /profile/starred | ListStarred |
| Profile | GET | /profile/starred/count | CountStarred |
| User Settings | PATCH | /user/username | ChangeUsername |
| Git Smart HTTP | GET | /:username/:repo_git/info/refs | AdvertiseRefs |
| Git Smart HTTP | POST | /:username/:repo_git/git-upload-pack | UploadPack (clone/fetch) |
| Git Smart HTTP | POST | /:username/:repo_git/git-receive-pack | ReceivePack (push) |
| Health | GET | /health | Returns {"status":"ok"} |

### Git Storage

All bare Git repositories live on the local filesystem:

- Root: configured via `GIT_ROOT` env var (default: `D:/SynergitRepo/`)
- Path convention: `{GIT_ROOT}/{username}/{repo_name}.git`
- When a user changes their username, the entire user directory is renamed on disk
- `local_git.go` implements all 24 `port.GitManager` methods using `go-git/go-git v5`
- The Git Smart HTTP endpoints stream binary git-pack data directly; they are not JSON

Git path stability is critical. The path convention must not change unless the change is
explicitly approved and all existing bare repositories are migrated.

### Database Schema

Single PostgreSQL database. All tables are currently in the default schema.

| Table | Owned By | Key Columns |
|---|---|---|
| users | core | id (uuid), username, email, password_hash |
| repositories | core | id, owner_id (fk users), name, path, visibility |
| repository_collaborators | core | repo_id, user_id, role |
| pull_requests | core | id, repo_id, source_branch, target_branch, status, merge_commit_hash |
| pull_request_events | core | id, pull_request_id, type, actor_id |
| pull_request_labels | core | pull_request_id, label_id |
| pull_request_assignees | core | pull_request_id, user_id |
| issues | core | id, repo_id, title, body, status, author_id |
| issue_assignees | core | issue_id, user_id |
| issue_events | core | id, issue_id, type, actor_id |
| issue_comments | core | id, issue_id, body, author_id |
| issue_labels | core | issue_id, label_id |
| labels | core | id, repo_id, name, color |
| repo_stars | core | repo_id, user_id |
| repo_insights | insights | id, repo_id, snapshot JSON blob, computed_at |

The `repo_insights` table is tagged as belonging to the future `insights` schema in the
microservices migration plan. Currently all tables coexist in the default schema.

### Frontend

The frontend is a single-page React 19 application built with Vite.

```
frontend/src/
├── App.tsx              Main component. Contains all client-side routing logic and
│                        top-level page state. Currently ~38 KB.
├── components/
│   ├── auth/            Login and Register pages
│   ├── repository/      Repository browser, file tree viewer, commit log, commit detail,
│   │                    branch manager, PR list, PR detail, conflict resolver
│   ├── profile/         Profile page with contribution graph and repository list
│   ├── create-repository/   New repository wizard
│   ├── settings/        Username change form
│   ├── layout/          Navbar and sidebar shared across pages
│   ├── shared/          Reusable atoms: buttons, modals, dropdowns, badges, spinners
│   └── icons/           SVG icon components
├── services/api/        Typed API client. One file per domain area:
│   ├── client.ts        Base fetch wrapper; reads VITE_API_BASE_URL; attaches JWT header
│   ├── auth.ts          register, login
│   ├── repos.ts         repo CRUD, branches, tree, blob, commits, insights
│   ├── issues.ts        issue CRUD, comments, events, assignees
│   ├── pull.ts          PR CRUD, merge, revert, conflict resolution
│   ├── labels.ts        label CRUD for issues and PRs
│   └── stars.ts         star, unstar, list starred
├── types/index.ts       TypeScript interfaces mirroring all backend domain models
└── utils/               Date formatting, text truncation, and other helpers
```

All API calls go through `client.ts` which prepends `VITE_API_BASE_URL`. Changing the backend
URL requires only an `.env` change on the frontend side, which is the enabler for the gateway
layer in the microservices migration.

### Environment Configuration

Backend (`backend/.env`):

| Variable | Purpose |
|---|---|
| DATABASE_URL | Postgres connection string |
| GIT_ROOT | Filesystem root for bare git repos (e.g. D:/SynergitRepo/) |
| JWT_SECRET | HMAC secret for signing and verifying JWTs |
| FRONTEND_URL | Allowed CORS origin |
| HOST | Server bind host (default: localhost) |
| PORT | Server bind port (default: 8080) |

Frontend (`frontend/.env`):

| Variable | Purpose |
|---|---|
| VITE_API_BASE_URL | Base URL prepended to every API call (e.g. http://localhost:8080) |

---

## Development

### A. Primary Goal: Complete the Core Monolith & VPS Deployment (Highest Priority)

The immediate and most critical objective is to finish building the monolithic core of Synergit and successfully deploy it to a VPS.

- **Feature Completion:** There are still many incomplete features in the core monolith. The implementation of these features will be decided and prioritized entirely by the creator.
- **SCM Correctness:** All core features (Git operations, data integrity between Postgres and the filesystem, API contracts, and business rules) must be implemented correctly and robustly within the monolith first.
- **Deployment:** Once the monolith is stable and feature-complete (as decided by the creator), it will be deployed to a production VPS environment.

### B. Secondary Goal: Microservices Migration (Long-term)

The microservices migration is a long-term, secondary objective.

- **Prerequisite:** This migration will ONLY be initiated when the creator feels the core monolith is sufficiently complete and stable.
- **Execution:** When the time comes, the migration (Gateway, Core, GitStorage, Insights) will be performed carefully to ensure backward compatibility without breaking the existing API routes, Git path conventions, or database schemas established in the monolithic phase.

---

## Changelog

| Date | Author | Change |
|---|---|---|
| 2026-06-10 | Antigravity | Initial document created from full codebase exploration |
| 2026-06-10 | Antigravity | Restructured to Overview / Details / Development (A+B) scheme |
| 2026-06-11 | Antigravity | Cleaned up report generator script bundle (renamed from bakerio-report-bundle to report-builder) and removed legacy artifacts |
| 2026-06-11 | Antigravity | Updated Development section to prioritize completing the core monolith and VPS deployment over microservices migration |
| 2026-06-11 | Antigravity | Created BACKEND.md to document strict Robert C. Martin Clean Architecture guidelines, violations, and fix plans |
| 2026-06-11 | Antigravity | Created FRONTEND.md to document frontend analysis, React best practices, and refactoring plans |
| 2026-06-11 | Antigravity | Created backend/ISSUES.md to explicitly list Clean Architecture violations and track refactoring progress |
