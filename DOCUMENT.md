# Synergit -- Project Reference Document

> This document is the single source of truth for the Synergit project.
> It is updated at the end of every AI-assisted prompt where a file is created, edited, or deleted.
> All coding agents working on this codebase should read this document before starting work
> and update the relevant sections + Changelog after completing work.
> To trigger a re-sync of the full document, say: "re-sync DOCUMENT.md".

---

## What is it?

Synergit is a self-hosted, GitHub-inspired Source Code Management (SCM) platform built as a
university Semester 6 project. It lets teams host Git repositories, collaborate via Pull Requests,
track bugs with Issues, star repos, and view repository analytics -- all through a polished web UI.

---

## Technology Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Go 1.26 |
| HTTP framework | Gin |
| Git operations | go-git/go-git v5 (pure-Go Git implementation) |
| Database | PostgreSQL (via lib/pq) |
| Auth | HMAC JWT (golang-jwt/jwt v5) |
| Password hashing | golang.org/x/crypto (bcrypt) |
| Configuration | joho/godotenv |

### Frontend
| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | React 19 (Vite build tool) |
| Styling | Tailwind CSS v4 |
| Icons | @primer/octicons-react, lucide-react |
| UI utilities | @floating-ui/react, react-day-picker, react-markdown |

---

## Architecture -- Current State (Monolith)

The backend is a single Go monolith following Clean Architecture (Ports & Adapters):

```
backend/
├── cmd/server/main.go          <- Entry point: wires everything, starts Gin server on :8080
└── internal/
    ├── core/
    │   ├── domain/             <- Pure domain models (no framework imports)
    │   ├── port/               <- Interfaces (contracts) for repositories & external services
    │   └── usecase/            <- Business logic (depends only on ports, not concrete adapters)
    └── adapter/
        ├── handler/http/       <- Gin HTTP handlers (delivery layer)
        ├── repository/         <- Database & git implementations of ports
        │   ├── local_git.go    <- ~49 KB; all Git filesystem operations (most complex file)
        │   └── postgres/       <- 9 Postgres adapter files
        ├── git_analysis/       <- Analytics: language breakdown, commit activity, contribution summary
        └── security/           <- JWT token manager, bcrypt password hasher
```

### Domain Models

| Model | Description |
|---|---|
| User | Account with username, email, hashed password |
| Repo | Git repository (name, path, visibility, owner) |
| Collaborator | Repo membership (owner/collaborator roles) |
| PullRequest | PR with status, source/target branch, merge strategy |
| Issue | Bug/feature tracker with status, comments, labels, assignees |
| Label | Tagging system for issues and PRs |
| RepoStar | Star/unstar repository |
| RepoInsights | Computed analytics snapshot (language stats, commit activity, contribution summaries) |

### Port (Interface) Layer -- Key Contracts

| Interface | Methods | Purpose |
|---|---|---|
| port.GitManager | 51 methods | All git operations (init, commit, branch, merge, diff, blob read, smart HTTP, etc.) |
| port.RepoInsightsMetricComputer | 8 methods | Compute language breakdown, commit activity, contribution stats |
| Various port.*Store | CRUD | Postgres adapters for each domain entity |

---

## API Surface (/api/v1/...)

| Area | Key Endpoints |
|---|---|
| Auth | POST /auth/register, POST /auth/login |
| Repos | Full CRUD + rename, visibility toggle |
| Branches | Create, rename, list, delete |
| Files/Git | GET /tree, GET /blob, GET /commits, commit diff, commit file changes |
| Pull Requests | Create, list, get, merge, revert, close, reopen, conflict resolution |
| PR Labels & Assignees | Attach/detach labels and assignees to PRs |
| Issues | Full CRUD + assignees, comments, events, labels |
| Labels | Manage labels per repo |
| Stars | Star/unstar, list starred repos |
| Insights | GET /repos/:id/insights, POST /repos/:id/insights/recompute |
| Profile | GET /profile/activity, GET /profile/starred, GET /profile/starred/count |
| User Settings | PATCH /user/username |
| Git Smart HTTP | GET /:user/:repo.git/info/refs, POST .../git-upload-pack, POST .../git-receive-pack |

---

## Frontend Structure

```
frontend/src/
├── App.tsx              <- ~38 KB single-file router with all page-level logic
├── components/
│   ├── auth/            <- Login/Register pages
│   ├── repository/      <- Repo browser, commits, branches, file viewer, PR views
│   ├── profile/         <- Profile page, activity graph
│   ├── create-repository/
│   ├── settings/        <- User settings (username change)
│   ├── layout/          <- Navbar, sidebar
│   ├── shared/          <- Reusable UI atoms (buttons, modals, etc.)
│   └── icons/
├── services/api/        <- Typed API client wrappers (auth, repos, issues, PRs, stars, labels)
├── types/index.ts       <- TypeScript types mirroring backend domain models
└── utils/               <- Helper utilities
```

The frontend uses a single VITE_API_BASE_URL environment variable as the base for all API calls.

---

## Git Storage Model

- All bare Git repositories live on disk under D:\SynergitRepo\ (configurable via GIT_ROOT env var)
- Path convention: {GIT_ROOT}/{username}/{repo_name}.git
- local_git.go (49 KB) implements the entire port.GitManager interface using go-git

---

## Database

Single PostgreSQL database (synergit). Tables:

| Table | Domain |
|---|---|
| users | User accounts |
| repositories, repository_collaborators | Repos & membership |
| pull_requests, pull_request_events, pull_request_labels, pull_request_assignees | PR workflow |
| issues, issue_assignees, issue_events, issue_comments, issue_labels, labels | Issue tracker |
| repo_stars | Stars |
| repo_insights | Cached analytics snapshots |

---

## Environment Variables

### Backend (backend/.env)
```
DATABASE_URL=postgres://postgres:user@localhost:5432/synergit?sslmode=disable
GIT_ROOT=D:/SynergitRepo/
JWT_SECRET=my-super-secret-jwt-key-change-me
FRONTEND_URL=http://localhost:5173
HOST=localhost
PORT=8080
```

### Frontend (frontend/.env)
```
VITE_API_BASE_URL=http://localhost:8080
```

---

## Planned Evolution -- Microservices Migration

Detailed 14-task plan in MICROSERVICES_MIGRATION_PLAN.md to split the monolith into 4 services:

```
Browser -> Gateway (:8080)
              |-- /api/v1/insights/*        -> Insights Service (:8083)
              |-- /api/v1/git/*             -> GitStorage Service (:8082)
              +-- everything else           -> Core Service (:8081)
```

| Service | Port | Responsibility | DB Schema |
|---|---|---|---|
| Gateway | 8080 | Reverse proxy, CORS, path-prefix routing | none |
| Core | 8081 | Auth, repos metadata, PRs, Issues, Labels, Stars, User settings | core.* |
| GitStorage | 8082 | Owns D:\SynergitRepo\ -- all filesystem Git ops | none (filesystem only) |
| Insights | 8083 | Analytics computation & caching | insights.* |

The key seam is port.GitManager (51 methods). Core and Insights replace LocalGitAdapter with an
HTTP client that calls GitStorage's REST API. Use-cases remain unchanged.

Migration philosophy: "Extract for scale, not for trend" -- each phase ends with the app fully
working end-to-end.

| Phase | Tasks | Goal |
|---|---|---|
| Phase 0 | Task 1 | Extract pkg/synergitkit shared module (JWT, error DTOs, helpers) |
| Phase 1 | Tasks 2-3 | Insert pass-through Gateway in front of unchanged monolith |
| Phase 2 | Tasks 4-7 | Extract Insights service (lowest risk, read-mostly, isolated table) |
| Phase 3 | Tasks 8-11 | Extract GitStorage service (highest risk, shared filesystem) |
| Phase 4 | Tasks 12-14 | Rename monolith to Core, finalize schema split, write ARCHITECTURE.md |

---

## Current Status

- Backend monolith is feature-complete (all endpoints working)
- Frontend is feature-complete (React SPA)
- Microservices migration is planned but NOT yet started (still in monolith layout)

---

## Changelog

| Date | Author | Change |
|---|---|---|
| 2026-06-10 | Antigravity | Initial document created from full codebase exploration |
