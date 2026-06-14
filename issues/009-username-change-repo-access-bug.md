---
id: "009"
title: "Username Change Breaks Repository Access"
status: "closed"
created_at: "2026-06-14"
closed_at: "2026-06-14"
component: "Backend"
labels:
  - "bug"
  - "database"
  - "git"
---

# Username Change Breaks Repository Access

## Description
When a user changes their username, they can no longer access their repositories. The system reports that the repository is not found.

## Acceptance Criteria
- [x] Changing username correctly updates the repository paths in the database.
- [x] Users can access their repositories after changing their username.
- [x] The fix correctly handles absolute paths and avoids incorrectly matching other users' paths.
- [x] Fixed `err is unknown` TypeScript error in `ConflictResolver.tsx`.

## Implementation Notes
- The root cause was `UpdateRepoPathsForUser` in `postgres_user.go`. The SQL query used `WHERE path LIKE oldUsername || '%'` which failed to match absolute paths starting with `D:\` or `/opt/`.
- This resulted in the physical folder being renamed by the `GitManager`, but the `repositories` database table keeping the old paths.
- The SQL query was updated to use `regexp_replace` to safely find and replace the username directory segment within the absolute path.
- Additionally, fixed type errors in `ConflictResolver.tsx` where caught errors were implicitly typed as `unknown` and caused `.message` property access errors.
