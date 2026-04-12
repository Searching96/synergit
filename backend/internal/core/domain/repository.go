package domain

import (
	"errors"
	"strings"
	"time"
)

// Repo represents the core entity of our SCM module
type Repo struct {
	ID              string         `json:"id"`
	Name            string         `json:"name"`
	Path            string         `json:"path"`
	CreatedAt       time.Time      `json:"created_at"`
	Description     string         `json:"description,omitempty"`
	Visibility      RepoVisibility `json:"visibility"`
	PrimaryLanguage string         `json:"primary_language,omitempty"`
}

type RepoVisibility string

const (
	RepoVisibilityPublic  RepoVisibility = "public"
	RepoVisibilityPrivate RepoVisibility = "private"
)

type CreateRepositoryOptions struct {
	Description       string
	Visibility        RepoVisibility
	InitializeReadme  bool
	GitignoreTemplate string
	LicenseTemplate   string
}

func ValidateRepoName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("repository name cannot be empty")
	}

	return nil
}

func ValidateRepoVisibility(visibility RepoVisibility) error {
	if visibility == "" {
		return nil
	}

	if visibility != RepoVisibilityPublic && visibility != RepoVisibilityPrivate {
		return errors.New("invalid visibility")
	}

	return nil
}

func ValidateGitService(service string) error {
	if service != "git-upload-pack" && service != "git-receive-pack" {
		return errors.New("unsupported git service")
	}

	return nil
}
