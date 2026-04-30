package port

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
}

type PullRequestUseCase interface {
	CreatePullRequest(
		repoID uuid.UUID, creatorID uuid.UUID, title string, description string,
		sourceBranch string, targetBranch string,
	) (*domain.PullRequest, error)
	ComparePullRequestRefs(repoID uuid.UUID, requesterID uuid.UUID, baseRef string,
		headRef string) (*domain.PullRequestCompareResult, error)
	GetPullRequest(id uuid.UUID) (*domain.PullRequest, error)
	ListPullRequestsForRepo(repoID uuid.UUID) ([]domain.PullRequest, error)

	// This will involve complex logic: checking permissions,
	// calling the Git port to actually merge the code and updating DB
	MergePullRequest(prID uuid.UUID, mergerID uuid.UUID) error
	ClosePullRequest(prID uuid.UUID, closerID uuid.UUID) error

	// For handling merge conflicts
	GetMergeConflicts(prID uuid.UUID, requesterID uuid.UUID) ([]domain.ConflictFile,
		error)
	ResolveConflicts(prID uuid.UUID, requesterID uuid.UUID, commitMessage string,
		resolutions []domain.ConflictResolution) error
}
