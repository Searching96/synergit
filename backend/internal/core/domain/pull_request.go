package domain

import (
	"errors"
	"strings"
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
	Path            string `json:"path"`
	ResolvedContent string `json:"resolved_content"`
}

func ValidateCreatePullRequestInput(title string, sourceBranch string,
	targetBranch string) error {

	if strings.TrimSpace(title) == "" || strings.TrimSpace(sourceBranch) == "" ||
		strings.TrimSpace(targetBranch) == "" {

		return errors.New("title, source_branch, and target_branch are required")
	}

	if sourceBranch == targetBranch {
		return errors.New("source and target branches cannot be the same")
	}

	return nil
}

func ValidateConflictResolutions(resolutions []ConflictResolution) error {
	if len(resolutions) == 0 {
		return errors.New("resolutions are required")
	}

	for _, resolution := range resolutions {
		if strings.TrimSpace(resolution.Path) == "" ||
			strings.TrimSpace(resolution.ResolvedContent) == "" {

			return errors.New("each resolution requires path and resolved_content")
		}
	}

	return nil
}
