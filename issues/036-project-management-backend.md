---
id: "036"
title: "Project Management Backend"
priority: "high"
difficulty: "high"
status: "closed"
component: "backend"
labels: ["feature", "projects", "api", "database"]
assignee: "antigravity"
created_at: 2026-06-23
closed_at: 2026-06-23
related_issues: []
---

# Project Management Backend

> [!NOTE]
> **Component**: Backend | **Status**: Closed

## Description
Implement the entire backend for the new Projects feature. This includes creating a project, creating and managing different types of views (Table, Board, Roadmap), and operating on project items (issues, pull requests).

## Context
The frontend UI for the Projects page has been implemented, but it currently relies on hardcoded data. To make this feature functional, we need a complete backend implementation following the Clean Architecture pattern.

## Acceptance Criteria
- [x] Database schema for projects, project_views, and project_items.
- [x] Domain models for the new entities.
- [x] ProjectStore and ProjectUseCase ports.
- [x] Postgres adapter for ProjectStore.
- [x] ProjectService use case implementation.
- [x] HTTP handlers for CRUD operations on projects, views, and items.
- [x] Integration of the new handler into the gin router (`main.go`).

## Implementation Notes
- Created tables `projects`, `project_views`, `project_items`. The `projects` table uses `SERIAL` for the `number` field.
- The `ProjectService` automatically creates 3 default views on project creation (Table, Board, Roadmap).
- Modified frontend `UserProjectPage.tsx` to add a tooltip over the edit name button.
