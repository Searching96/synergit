package domain

import (
	"time"

	"github.com/google/uuid"
)

type RepoCollaborator struct {
	RepositoryID uuid.UUID `json:"repository_id"`
	UserID       uuid.UUID `json:"user_id"`
	Role         uuid.UUID `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type CollaboratorRepository interface {
	AddCollaborator(repoID uuid.UUID, userID uuid.UUID, role string) error
	RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID) error
	GetRole(repoID uuid.UUID, userID uuid.UUID) (string, error)
	GetCollaborators(repoID uuid.UUID) ([]RepoCollaborator, error)
}
