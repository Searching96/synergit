---
id: "012"
title: "Optimize File Rename Operation"
priority: "high"
status: "open"
component: "backend"
labels: ["performance", "git", "refactor"]
assignee: "antigravity"
created_at: 2026-06-14
closed_at: null
related_issues: ["010"]
---

# Optimize File Rename Operation

> [!NOTE]
> **Component**: Backend | **Status**: Open

## Description
Currently, when a file is renamed, the backend reads the blob of the old file, deletes the old file, and then creates a new file with the new name and the loaded blob content (`CommitFileChange` logic). While this fixes the "duplicate file" bug, it's inefficient for large files because it reads and writes content completely. We need to optimize this by directly creating a new tree entry using the existing Blob SHA and dropping the old tree entry, avoiding the need to read and copy file contents.

## Context
Renaming a large file or folder should be an $O(1)$ operation in terms of blob storage, rather than $O(N)$ based on file size. A true zero-copy rename improves performance significantly.

## Acceptance Criteria
- [ ] Rename operations update the Git Tree object by pointing the new file name to the same existing Blob SHA.
- [ ] The blob data is not read into memory during a rename.
- [ ] Backend tests confirm zero-copy renames.

## Implementation Notes
(To be filled when implemented)
