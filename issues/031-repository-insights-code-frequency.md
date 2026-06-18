---
id: "031"
title: "Repository Insights Code Frequency"
priority: "medium"
difficulty: "medium"
status: "closed"
component: "fullstack"
labels: ["feature", "insights", "code-frequency", "ui", "api", "git"]
assignee: "codex"
created_at: 2026-06-18
closed_at: 2026-06-18
related_issues: ["030"]
---

# Repository Insights Code Frequency

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
Implement the GitHub-style Code frequency sub tab in repository Insights at `/:owner/:repo/graphs/code-frequency`.

## Context
The Code frequency insights page should show additions and deletions per week over the repository history. The UI should closely match GitHub's `graphs/code-frequency` page with the Insights sidebar, page heading, and positive/negative weekly bar chart.

## Acceptance Criteria
- [x] `/:owner/:repo/graphs/code-frequency` renders under the active Insights tab.
- [x] The Insights sidebar highlights `Code frequency`.
- [x] Backend API returns default-branch weekly additions and deletions over repository history.
- [x] The chart layout, typography, axes, green additions, red deletions, legend, card spacing, and Octicon actions closely match the supplied GitHub screenshot.
- [x] Frontend build and backend tests pass.

## Implementation Notes
- Added `RepoCodeFrequencySnapshot` / `CodeFrequencyWeekStat` and authenticated `GET /api/v1/repos/:repo_id/insights/code-frequency`.
- Aggregated default-branch non-merge commit diffs over repository history into weekly additions and deletions.
- Added route parsing, canonical navigation, API client types, and sidebar navigation for `/:owner/:repo/graphs/code-frequency`.
- Rendered the GitHub-style Code frequency chart with green additions, red deletions, legend, Octicon actions, hover tooltips, muted opposite-series hover state, and Sunday-centered weekly bars.
- Implemented GitHub-like chart scaling and x-axis cadence: data-driven y-axis max, biweekly day labels for short ranges, and bimonthly month/year labels for longer ranges.
- Verified with `go test ./...`, targeted frontend eslint, and `npm.cmd run build`.
