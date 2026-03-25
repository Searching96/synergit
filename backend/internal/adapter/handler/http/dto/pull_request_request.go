package dto

import "synergit/internal/core/domain"

// CreatePullRequestRequest defines payload for creating a pull request.
type CreatePullRequestRequest struct {
	Title        string `json:"title" binding:"required"`
	Description  string `json:"description"`
	SourceBranch string `json:"source_branch" binding:"required"`
	TargetBranch string `json:"target_branch" binding:"required"`
}

// ResolveConflictsRequest defines payload for resolving merge conflicts in a PR.
type ResolveConflictsRequest struct {
	CommitMessage string                      `json:"commit_message"`
	Resolutions   []domain.ConflictResolution `json:"resolutions" binding:"required"`
}
