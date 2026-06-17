---
id: "014"
title: "Batch Commits Fetch for File Tree & Fix Loading State"
priority: "high"
difficulty: "high"
status: "closed"
component: "fullstack"
labels: ["performance", "ui", "api"]
assignee: "antigravity"
created_at: 2026-06-15
closed_at: 2026-06-15
related_issues: ["013"]
---

# Batch Commits Fetch for File Tree & Fix Loading State

> [!NOTE]
> **Component**: Fullstack | **Status**: In Progress

## Description
When viewing a directory in the file explorer (or the repo root), the frontend currently fires a separate `GET /commits?path=...` request for every single file/folder. This N+1 fetching approach causes severe network congestion and long loading times (several seconds) for directories with many files. Additionally, the skeleton loading state for these files is tied to the top row's loading state, causing the loading bars to disappear prematurely before the file commits actually finish loading.

## Context
Optimizing this involves creating a new backend batch endpoint that fetches commits for multiple paths concurrently, reducing the N+1 HTTP requests to a single HTTP request. We also need to decouple the loading states in the frontend to improve UX.

## Acceptance Criteria
- [x] Backend `GitManager` has a `GetCommitsBatch` method.
- [x] Backend exposes `POST /api/v1/repos/:repo_id/commits-batch`.
- [x] Frontend `reposApi` client supports `getCommitsBatch`.
- [x] `useLatestCommitMap` uses the batch API and returns its own `isLoading` state.
- [x] File tree loading skeletons accurately reflect the batch fetching status.

## Implementation Notes
- Backend: Added `GetCommitsBatch` in `port.GitManager` using goroutines to fetch commits concurrently from the local repo in `LocalGitAdapter`. Max concurrency was limited using a semaphore (`make(chan struct{}, 10)`) to prevent high system load for very large directories. Fixed an issue where `go-git`'s `*git.Repository` object is not thread-safe for reading logs concurrently by opening a new independent `git.PlainOpen` repository instance for each goroutine.
- Frontend: Refactored `useLatestCommitMap` to return `{ commitMap, isLoading }`. Updated `FileExplorer.tsx` and `RepoTreeBrowserPage.tsx` to handle `isLoading` correctly to show skeleton animations for individual file items rather than binding them to the parent commit loading state.

### Architectural Decisions

#### 1. Avoiding the N+1 API Problem (Main Purpose)
- Before this issue, the frontend fired a separate `GET /commits?path=X` for every single file and folder in the directory. If a folder had 50 items, it generated 50 concurrent HTTP requests (the classic N+1 API problem). 
- The primary architectural purpose of this batch implementation is to group those N requests into a single `POST /commits-batch` HTTP request, drastically reducing network overhead, avoiding browser connection limits, and preventing server DDOS-like congestion.

#### 2. Separation of Concerns (`GET /tree` vs `POST /commits-batch`)
- In Git, tree objects do not store commit hashes, so retrieving the latest commit for a path requires an expensive reverse history traversal.
- If we bundled commit data directly into the `GET /tree` response, the user would experience a frozen screen/spinner for several seconds waiting for the backend to calculate the history.
- By using Lazy Loading (returning the fast `GET /tree` immediately, rendering the files, and then making a secondary `commits-batch` request), the UI remains responsive and the user can navigate into subdirectories without waiting for the commit messages to load.

#### 3. Choosing REST over WebSockets/SSE
- Since the backend still retrieves the tree before the frontend, it could theoretically push commits asynchronously via WebSockets. However, this introduces massive architectural complexity (stateful connections, tricky load balancing).
- In standard REST, a client makes 1 request and gets 1 response. Firing a secondary explicit `POST /commits-batch` adds less than 20ms of network overhead, keeps the server stateless and cache-friendly, and allows the frontend to control pagination. This simple REST batching is the industry standard (used by GitHub as well) to achieve highly responsive file trees without WebSocket overhead.
