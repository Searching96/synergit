package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type CollaboratorUseCase interface {
	AddCollaborator(repoID uuid.UUID, userID uuid.UUID,
		role domain.CollaboratorRole, requesterID uuid.UUID) error
	RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID, requesterID uuid.UUID) error
	GetCollaborators(repoID uuid.UUID, requesterID uuid.UUID) ([]domain.RepoCollaborator, error)
}
