package output

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type StarRepository interface {
	Star(userID uuid.UUID, repoID uuid.UUID) error
	Unstar(userID uuid.UUID, repoID uuid.UUID) error
	IsStarred(userID uuid.UUID, repoID uuid.UUID) (bool, error)
	CountForRepo(repoID uuid.UUID) (int, error)
	ListStarredByUser(userID uuid.UUID) ([]*domain.Repo, error)
	CountStarredByUser(userID uuid.UUID) (int, error)
}

type StarUseCase interface {
	Star(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	Unstar(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	GetStatus(repoID uuid.UUID, requesterID uuid.UUID) (bool, int, error)
	ListStarred(requesterID uuid.UUID) ([]*domain.Repo, error)
	CountStarred(requesterID uuid.UUID) (int, error)
}
