package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type StarUseCase interface {
	Star(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	Unstar(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	GetStatus(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	ListStarred(requesterID uuid.UUID) ([]*domain.Repo, error)
	CountStarred(requesterID uuid.UUID) (int, error)
}
