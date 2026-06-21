---
id: "032"
title: "Enhance Issue Creation Flow: Create More & Redirection"
priority: "low"
difficulty: "low"
status: "closed"
component: "frontend"
labels: ["feature", "ux"]
assignee: "antigravity"
created_at: 2026-06-21
closed_at: 2026-06-21
related_issues: []
---

# Enhance Issue Creation Flow: Create More & Redirection

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Improve the UX of the issue creation process to match standard GitHub behaviors:
1. When creating an issue with the "Create more" checkbox unchecked, redirect the user immediately to the newly created issue's detail page.
2. When creating an issue with the "Create more" checkbox checked, keep the form open and display a success message (e.g., `Issue #X created`) next to the "Cancel" button, which persists until leaving the page and also serves as a link to the issue.
3. Remove the redundant green and red notification boxes that push content down.

## Context
The previous flow forced users to stay on the board and manually locate their newly created issue or manually close the popup and find the issue. It also pushed content around unnecessarily with notification boxes. Matching GitHub's standard flow provides a significantly smoother user experience.

## Acceptance Criteria
- [x] If "Create more" is unchecked, automatically redirect to the new issue detail page.
- [x] If "Create more" is checked, show `Issue #X created` as a link next to the Cancel button.
- [x] The `Create more` checkbox must align next to the `Cancel` button.
- [x] Remove the old green/red alert boxes.

## Implementation Notes
- Computed the correct `issueNo` within `handleCreateIssue` by resolving the sorted issue index.
- Updated `onOpenIssue(newIssueNo)` to trigger the redirection.
- Added `lastCreatedIssueNo` state to keep track of the most recently created issue when "Create more" is checked.
- Refactored `IssueBoard.tsx` and modified CSS/flex layout.
