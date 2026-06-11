package output

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type PullRequestRepository interface {
	Create(pr *domain.PullRequest) error
	GetByID(id uuid.UUID) (*domain.PullRequest, error)
	ListByRepo(repoID uuid.UUID) ([]domain.PullRequest, error)
	GetSequenceNumber(repoID uuid.UUID, prID uuid.UUID) (int, error)
	UpdateStatus(id uuid.UUID, status domain.PullRequestStatus) error
	UpdateCommitHashes(id uuid.UUID, sourceCommitHash string, targetCommitHash string) error
	AddEvent(prID uuid.UUID, actorID uuid.UUID, eventType string) error
	ListEvents(prID uuid.UUID) ([]domain.PullRequestEvent, error)
}

type PullRequestLabelRepository interface {
	Add(prID uuid.UUID, labelID uuid.UUID) error
	Remove(prID uuid.UUID, labelID uuid.UUID) error
	ListForPR(prID uuid.UUID) ([]domain.Label, error)
}

type PullRequestAssigneeRepository interface {
	Assign(prID uuid.UUID, userID uuid.UUID) error
	Unassign(prID uuid.UUID, userID uuid.UUID) error
	List(prID uuid.UUID) ([]domain.PRAssignee, error)
}

// Since I am just declaring these, I will just write the methods I saw in postgres_pr_label.go

type PullRequestUseCase interface {
	CreatePullRequest(
		repoID uuid.UUID, creatorID uuid.UUID, title string, description string,
		sourceBranch string, targetBranch string,
	) (*domain.PullRequest, error)
	ComparePullRequestRefs(repoID uuid.UUID, requesterID uuid.UUID, baseRef string,
		headRef string) (*domain.PullRequestCompareResult, error)
	GetPullRequest(id uuid.UUID) (*domain.PullRequest, error)
	ListPullRequestsForRepo(repoID uuid.UUID) ([]domain.PullRequest, error)
	ListPullRequestEvents(repoID uuid.UUID, prID uuid.UUID, requesterID uuid.UUID) ([]domain.PullRequestEvent, error)

	// This will involve complex logic: checking permissions,
	// calling the Git port to actually merge the code and updating DB
	MergePullRequest(prID uuid.UUID, mergerID uuid.UUID, commitMessage string, description string) error
	RevertPullRequest(prID uuid.UUID, requesterID uuid.UUID) (*domain.PullRequest, error)
	ClosePullRequest(prID uuid.UUID, closerID uuid.UUID) error
	ReopenPullRequest(prID uuid.UUID, requesterID uuid.UUID) error

	// For handling merge conflicts
	GetMergeConflicts(prID uuid.UUID, requesterID uuid.UUID) ([]domain.ConflictFile,
		error)
	ResolveConflicts(prID uuid.UUID, requesterID uuid.UUID, commitMessage string,
		resolutions []domain.ConflictResolution) error
}
