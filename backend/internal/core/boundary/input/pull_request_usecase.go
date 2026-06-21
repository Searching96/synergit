package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type PullRequestUseCase interface {
	AddLabelToPR(prID uuid.UUID, labelID uuid.UUID) error
	RemoveLabelFromPR(prID uuid.UUID, labelID uuid.UUID) error
	ListPRLabels(prID uuid.UUID) ([]domain.Label, error)
	AssignPR(prID uuid.UUID, userID uuid.UUID) error
	UnassignPR(prID uuid.UUID, userID uuid.UUID) error
	ListPRAssignees(prID uuid.UUID) ([]domain.PRAssignee, error)
	CreatePullRequest(
		repoID uuid.UUID, creatorID uuid.UUID, title string,
		description string, sourceBranch string, targetBranch string,
	) (*domain.PullRequest, error)
	ComparePullRequestRefs(repoID uuid.UUID, requesterID uuid.UUID,
		baseRef string, headRef string) (*domain.PullRequestCompareResult, error)
	GetPullRequest(id uuid.UUID) (*domain.PullRequest, error)
	ListPullRequestsForRepo(repoID uuid.UUID) ([]domain.PullRequest, error)
	ListPullRequestEvents(repoID uuid.UUID, prID uuid.UUID,
		requesterID uuid.UUID) ([]domain.PullRequestEvent, error)
	MergePullRequest(prID uuid.UUID, mergerID uuid.UUID, customCommitMessage string, customDescription string) error
	RevertPullRequest(prID uuid.UUID,
		requesterID uuid.UUID) (*domain.PullRequest, error)
	ClosePullRequest(prID uuid.UUID, closerID uuid.UUID) error
	ReopenPullRequest(prID uuid.UUID, requesterID uuid.UUID) error
	GetMergeConflicts(prID uuid.UUID,
		requesterID uuid.UUID) ([]domain.ConflictFile, error)
	ResolveConflicts(prID uuid.UUID, requesterID uuid.UUID,
		commitMessage string, resolutions []domain.ConflictResolution) error
	LinkIssueToPR(repoID uuid.UUID, prID uuid.UUID, issueID uuid.UUID, requesterID uuid.UUID) error
	UnlinkIssueFromPR(repoID uuid.UUID, prID uuid.UUID, issueID uuid.UUID, requesterID uuid.UUID) error
	ListLinkedIssuesForPR(repoID uuid.UUID, prID uuid.UUID, requesterID uuid.UUID) ([]domain.Issue, error)
}
