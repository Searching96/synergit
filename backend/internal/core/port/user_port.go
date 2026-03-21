package port

import "synergit/internal/core/domain"

type UserRepository interface {
	CreateUser(user *domain.User) error
	GetUserByUserName(username string) (*domain.User, error)
	GetUserByEmail(email string) (*domain.User, error)
}
