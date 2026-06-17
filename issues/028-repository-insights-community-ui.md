---
id: "028"
title: "Repository Insights Community UI"
priority: "medium"
status: "closed"
component: "frontend"
labels: ["feature", "insights", "community", "ui"]
assignee: "codex"
created_at: 2026-06-18
closed_at: 2026-06-18
related_issues: ["026"]
---

# Repository Insights Community UI

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Implement the static GitHub-style Community Insights page at `/:owner/:repo/graphs/community`.

## Context
The Community Insights tab should visually match GitHub's empty community insights state when discussions are not enabled. This issue is UI-only; data and discussions logic will be tracked separately.

## Acceptance Criteria
- [x] `/:owner/:repo/graphs/community` renders under the active Insights tab.
- [x] The Insights sidebar highlights `Community`.
- [x] The page shows the centered empty state with the discussions icon, heading, explanatory copy, and green `Set up discussions` button.
- [x] Layout, spacing, typography, colors, and sidebar order closely match the provided GitHub screenshot.
- [x] No backend/API logic is added for this UI-only issue.

## Implementation Notes
- Added route parsing and canonicalization for `/:owner/:repo/graphs/community` and `/repos/:id/graphs/community`.
- Added navigation from the Insights sidebar `Community` item to the Community Insights route.
- Rendered the static GitHub-like Discussions empty state with Octicon discussion icon, centered heading/copy, and green setup button.
- Kept the implementation frontend-only; no backend/API data or discussions logic was added.

## Remaining Work
- Closed after creator review of the UI-only Community page.
