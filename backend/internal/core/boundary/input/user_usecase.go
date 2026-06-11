package input

import (
	"github.com/google/uuid"
)

type UserUseCase interface {
	ChangeUsername(requesterID uuid.UUID, newUsername string) (string, error)
}
