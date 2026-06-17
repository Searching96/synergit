---
id: "026"
title: "Repository Insights Contributors"
priority: "medium"
difficulty: "high"
status: "open"
component: "fullstack"
labels: ["feature", "insights", "contributors", "ui", "api", "git"]
assignee: "codex"
created_at: 2026-06-17
closed_at: null
related_issues: ["025"]
---

# Repository Insights Contributors

> [!NOTE]
> **Component**: Fullstack | **Status**: Open

## Description
Implement a GitHub-style Contributors tab in repository Insights at `/:owner/:repo/graphs/contributors`.

## Context
The Contributors view should show weekly commit contributions on the default branch, excluding merge commits. V1 supports the `Commits` contribution metric only and includes period filtering for all time, last month, and last three months.

## Acceptance Criteria
- [x] `/owner/repo/graphs/contributors?from={threeMonthsAgo}` is the default Contributors tab URL.
- [x] `/owner/repo/graphs/contributors?all=1` renders all default-branch non-merge commits.
- [x] `/owner/repo/graphs/contributors?from=...` renders Last month or Last 3 months based on the matching date window.
- [x] Period dropdown updates URL to GitHub-style query strings.
- [x] Contributions dropdown displays `Commits` and does not imply unsupported metrics.
- [ ] Main weekly chart and contributor cards closely match the supplied GitHub screenshot.
- [x] Backend tests and frontend build pass.

## Implementation Notes
- Added backend Contributors API at `GET /api/v1/repos/:repo_id/insights/contributors?period=all|1m|3m`.
- Added Contributors domain/API shape with weekly totals and per-author weekly commit buckets.
- Implemented selected-period default-branch, non-merge commit aggregation with period filtering and contributor sorting.
- Added frontend routing for `/:owner/:repo/graphs/contributors` and preserved GitHub-style query strings.
- Added Contributors view under Insights with Period and Contributions dropdowns.
- Added the main weekly `Commits over time` bar chart with Sunday-centered weekly bars, Monday axis labels, hover tooltip, and hover marker.
- Added per-contributor cards with two-column desktop layout, contributor rank controls, weekly mini charts, total commits, additions, and deletions.
- Tuned contributor mini chart axis labels, plot width, date labels, and card overflow so labels stay inside each panel.
- Added backend unit coverage for contributors period resolution, merge exclusion, weekly bucketing, and sorting.

## Remaining Work
- Continue visual polish on the main weekly chart and contributor cards before closing the issue.
- Keep lower all-time navigator refinements tracked separately in #027.
