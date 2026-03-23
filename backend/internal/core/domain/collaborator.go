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
