package domain

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ProjectViewLayout string

const (
	ProjectViewTable   ProjectViewLayout = "TABLE"
	ProjectViewBoard   ProjectViewLayout = "BOARD"
	ProjectViewRoadmap ProjectViewLayout = "ROADMAP"
)

func (l ProjectViewLayout) IsValid() bool {
	switch l {
	case ProjectViewTable, ProjectViewBoard, ProjectViewRoadmap:
		return true
	default:
		return false
	}
}

type ProjectItemContentType string

const (
	ProjectItemIssue       ProjectItemContentType = "ISSUE"
	ProjectItemPullRequest ProjectItemContentType = "PULL_REQUEST"
)

func (t ProjectItemContentType) IsValid() bool {
	switch t {
	case ProjectItemIssue, ProjectItemPullRequest:
		return true
	default:
		return false
	}
}

// Project represents a user's project board/table
type Project struct {
	ID          uuid.UUID `json:"id"`
	OwnerID     uuid.UUID `json:"owner_id"`
	Number      int       `json:"number"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ProjectView represents a view configuration for a project
type ProjectView struct {
	ID        uuid.UUID         `json:"id"`
	ProjectID uuid.UUID         `json:"project_id"`
	Name      string            `json:"name"`
	Layout    ProjectViewLayout `json:"layout"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

// ProjectItem represents an item (issue/pr) in a project
type ProjectItem struct {
	ID          uuid.UUID              `json:"id"`
	ProjectID   uuid.UUID              `json:"project_id"`
	ContentType ProjectItemContentType `json:"content_type"`
	ContentID   uuid.UUID              `json:"content_id"`
	Status      string                 `json:"status"` // E.g., "Todo", "In Progress", "Done"
	StartDate   *time.Time             `json:"start_date,omitempty"`
	TargetDate  *time.Time             `json:"target_date,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// ProjectItemDTO is the data structure returned to the frontend
type ProjectItemDTO struct {
	ProjectItem
	Title  string `json:"title"`
	Number string `json:"number"` // Short ID or actual number
	Avatar string `json:"avatar"` // Creator's avatar/username
}

// CreateProjectPayload is used when a user creates a new project
type CreateProjectPayload struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
}

// UpdateProjectPayload is used to edit a project's title/description
type UpdateProjectPayload struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
}

// CreateProjectViewPayload is used when a user creates a new view
type CreateProjectViewPayload struct {
	Name   string `json:"name" binding:"required"`
	Layout string `json:"layout" binding:"required"`
}

func (p *CreateProjectViewPayload) Validate() error {
	layout := ProjectViewLayout(strings.ToUpper(p.Layout))
	if !layout.IsValid() {
		return errors.New("invalid layout type")
	}
	p.Layout = string(layout)
	return nil
}

// CreateProjectItemPayload is used when adding an item to a project
type CreateProjectItemPayload struct {
	ContentType string    `json:"content_type" binding:"required"` // ISSUE or PULL_REQUEST
	ContentID   uuid.UUID `json:"content_id" binding:"required"`
	Status      string    `json:"status"`                          // e.g. "Todo"
}

func (p *CreateProjectItemPayload) Validate() error {
	contentType := ProjectItemContentType(strings.ToUpper(p.ContentType))
	if !contentType.IsValid() {
		return errors.New("invalid content type")
	}
	p.ContentType = string(contentType)
	return nil
}

// UpdateProjectItemPayload is used when updating an item (e.g. moving across board, changing dates)
type UpdateProjectItemPayload struct {
	Status     *string    `json:"status,omitempty"`
	StartDate  *time.Time `json:"start_date,omitempty"`
	TargetDate *time.Time `json:"target_date,omitempty"`
}
