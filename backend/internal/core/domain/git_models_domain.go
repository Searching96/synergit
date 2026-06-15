package domain

import (
	"errors"
	"strings"
	"time"
)

type RepoFileType string

const (
	RepoFileTypeFile RepoFileType = "FILE"
	RepoFileTypeDir  RepoFileType = "DIR"
)

type RepoFile struct {
	Name string       `json:"name"`
	Path string       `json:"path"`
	Type RepoFileType `json:"type"`
}

type Commit struct {
	Hash    string    `json:"hash"`
	Author  string    `json:"author"`
	Message string    `json:"message"`
	Date    time.Time `json:"date"`
}

type CommitStats struct {
	TotalCommits int     `json:"total_commits"`
	LatestCommit *Commit `json:"latest_commit"`
}

type DiffFile struct {
	Path      string `json:"path"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
	Patch     string `json:"patch"`
}

type Branch struct {
	Name        string    `json:"name"`
	CommitHash  string    `json:"commit_hash"`
	IsDefault   bool      `json:"is_default"`
	LastAuthor  string    `json:"last_author"`
	LastUpdated time.Time `json:"last_updated"`
	BehindCount int       `json:"behind_count"`
	AheadCount  int       `json:"ahead_count"`
}

func ValidateBranchName(branch string) error {
	if strings.TrimSpace(branch) == "" {
		return errors.New("branch is required")
	}

	return nil
}

func ValidateCommitFileChangeInput(branch string, filePath string,
	commitMessage string) error {

	if err := ValidateBranchName(branch); err != nil {
		return err
	}

	if strings.TrimSpace(filePath) == "" {
		return errors.New("file path is required")
	}

	if strings.TrimSpace(commitMessage) == "" {
		return errors.New("commit message is required")
	}

	return nil
}

func ValidateCommitFilesChangeInput(branch string, files map[string]string,
	commitMessage string) error {

	if err := ValidateBranchName(branch); err != nil {
		return err
	}

	if len(files) == 0 {
		return errors.New("at least one file is required")
	}

	for filePath := range files {
		if strings.TrimSpace(filePath) == "" {
			return errors.New("file path is required")
		}
	}

	if strings.TrimSpace(commitMessage) == "" {
		return errors.New("commit message is required")
	}

	return nil
}
