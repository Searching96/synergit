package port

import "synergit/internal/core/domain"

type UserRepository interface {
	CreateUser(user *domain.User) error
	GetUserByUserName(username string) (*domain.User, error)
	GetUserByEmail(email string) (*domain.User, error)
}

type AuthUsecase interface {
	Register(username string, email string, password string) error
	Login(username string, password string) (string, error)
}
