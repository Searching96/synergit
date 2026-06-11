package output

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type IssueRepository interface {
	Create(issue *domain.Issue) error
	GetByID(issueID uuid.UUID) (*domain.Issue, error)
	ListByRepo(repoID uuid.UUID) ([]domain.Issue, error)
	UpdateStatus(issueID uuid.UUID, status domain.IssueStatus, closeReason domain.IssueCloseReason) error
	AddAssignee(issueID uuid.UUID, userID uuid.UUID) error
	RemoveAssignee(issueID uuid.UUID, userID uuid.UUID) error
	ListAssignees(issueID uuid.UUID) ([]domain.IssueAssignee, error)
	AddEvent(issueID uuid.UUID, actorID uuid.UUID, eventType string) error
	ListEvents(issueID uuid.UUID) ([]domain.IssueEvent, error)
	AddComment(comment *domain.IssueComment) error
	ListComments(issueID uuid.UUID) ([]domain.IssueComment, error)
}

type IssueUseCase interface {
	CreateIssue(repoID uuid.UUID, creatorID uuid.UUID, title string,
		description string) (*domain.Issue, error)
	ListIssuesForRepo(repoID uuid.UUID, requesterID uuid.UUID) ([]domain.Issue, error)
	GetIssue(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) (*domain.Issue, error)
	TransitionIssueStatus(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID, nextStatus string, closeReason string) error
	AssignIssue(repoID uuid.UUID, issueID uuid.UUID, assigneeID uuid.UUID,
		requesterID uuid.UUID) error
	UnassignIssue(repoID uuid.UUID, issueID uuid.UUID, assigneeID uuid.UUID,
		requesterID uuid.UUID) error
	ListIssueAssignees(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.IssueAssignee, error)
	ListIssueEvents(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.IssueEvent, error)
	ListIssueComments(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.IssueComment, error)
	CreateIssueComment(repoID uuid.UUID, issueID uuid.UUID,
		authorID uuid.UUID, body string) (*domain.IssueComment, error)
}
