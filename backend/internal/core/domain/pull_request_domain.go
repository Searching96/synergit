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

type CompareFileStatus string

const (
	CompareFileStatusAdded    CompareFileStatus = "ADDED"
	CompareFileStatusModified CompareFileStatus = "MODIFIED"
	CompareFileStatusDeleted  CompareFileStatus = "DELETED"
	CompareFileStatusRenamed  CompareFileStatus = "RENAMED"
	CompareFileStatusCopied   CompareFileStatus = "COPIED"
	CompareFileStatusUnknown  CompareFileStatus = "UNKNOWN"
)

type CompareFile struct {
	Path         string            `json:"path"`
	PreviousPath string            `json:"previous_path,omitempty"`
	Status       CompareFileStatus `json:"status"`
	Additions    int               `json:"additions"`
	Deletions    int               `json:"deletions"`
	Patch        string            `json:"patch"`
}

type PullRequestCompareSummary struct {
	CommitCount      int `json:"commit_count"`
	FilesChanged     int `json:"files_changed"`
	Additions        int `json:"additions"`
	Deletions        int `json:"deletions"`
	ContributorCount int `json:"contributor_count"`
}

type PullRequestCompareResult struct {
	RepoID              uuid.UUID                 `json:"repo_id"`
	BaseRef             string                    `json:"base_ref"`
	HeadRef             string                    `json:"head_ref"`
	CanCompare          bool                      `json:"can_compare"`
	Mergeable           bool                      `json:"mergeable"`
	MergeMessage        string                    `json:"merge_message"`
	Summary             PullRequestCompareSummary `json:"summary"`
	Commits             []Commit                  `json:"commits"`
	Files               []CompareFile             `json:"files"`
	RelatedPullRequests []PullRequest             `json:"related_pull_requests"`
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

func ValidateCompareRefs(baseRef string, headRef string) error {
	if strings.TrimSpace(baseRef) == "" || strings.TrimSpace(headRef) == "" {
		return errors.New("base and head refs are required")
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
