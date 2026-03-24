package port

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type PullRequestRepository interface {
	Create(pr *domain.PullRequest) error
	GetByID(id uuid.UUID) (*domain.PullRequest, error)
	ListByRepo(repoID uuid.UUID) ([]domain.PullRequest, error)
	UpdateStatus(id uuid.UUID, status domain.PullRequestStatus) error
}

type PullRequestUsecase interface {
	CreatePullRequest(repoID uuid.UUID, creatorID uuid.UUID,
		title string, description string, sourceBranch string,
		targetBranch string) (*domain.PullRequest, error)
	GetPullRequest(id uuid.UUID) (*domain.PullRequest, error)
	ListPullRequestsForRepo(repoID uuid.UUID) ([]domain.PullRequest, error)

	// This will involve complex logic: checking permissions,
	// calling the Git port to actually merge the code and updating DB
	MergePullRequest(prID uuid.UUID, mergerID uuid.UUID) error
	ClosePullRequest(prID uuid.UUID, closerID uuid.UUID) error
}
