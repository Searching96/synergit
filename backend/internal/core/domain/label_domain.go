package domain

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Label struct {
	ID          uuid.UUID `json:"id"`
	RepoID      uuid.UUID `json:"repo_id"`
	Name        string    `json:"name"`
	Color       string    `json:"color"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

func ValidateLabelName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("label name is required")
	}

	return nil
}

// DefaultLabels mirrors the labels GitHub seeds into a new repository.
func DefaultLabels() []Label {
	return []Label{
		{Name: "bug", Color: "#d73a4a", Description: "Something isn't working"},
		{Name: "documentation", Color: "#0075ca", Description: "Improvements or additions to documentation"},
		{Name: "duplicate", Color: "#cfd3d7", Description: "This issue or pull request already exists"},
		{Name: "enhancement", Color: "#a2eeef", Description: "New feature or request"},
		{Name: "good first issue", Color: "#7057ff", Description: "Good for newcomers"},
		{Name: "help wanted", Color: "#008672", Description: "Extra attention is needed"},
		{Name: "invalid", Color: "#e4e669", Description: "This doesn't seem right"},
		{Name: "question", Color: "#d876e3", Description: "Further information is requested"},
		{Name: "wontfix", Color: "#ffffff", Description: "This will not be worked on"},
	}
}
