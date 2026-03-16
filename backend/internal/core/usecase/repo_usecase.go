package usecase

import (
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"
)

// RepoService implements the business logic for repositories
type RepoService struct {
	gitManager port.GitManager // Dependency injected via interface
}

// NewRepoService creates a new usecase instance
func NewRepoService(gm port.GitManager) *RepoService {
	return &RepoService{
		gitManager: gm,
	}
}

// CreateRepository is the actual business logic
func (s *RepoService) CreateRepository(name string) (*domain.Repository, error) {
	if name == "" {
		return nil, errors.New("repository name cannot be empty")
	}

	// Call the infrastructure layer via the interface
	fullPath, err := s.gitManager.InitBareRepo(name)
	if err != nil {
		return nil, err
	}

	repo := &domain.Repository{
		ID:        "generate-uuid-here", // Will add later
		Name:      name,
		Path:      fullPath,
		CreatedAt: time.Now(),
	}

	// Will add database port here later
	return repo, nil
}
