---
id: "030"
title: "Repository Insights Commit Activity"
priority: "medium"
difficulty: "medium"
status: "closed"
component: "fullstack"
labels: ["feature", "insights", "commits", "ui", "api", "git"]
assignee: "codex"
created_at: 2026-06-18
closed_at: 2026-06-18
related_issues: ["026"]
---

# Repository Insights Commit Activity

> [!NOTE]
> **Component**: Fullstack | **Status**: Closed

## Description
Implement the GitHub-style Commits sub tab in repository Insights at `/:owner/:repo/graphs/commit-activity`.

## Context
The Commits insights page should show weekly commit activity over the last year for the selected repository. The UI should closely match GitHub's `graphs/commit-activity` page with the Insights sidebar, page heading, and commits-per-week bar chart.

## Acceptance Criteria
- [x] `/:owner/:repo/graphs/commit-activity` renders under the active Insights tab.
- [x] The Insights sidebar highlights `Commits`.
- [x] Backend API returns last-year default-branch non-merge weekly commit buckets.
- [x] The chart layout, typography, axes, green bars, card spacing, and Octicon actions closely match the supplied GitHub screenshot.
- [x] Frontend build and backend tests pass.

## Implementation Notes
- Added `RepoCommitActivitySnapshot` domain/TypeScript response shape with last-year weekly totals.
- Added authenticated backend endpoint `GET /api/v1/repos/:repo_id/insights/commit-activity`.
- Added use case aggregation for default-branch non-merge commits from one year ago to now, bucketed by week.
- Added backend unit coverage for weekly commit activity bucketing and merge commit exclusion.
- Added frontend API client method, route parsing, canonical path builder, and sidebar navigation for `/:owner/:repo/graphs/commit-activity`.
- Rendered the Commits sub tab under Insights with GitHub-style heading, card, Octicon action controls, y-axis, month labels, and green weekly bars.
- Tuned commit activity bars so the final partial week still renders as a full-width bar.
- Added GitHub-style hover tooltip for non-empty weekly bars and suppressed tooltip display for zero-commit weeks.
