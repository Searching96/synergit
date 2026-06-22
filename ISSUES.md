# Issue Rules

- Agents may self-assign issue priority up to `medium`.
- `high` priority must only be used when explicitly specified by the developer.
- Difficulty uses `low`, `medium`, or `high` and tracks implementation complexity separately from priority.
- Agents may self-assign issue difficulty up to `medium`.
- `high` difficulty must only be used when explicitly specified by the developer.

# Issues Dashboard

This is the central dashboard for tracking Synergit tasks, bugs, and technical debt. 
Click on any Issue ID to view its details. To create a new issue, copy the `issues/template.md` file.

| ID | Status | Priority | Difficulty | Component | Title | Labels | Related Issue |
|----|--------|----------|------------|-----------|-------|--------|---------------|
| [#001](./issues/001-backend-clean-architecture-refactor.md) | Closed | High | High | Backend | Backend Clean Architecture Refactor | `refactor`, `clean-architecture` | |
| [#002](./issues/002-frontend-modularization-refactor.md) | Closed | High | High | Frontend | Frontend Modularization Refactor | `refactor`, `react` | |
| [#003](./issues/003-twin-button-component.md) | Closed | Low | Low | Frontend | Create Twin Button Reusable Component | `feature`, `ui` | |
| [#004](./issues/004-rich-switch-button-component.md) | Closed | Low | Low | Frontend | Create Rich Switch Button Component | `feature`, `ui` | |
| [#005](./issues/005-shared-avatar-component.md) | Closed | Low | Low | Frontend | Create Shared Avatar Component | `feature`, `ui`, `refactoring` | |
| [#006](./issues/006-global-sidebar-menu.md) | Closed | Medium | Medium | Frontend | Global Sidebar Menu Fix | `bug`, `ui`, `refactoring` | |
| [#007](./issues/007-global-footer-delayed-render.md) | Closed | Low | Low | Frontend | Global Footer with Delayed Render | `feature`, `ui`, `ux` | |
| [#008](./issues/008-hide-footer-on-source-code-pages.md) | Closed | Low | Low | Frontend | Hide Footer on Source Code Pages | `bug`, `ui`, `ux` | |
| [#009](./issues/009-username-change-repo-access-bug.md) | Closed | High | High | Backend | Username Change Breaks Repository Access | `bug`, `database`, `git` | |
| [#010](./issues/010-rename-file-bug.md) | Closed | High | High | Fullstack | Rename File Bug | `bug`, `git`, `file-system` | |
| [#011](./issues/011-delete-file-directory.md) | Closed | Low | Low | Fullstack | Implement Delete File / Directory Action | `feature`, `git`, `api` | |
| [#012](./issues/012-optimize-file-rename.md) | Closed | High | High | Backend | Optimize File Rename Operation | `performance`, `git`, `refactor` | |
| [#013](./issues/013-optimize-file-load.md) | Closed | High | High | Fullstack | Optimize File Tree Load (Lazy Loading) | `performance`, `ui`, `api` | |
| [#014](./issues/014-batch-commits-fetch.md) | Closed | High | High | Fullstack | Batch Commits Fetch for File Tree | `performance`, `ui`, `api` | |
| [#015](./issues/015-fix-batch-commits-storm.md) | Open | High | High | Fullstack | Fix Batch Commits Fetch Network Storm | `performance`, `ui`, `api` | [#014](./issues/014-batch-commits-fetch.md) |
| [#016](./issues/016-inefficient-commit-fetching.md) | Closed | Medium | Medium | Fullstack | Inefficient Commit Fetching for Header | `performance`, `api` | |
| [#017](./issues/017-commit-history-pagination.md) | Open | High | High | Fullstack | Implement Pagination for Commit History Page | `performance`, `ui`, `api` | [#016](./issues/016-inefficient-commit-fetching.md) |
| [#018](./issues/018-commit-change-link.md) | Closed | Low | Low | Frontend | Implement CommitChangeLink Component | `feature`, `ui`, `refactor` | |
| [#019](./issues/019-reusable-tooltip.md) | Closed | Low | Low | Frontend | Create Reusable Tooltip Component | `feature`, `ui` | |
| [#020](./issues/020-repo-about-feature.md) | Closed | Medium | Medium | Frontend | Implement Repo About Feature | `feature`, `ui` | |
| [#021](./issues/021-fork-repository.md) | Closed | Medium | Medium | Fullstack | Implement Repository Fork Feature | `feature`, `ui`, `api`, `git` | |
| [#022](./issues/022-git-smart-http-authentication.md) | Closed | High | High | Backend | Git Smart HTTP Basic Authentication | `security`, `git`, `api` | |
| [#023](./issues/023-repository-activity-page.md) | Closed | Medium | Medium | Fullstack | Repository Activity Page | `feature`, `ui`, `database`, `git` | |
| [#024](./issues/024-forked-repo-route-redirects-to-upstream-owner.md) | Closed | High | High | Fullstack | Forked Repository Route Redirects to Upstream Owner | `bug`, `fork`, `routing` | [#021](./issues/021-fork-repository.md) |
| [#025](./issues/025-repository-insights-pulse.md) | Closed | Medium | Medium | Fullstack | Repository Insights Pulse | `feature`, `insights`, `ui`, `api`, `git` | [#023](./issues/023-repository-activity-page.md) |
| [#026](./issues/026-repository-insights-contributors.md) | Open | Medium | Medium | Fullstack | Repository Insights Contributors | `feature`, `insights`, `contributors`, `ui`, `api`, `git` | [#025](./issues/025-repository-insights-pulse.md) |
| [#027](./issues/027-contributions-segment-selection-chart.md) | Open | Medium | Medium | Fullstack | Contributions Segment Selection Chart | `feature`, `insights`, `contributors`, `ui`, `api`, `git` | [#026](./issues/026-repository-insights-contributors.md) |
| [#028](./issues/028-repository-insights-community-ui.md) | Closed | Medium | Medium | Frontend | Repository Insights Community UI | `feature`, `insights`, `community`, `ui` | [#026](./issues/026-repository-insights-contributors.md) |
| [#029](./issues/029-repository-community-standards-ui.md) | Closed | Medium | Medium | Frontend | Repository Community Standards UI | `feature`, `insights`, `community-standards`, `ui` | [#028](./issues/028-repository-insights-community-ui.md) |
| [#030](./issues/030-repository-insights-commit-activity.md) | Closed | Medium | Medium | Fullstack | Repository Insights Commit Activity | `feature`, `insights`, `commits`, `ui`, `api`, `git` | [#026](./issues/026-repository-insights-contributors.md) |
| [#031](./issues/031-repository-insights-code-frequency.md) | Closed | Medium | Medium | Fullstack | Repository Insights Code Frequency | `feature`, `insights`, `code-frequency`, `ui`, `api`, `git` | [#030](./issues/030-repository-insights-commit-activity.md) |
| [#032](./issues/032-create-more-issue-flow.md) | Closed | Low | Low | Frontend | Enhance Issue Creation Flow: Create More & Redirection | `feature`, `ux` | |
| [#033](./issues/033-link-issue-to-pull-request.md) | Closed | High | Medium | Fullstack | Link Issue to Pull Request Feature | `feature`, `pull-requests`, `issues`, `ui` | |
| [#034](./issues/034-issue-development-sidebar-popup.md) | Closed | Medium | Medium | Fullstack | Issue Development Sidebar Popup | `feature`, `issues`, `ui`, `api` | |
