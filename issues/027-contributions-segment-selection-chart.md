---
id: "027"
title: "Contributions Segment Selection Chart"
priority: "medium"
difficulty: "high"
status: "open"
component: "fullstack"
labels: ["feature", "insights", "contributors", "ui", "api", "git"]
assignee: "codex"
created_at: 2026-06-18
closed_at: null
related_issues: ["026"]
---

# Contributions Segment Selection Chart

> [!NOTE]
> **Component**: Fullstack | **Status**: Open

## Description
Implement the lower navigator chart in repository Insights Contributors as an all-time contributions trend chart. The chart should remain all-time across every selected period, while the main bar chart and contributor cards continue to reflect the selected period.

## Context
The Contributors page needs a GitHub-like chart beneath `Commits over time` that can later support segment selection behavior. For now, the chart should retrieve all-time default-branch non-merge commit activity and render it as the lower line/area navigator. Period changes such as `Last month` and `Last 3 months` must not change the navigator's all-time data range.

## Acceptance Criteria
- [x] Contributors API returns all-time daily default-branch non-merge commit totals for the navigator.
- [x] Main weekly bars and contributor cards remain scoped to the selected period.
- [x] The lower navigator line/area chart renders the all-time contributions range for every period option.
- [x] The navigator keeps the same plot width as the main `Commits over time` bar chart.
- [x] Backend tests and frontend build pass.

## Implementation Notes
- Added issue to track all-time contributions navigator behavior and future segment-selection refinements.
- Updated Contributors API so `daily_totals` is built from all default-branch non-merge commits before applying the selected period filter.
- Kept selected-period contributor aggregation outside this issue; #026 owns `weekly_totals`, per-contributor cards, additions, and deletions.
- Updated the lower navigator to derive its chart domain from the all-time `daily_totals` range while preserving the same plot width as the main bar chart.
- Added GitHub/Highcharts-like visual structure for the navigator: light blue area, blue trend line, translucent selection mask, resize handles, grey bottom rail, and month labels.
- Smoothed the navigator trend from daily commit totals with a low-pass smoothing pass and spline path so sparse daily data renders closer to GitHub's stock-chart navigator.
- Tuned the trend line stroke width to keep the line visually thin.

## Remaining Work
- Add actual segment-selection behavior, including dragging or resizing the selected range.
- Continue matching GitHub's navigator interaction details as new requirements are provided.
