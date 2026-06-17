---
id: "015"
title: "Fix Batch Commits Fetch Network Storm"
priority: "high"
difficulty: "high"
status: "open"
component: "fullstack"
labels: ["performance", "ui", "api", "bug"]
assignee: "antigravity"
created_at: 2026-06-15
closed_at: null
related_issues: ["014"]
---

# Fix Batch Commits Fetch Network Storm

> [!NOTE]
> **Component**: Fullstack | **Status**: Open

## Description
The repository file tree experiences severe performance degradation and "Network Storms" when loading batch commit information for files and directories. This results in heavy overlapping API calls, dropped data where commit information fails to load, and massive concurrent Git I/O thrashing on the backend.

## Context
When loading a large file tree, fetching the latest commit for each item sequentially or improperly in parallel leads to UX freezes and high server load. While some immediate bugs causing infinite UI re-renders and network storms have been patched, the fundamental backend strategy for traversing `go-git` history across multiple paths remains slow (~8s load times for this exact synergit repository when hosted within its own system). This issue must remain open until a highly scalable backend architecture is benchmarked and deployed to handle high-concurrency environments smoothly.

## Acceptance Criteria
- [ ] Conduct benchmarking on `go-git` performance using `git.PlainOpen` versus careful object cache management for a single `*git.Repository`.
- [ ] Conduct benchmarking on issuing OS-level `exec.Command("git", "log", ...)` since the native C-based Git binary is highly optimized.
- [ ] Evaluate tradeoffs between the purity of `go-git` and the performance of native Git binaries.
- [ ] Implement the most efficient and scalable backend solution based on benchmark results.

## Implementation Notes

### What We Have Done So Far
- **Frontend Fix Completed:** Identified that `displayedEntries.map(item => item.path)` created a new array reference on every render, causing an infinite render loop in `useLatestCommitMap`. We refactored `useLatestCommitMap.ts` to use `JSON.stringify(paths)` and a `useRef` cache. The network storm is completely eliminated, and only one `commits-batch` API call is dispatched per directory load.
- **Backend Architecture Status:** Temporarily kept the original goroutine design (opening `git.PlainOpen` in each routine) because it is the most thread-safe approach available with `go-git`.

### What We Will Do (Next Steps)
- Proceed with the Acceptance Criteria by setting up a dedicated benchmarking environment to load-test the backend `GetCommitsBatch` endpoint with simulated heavy traffic.
- Compare memory usage and speed metrics between native OS `git log` executions, `go-git` traversal, and a custom highly-optimized native binding (e.g., using C via cgo or a Rust library via FFI) before finalizing the backend implementation.
- **CRITICAL BENCHMARK CRITERIA:** The benchmark MUST prove which approach performs best under **high concurrent traffic** (e.g., hundreds of users loading large repositories simultaneously). We must evaluate overall system throughput and fairness, rather than simply exhausting all 16 CPU threads to maximize the load speed for a single user at the expense of others.
