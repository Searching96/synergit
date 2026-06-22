package input

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type UserUseCase interface {
	ChangeUsername(requesterID uuid.UUID, newUsername string) (string, error)
	SearchUsers(query string) ([]*domain.User, error)
}
