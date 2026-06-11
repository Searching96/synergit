package usecase

import (
	"errors"
	"synergit/internal/core/boundary/input"
	"synergit/internal/core/boundary/output"
	"time"

	"github.com/google/uuid"
)

var _ input.UserUseCase = (*UserService)(nil)

type UserService struct {
	userStore    output.UserRepository
	tokenManager output.TokenManager
	gitManager   output.GitManager
}

func NewUserService(us output.UserRepository, tm output.TokenManager, gm output.GitManager) *UserService {
	return &UserService{
		userStore:    us,
		tokenManager: tm,
		gitManager:   gm,
	}
}

func (s *UserService) ChangeUsername(requesterID uuid.UUID, newUsername string) (string, error) {
	if newUsername == "" || len(newUsername) < 3 {
		return "", errors.New("username must be at least 3 characters")
	}

	existing, _ := s.userStore.GetUserByUserName(newUsername)
	if existing != nil {
		return "", errors.New("username is already taken")
	}

	currentUser, err := s.userStore.GetUserByID(requesterID)
	if err != nil || currentUser == nil {
		return "", errors.New("failed to find user")
	}
	oldUsername := currentUser.Username

	if err := s.userStore.UpdateUsername(requesterID, newUsername); err != nil {
		return "", errors.New("failed to update username")
	}

	if s.gitManager != nil && oldUsername != "" {
		_ = s.gitManager.RenameUserStorage(oldUsername, newUsername)
	}

	_ = s.userStore.UpdateRepoPathsForUser(oldUsername, newUsername)

	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	token, err := s.tokenManager.GenerateToken(requesterID.String(), newUsername, expiresAt)
	if err != nil {
		return "", errors.New("username updated but failed to generate new token")
	}

	return token, nil
}
