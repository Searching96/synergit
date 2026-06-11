# Backend Clean Architecture Issues (Technical Debt)

This document tracks the specific violations of Clean Architecture in the current Synergit backend. Resolving these issues is necessary to fulfill the guidelines established in `BACKEND.md`.

## 1. Directory Structure Misalignment
The current directory structure uses generic hexagonal/layered naming rather than strict Clean Architecture terminology.
- **Issue:** `internal/adapter/handler/http` should be `internal/controller`.
- **Issue:** `internal/adapter/repository`, `internal/adapter/security`, and `internal/adapter/git_analysis` should be moved to `internal/gateway`.
- **Issue:** `internal/core/port` should be renamed to `internal/core/boundary` and split into `boundary/input` and `boundary/output`.

## 2. Missing Input Boundaries
Controllers currently depend directly on concrete Use Case implementations.
- **Issue:** `RepoHandler` injects `*usecase.RepoService`.
- **Issue:** `AuthHandler` injects `*usecase.AuthService`.
- **Issue:** `IssueHandler` injects `*usecase.IssueService`.
- **Issue:** `PullRequestHandler` injects `*usecase.PullRequestService`.
- **Issue:** *...and all other handlers.*
- **Fix:** Extract interfaces (e.g., `RepoUseCase`) into `boundary/input/` and have controllers depend on them.

## 3. Controller Bypass (Direct Gateway/Driver Injection)
Some controllers bypass the Use Case layer completely, injecting gateways or drivers directly. This is a critical violation of the Dependency Rule.

### 3.1. `UserSettingsHandler`
- **Violation:** Injects `port.UserRepository` directly.
- **Violation:** Injects raw `*sql.DB` directly (leaking the SQL driver into the controller layer).
- **Fix:** Create a `UserSettingsUseCase` (or add to an existing Use Case) that handles the username change transaction.

### 3.2. `PRLabelHandler`
- **Violation:** Injects concrete gateway structs `*postgres.PullRequestLabelStore` and `*postgres.PullRequestAssigneeStore` instead of depending on an Input Boundary.
- **Fix:** Create `PRLabelUseCase` and `PRAssigneeUseCase` (or add methods to `PullRequestUseCase`). The controller must call the Use Case, which in turn calls the Output Boundary.

## Issue Tracking Status
- [ ] Refactor Directory Structure (`controller`, `gateway`, `boundary`)
- [ ] Create `boundary/output/` interfaces and move existing `port` interfaces there.
- [ ] Create `boundary/input/` interfaces for all Use Cases.
- [ ] Update Use Cases to implement Input Boundaries.
- [ ] Update Controllers to depend on Input Boundaries.
- [ ] Fix `UserSettingsHandler` bypass.
- [ ] Fix `PRLabelHandler` bypass.
- [ ] Update `cmd/server/main.go` wiring.
