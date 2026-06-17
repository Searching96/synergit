---
id: "029"
title: "Repository Community Standards UI"
priority: "medium"
difficulty: "low"
status: "closed"
component: "frontend"
labels: ["feature", "insights", "community-standards", "ui"]
assignee: "codex"
created_at: 2026-06-18
closed_at: 2026-06-18
related_issues: ["028"]
---

# Repository Community Standards UI

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Implement the static GitHub-style Community Standards page at `/:owner/:repo/community`.

## Context
The Community Standards tab should visually match GitHub's repository community standards page. This issue is UI-only; real repository file detection and standards scoring will be tracked separately.

## Acceptance Criteria
- [x] `/:owner/:repo/community` renders under the active Insights tab.
- [x] The Insights sidebar highlights `Community standards`.
- [x] The page shows a GitHub-like Community Standards overview with checklist-style rows for recommended repository community files.
- [x] Layout, spacing, typography, colors, and sidebar order closely match GitHub's Community Standards page.
- [x] No backend/API logic is added for this UI-only issue.

## Implementation Notes
- Added route parsing and canonicalization for `/:owner/:repo/community` and `/repos/:id/community`.
- Added navigation from the Insights sidebar `Community standards` item to the Community Standards route.
- Rendered a static Community Standards page matching the supplied screenshot: heading divider, centered standards comparison copy, checklist table, brown status dots, help links, Add buttons, and community profile link.
- Kept the implementation frontend-only; no repository-file detection, score calculation, or backend/API logic was added.

## Remaining Work
- Closed after creator review and follow-up visual adjustments.
