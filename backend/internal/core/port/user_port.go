package port

import (
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type UserRepository interface {
	CreateUser(user *domain.User) error
	GetUserByUserName(username string) (*domain.User, error)
	GetUserByEmail(email string) (*domain.User, error)
	GetUserByID(id uuid.UUID) (*domain.User, error)
	UpdateUsername(id uuid.UUID, newUsername string) error
}

type AuthUseCase interface {
	Register(username string, email string, password string) error
	Login(username string, password string) (string, error)
}
