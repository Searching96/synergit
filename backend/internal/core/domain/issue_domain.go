package domain

import (
	"encoding/json"
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

type IssueCloseReason string
type IssueRelationshipType string

const (
	IssueCloseReasonCompleted  IssueCloseReason = "COMPLETED"
	IssueCloseReasonNotPlanned IssueCloseReason = "NOT_PLANNED"
	IssueCloseReasonDuplicate  IssueCloseReason = "DUPLICATE"
)

const (
	IssueRelationshipBlockedBy IssueRelationshipType = "blocked_by"
	IssueRelationshipBlocking  IssueRelationshipType = "blocking"
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

func ParseIssueCloseReason(rawReason string) (IssueCloseReason, error) {
	reason := strings.ToUpper(strings.TrimSpace(rawReason))
	reason = strings.ReplaceAll(reason, "-", "_")
	reason = strings.ReplaceAll(reason, " ", "_")

	closeReason := IssueCloseReason(reason)
	if !closeReason.IsValid() {
		return "", errors.New("invalid close reason: must be COMPLETED, NOT_PLANNED, or DUPLICATE")
	}

	return closeReason, nil
}

func (r IssueCloseReason) IsValid() bool {
	switch r {
	case IssueCloseReasonCompleted, IssueCloseReasonNotPlanned, IssueCloseReasonDuplicate:
		return true
	default:
		return false
	}
}

func ParseIssueRelationshipType(rawType string) (IssueRelationshipType, error) {
	relationshipType := IssueRelationshipType(strings.ToLower(strings.TrimSpace(rawType)))
	if !relationshipType.IsValid() {
		return "", errors.New("invalid relationship type: must be blocked_by or blocking")
	}

	return relationshipType, nil
}

func (t IssueRelationshipType) IsValid() bool {
	switch t {
	case IssueRelationshipBlockedBy, IssueRelationshipBlocking:
		return true
	default:
		return false
	}
}

type Issue struct {
	ID          uuid.UUID        `json:"id"`
	RepoID      uuid.UUID        `json:"repo_id"`
	CreatorID   uuid.UUID        `json:"creator_id"`
	Title       string           `json:"title"`
	Description string           `json:"description"`
	Status      IssueStatus      `json:"status"`
	CloseReason IssueCloseReason `json:"close_reason,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	Assignees   []IssueAssignee  `json:"assignees,omitempty"`
}

type IssueRelationships struct {
	BlockedBy []Issue `json:"blocked_by"`
	Blocking  []Issue `json:"blocking"`
}

type IssueRelationshipEdge struct {
	BlockingIssueID uuid.UUID `json:"blocking_issue_id"`
	BlockedIssueID  uuid.UUID `json:"blocked_issue_id"`
}

type IssueAssignee struct {
	IssueID    uuid.UUID `json:"issue_id"`
	UserID     uuid.UUID `json:"user_id"`
	AssignedAt time.Time `json:"assigned_at"`
}

type IssueEvent struct {
	ID                uuid.UUID       `json:"id"`
	IssueID           uuid.UUID       `json:"issue_id"`
	ActorID           uuid.UUID       `json:"actor_id"`
	Actor             string          `json:"actor"`
	EventType         string          `json:"event_type"`
	Payload           json.RawMessage `json:"payload,omitempty"`
	PullRequest       *PullRequest    `json:"pull_request,omitempty"`
	PullRequestNumber int             `json:"pull_request_number,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
}

type IssueComment struct {
	ID        uuid.UUID `json:"id"`
	IssueID   uuid.UUID `json:"issue_id"`
	AuthorID  uuid.UUID `json:"author_id"`
	Author    string    `json:"author"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
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
