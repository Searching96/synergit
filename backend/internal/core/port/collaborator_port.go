package port

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type CollaboratorRepository interface {
	AddCollaborator(repoID uuid.UUID, userID uuid.UUID, role string) error
	RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID) error
	GetRole(repoID uuid.UUID, userID uuid.UUID) (string, error)
	GetCollaborators(repoID uuid.UUID) ([]domain.RepoCollaborator, error)
}

type CollaboratorUsecase interface {
	AddCollaborator(repoID uuid.UUID, userID uuid.UUID, role string, requesterID uuid.UUID) error
	RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID, requesterID uuid.UUID) error
	GetCollaborators(repoID uuid.UUID, requesterID uuid.UUID) ([]domain.RepoCollaborator, error)
}
