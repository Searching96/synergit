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

type Branch struct {
	Name       string `json:"name"`
	CommitHash string `json:"commit_hash"`
	IsDefault  bool   `json:"is_default"`
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
