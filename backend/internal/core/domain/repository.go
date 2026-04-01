package domain

import (
	"errors"
	"strings"
	"time"
)

// Repo represents the core entity of our SCM module
type Repo struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"created_at"`
}

func ValidateRepoName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("repository name cannot be empty")
	}

	return nil
}

func ValidateGitService(service string) error {
	if service != "git-upload-pack" && service != "git-receive-pack" {
		return errors.New("unsupported git service")
	}

	return nil
}
