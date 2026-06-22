package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type IssueUseCase interface {
	CreateIssue(repoID uuid.UUID, creatorID uuid.UUID,
		title string, description string) (*domain.Issue, error)
	ListIssuesForRepo(repoID uuid.UUID,
		requesterID uuid.UUID) ([]domain.Issue, error)
	GetIssue(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) (*domain.Issue, error)
	TransitionIssueStatus(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID, nextStatus string, closeReason string) error
	AssignIssue(repoID uuid.UUID, issueID uuid.UUID,
		assigneeID uuid.UUID, requesterID uuid.UUID) error
	UnassignIssue(repoID uuid.UUID, issueID uuid.UUID,
		assigneeID uuid.UUID, requesterID uuid.UUID) error
	ListIssueAssignees(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.IssueAssignee, error)
	ListIssueEvents(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.IssueEvent, error)
	ListIssueComments(repoID uuid.UUID, issueID uuid.UUID,
		requesterID uuid.UUID) ([]domain.IssueComment, error)
	CreateIssueComment(repoID uuid.UUID, issueID uuid.UUID,
		authorID uuid.UUID, body string) (*domain.IssueComment, error)
	LinkBranchToIssue(repoID uuid.UUID, issueID uuid.UUID, branchName string, requesterID uuid.UUID) error
	UnlinkBranchFromIssue(repoID uuid.UUID, issueID uuid.UUID, branchName string, requesterID uuid.UUID) error
	ListLinkedBranchesForIssue(repoID uuid.UUID, issueID uuid.UUID, requesterID uuid.UUID) ([]string, error)
	ListIssueRelationships(repoID uuid.UUID, issueID uuid.UUID, requesterID uuid.UUID) (*domain.IssueRelationships, error)
	LinkIssueRelationship(repoID uuid.UUID, issueID uuid.UUID, targetIssueID uuid.UUID, relationshipType string, requesterID uuid.UUID) error
	UnlinkIssueRelationship(repoID uuid.UUID, issueID uuid.UUID, targetIssueID uuid.UUID, relationshipType string, requesterID uuid.UUID) error
}
