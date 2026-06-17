package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type RepoInsightsUseCase interface {
	GetProfileActivity(
		requesterID uuid.UUID,
		year int,
	) (*domain.ProfileActivitySnapshot, error)
	GetLatestInsights(
		repoID uuid.UUID,
		requesterID uuid.UUID,
	) (*domain.RepoInsightsSnapshot, error)
	GetPulse(
		repoID uuid.UUID,
		requesterID uuid.UUID,
		period string,
	) (*domain.RepoPulseSnapshot, error)
	TriggerRecompute(
		repoID uuid.UUID,
		requesterID uuid.UUID,
		trigger string,
	) error
	EnqueueRecompute(repoID uuid.UUID, trigger string) error
	RecomputeNow(repoID uuid.UUID, trigger string) error
}
