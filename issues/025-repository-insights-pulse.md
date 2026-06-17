---
id: "025"
title: "Repository Insights Pulse"
priority: "medium"
difficulty: "medium"
status: "closed"
component: "fullstack"
labels: ["feature", "insights", "ui", "api", "git"]
assignee: "codex"
created_at: 2026-06-17
closed_at: 2026-06-17
related_issues: ["023"]
---

# Repository Insights Pulse

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
Implement a GitHub-style repository Pulse page at `/:owner/:repo/pulse`. The page belongs to the repository Insights area and displays recent activity for selectable periods.

## Context
Pulse gives repository owners and collaborators a compact overview of recent project activity: active pull requests and issues, merged pull requests, newly opened issues, summary commit/file churn, and top committers. This should be backed by a dedicated backend API instead of composing partial insights data on the frontend.

The visual reference is the provided GitHub Pulse screenshot. The frontend should closely match that layout and use Octicons from `@primer/octicons-react`; if a required Octicon is unavailable, implementation should pause and ask the creator for an asset.

## Acceptance Criteria
- [x] `/owner/repo/pulse` renders Pulse under the active Insights tab.
- [x] Backend API returns Pulse data for an authorized repository.
- [x] Period selector supports 24 hours, 3 days, 1 week, and 1 month.
- [x] Overview, Summary, and Top Committers match the provided GitHub-style layout closely.
- [x] Pulse UI uses Octicons and does not use lucide icons where Octicons exist.
- [x] Backend tests and frontend build pass.

## Implementation Notes
- Added `GET /api/v1/repos/:repo_id/insights/pulse?period=...` and wired it through the repo insights controller/use case boundary.
- Added `RepoPulseSnapshot` domain/API shape with overview, summary, and top committer data for selectable Pulse periods.
- Extended commit domain mapping with parent hashes so Pulse can exclude merge commits.
- Implemented Pulse aggregation across branches, default-branch diffs, repository issues, and pull requests.
- Rebuilt the repository Insights page as a GitHub-style Pulse view at `/:owner/:repo/pulse`, using Octicons for all Pulse icons.
- Added the GitHub-style Period dropdown with 24 hours, 3 days, 1 week, and 1 month options.
- Tuned Pulse layout scale, sidebar item set, overview progress colors, card sizing, and top committer chart spacing to better match the GitHub reference.
- Added Pulse loading placeholders for initial/refetch states and an empty commit activity state after zero-activity responses.
- Added frontend routing/API/types for Pulse and kept the repository Insights tab active on `/pulse`.
- Added backend unit coverage for Pulse window filtering, overview counting, and top committer ordering.
