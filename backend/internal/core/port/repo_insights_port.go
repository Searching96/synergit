package port

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type RepoInsightsRepository interface {
	SaveLatest(snapshot *domain.RepoInsightsSnapshot) error
	GetLatestByRepoID(repoID uuid.UUID) (*domain.RepoInsightsSnapshot, error)
}

type RepoInsightsScheduler interface {
	EnqueueRecompute(repoID uuid.UUID, trigger string) error
}

type RepoInsightsUsecase interface {
	RepoInsightsScheduler
	GetLastestInsights(repoID uuid.UUID, requesterID uuid.UUID) (*domain.RepoInsightsSnapshot, error)
	TriggerRecompute(repoID uuid.UUID, requesterID uuid.UUID, trigger string) error
	RecomputeNow(repoID uuid.UUID, trigger string) error
}
