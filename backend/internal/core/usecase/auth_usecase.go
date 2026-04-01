package usecase

import (
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"
)

type AuthService struct {
	userStore    port.UserRepository
	hasher       port.PasswordHasher
	tokenManager port.TokenManager
}

func NewAuthService(userStore port.UserRepository, hasher port.PasswordHasher,
	tokenManager port.TokenManager) *AuthService {

	return &AuthService{
		userStore:    userStore,
		hasher:       hasher,
		tokenManager: tokenManager,
	}
}

func (s *AuthService) Register(username string, email string, password string) error {
	if err := domain.ValidateRegistrationInput(username, email, password); err != nil {
		return err
	}

	hashedPassword, err := s.hasher.Hash(password)
	if err != nil {
		return err
	}

	user := &domain.User{
		Username:     username,
		Email:        email,
		PasswordHash: hashedPassword,
	}

	return s.userStore.CreateUser(user)
}

func (s *AuthService) Login(username string, password string) (string, error) {
	if err := domain.ValidateLoginInput(username, password); err != nil {
		return "", err
	}

	user, err := s.userStore.GetUserByUserName(username)
	if err != nil {
		return "", errors.New("invalid username or password")
	}

	err = s.hasher.Compare(user.PasswordHash, password)
	if err != nil {
		return "", errors.New("invalid username or password")
	}

	expiresAt := time.Now().Add(time.Hour * 72)
	return s.tokenManager.GenerateToken(user.ID, user.Username, expiresAt)
}
