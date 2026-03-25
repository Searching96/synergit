package domain

import (
	"time"

	"github.com/google/uuid"
)

type PullRequestStatus string

const (
	PullRequestStatusOpen   PullRequestStatus = "OPEN"
	PullRequestStatusMerged PullRequestStatus = "MERGED"
	PullRequestStatusClosed PullRequestStatus = "CLOSED"
)

type PullRequest struct {
	ID           uuid.UUID         `json:"id"`
	RepoID       uuid.UUID         `json:"repo_id"`
	CreatorID    uuid.UUID         `json:"creator_id"`
	Title        string            `json:"title"`
	Description  string            `json:"description"`
	SourceBranch string            `json:"source_branch"`
	TargetBranch string            `json:"target_branch"`
	Status       PullRequestStatus `json:"status"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
}

type ConflictFile struct {
	Path    string `json:"path"`
	Content string `json:"content"` // The raw text containing the Git conflict markers
}

type ConflictResolution struct {
	Path            string `json:"path" binding:"required"`
	ResolvedContent string `json:"resolved_content" binding:"required"`
}
