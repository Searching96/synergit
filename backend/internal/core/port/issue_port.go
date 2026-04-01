package port

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type IssueRepository interface {
	Create(issue *domain.Issue) error
	GetByID(issueID uuid.UUID) (*domain.Issue, error)
	ListByRepo(repoID uuid.UUID) ([]domain.Issue, error)
	UpdateStatus(issueID uuid.UUID, status domain.IssueStatus) error
	AddAssignee(issueID uuid.UUID, userID uuid.UUID) error
	RemoveAssignee(issueID uuid.UUID, userID uuid.UUID) error
	ListAssignees(issueID uuid.UUID) ([]domain.IssueAssignee, error)
}

type IssueUsecase interface {
	CreateIssue(repoID uuid.UUID, creatorID uuid.UUID, title string,
		description string) (*domain.Issue, error)
	ListIssuesForRepo(repoID uuid.UUID, requesterID uuid.UUID) ([]domain.Issue, error)
	GetIssue(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) (*domain.Issue, error)
	TransitionIssueStatus(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID, nextStatus string) error
	AssignIssue(repoID uuid.UUID, issueID uuid.UUID, assigneeID uuid.UUID,
		requesterID uuid.UUID) error
	UnassignIssue(repoID uuid.UUID, issueID uuid.UUID, assigneeID uuid.UUID,
		requesterID uuid.UUID) error
	ListIssueAssignees(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.IssueAssignee, error)
}
