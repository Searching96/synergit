package domain

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type IssueStatus string

const (
	IssueStatusOpen   IssueStatus = "OPEN"
	IssueStatusClosed IssueStatus = "CLOSED"
)

func ParseIssueStatus(rawStatus string) (IssueStatus, error) {
	status := IssueStatus(strings.ToUpper(strings.TrimSpace(rawStatus)))
	if !status.IsValid() {
		return "", errors.New("invalid issue status: must be OPEN or CLOSED")
	}

	return status, nil
}

func (s IssueStatus) IsValid() bool {
	switch s {
	case IssueStatusOpen, IssueStatusClosed:
		return true
	default:
		return false
	}
}

type Issue struct {
	ID          uuid.UUID       `json:"id"`
	RepoID      uuid.UUID       `json:"repo_id"`
	CreatorID   uuid.UUID       `json:"creator_id"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Status      IssueStatus     `json:"status"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	Assignees   []IssueAssignee `json:"assignees,omitempty"`
}

type IssueAssignee struct {
	IssueID    uuid.UUID `json:"issue_id"`
	UserID     uuid.UUID `json:"user_id"`
	AssignedAt time.Time `json:"assigned_at"`
}

func ValidateCreateIssueInput(title string) error {
	if strings.TrimSpace(title) == "" {
		return errors.New("title is required")
	}

	return nil
}

func ValidateIssueStatusTransition(currentStatus IssueStatus,
	nextStatus IssueStatus) error {

	if !currentStatus.IsValid() {
		return errors.New("invalid current issue status")
	}

	if !nextStatus.IsValid() {
		return errors.New("invalid issue status")
	}

	if currentStatus == nextStatus {
		return errors.New("issue is already in the requested status")
	}

	return nil
}
