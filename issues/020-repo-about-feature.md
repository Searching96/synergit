---
id: "020"
title: "Implement Repo About Feature"
priority: "medium"
status: "closed"
component: "frontend"
labels: ["feature", "ui"]
assignee: "antigravity"
created_at: 2026-06-16
closed_at: 2026-06-16
related_issues: []
---

# Implement Repo About Feature

> [!NOTE]
> **Component**: Frontend | **Status**: Closed

## Description
Implement the "About" section on the repository page sidebar and the corresponding "Edit repository details" modal.

## Context
Users need to be able to view and edit repository metadata, such as description, website, and topics, directly from the repository page. This improves repository discoverability and provides essential context to visitors.

## Acceptance Criteria
- [x] Add a gear icon (settings) to the "About" section in the right sidebar.
- [x] Clicking the gear icon opens an "Edit repository details" modal.
- [x] The modal should include input fields for:
  - Description
  - Website
  - Topics (separate with spaces, visualized as tags)
- [x] The modal should include "Include in the home page" checkboxes (Releases, Deployments, Packages). UI only, checked by default, logic temporarily skipped.
- [x] The modal should have "Cancel" and "Save changes" buttons.
- [x] Saving changes updates the "About" section.
- [x] The updated "About" section displays:
  - The repository description text.
  - A link icon followed by the website URL.
  - Topics displayed as pill badges (e.g., blue background).
- [x] If no description, website, or topics are provided, display "No description, website, or topics provided." (italicized).

## Implementation Notes
- Added `website` and `topics` to Postgres `repositories` schema and updated struct mappings.
- Modified `RepoService` to allow partial updates of `Description`, `Website`, and `Topics`.
- Included `Website` and `Topics` inside `RepoResponse` DTO for the frontend.
- Implemented `RepoAboutModal` on the frontend with GitHub-style tags input.
- Added website and topics visualization in `FileExplorer` right sidebar with vertical alignment.
