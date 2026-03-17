package usecase

import (
	"errors"
	"io"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"
)

// RepoService implements the business logic for repositories
type RepoService struct {
	gitManager port.GitManager // Dependency injected via interface
	repoStore  port.RepositoryStore
}

// NewRepoService creates a new usecase instance
func NewRepoService(gm port.GitManager, rs port.RepositoryStore) *RepoService {
	return &RepoService{
		gitManager: gm,
		repoStore:  rs,
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
		Name:      name,
		Path:      fullPath,
		CreatedAt: time.Now(),
	}

	// Save the metadata to database
	err = s.repoStore.Save(repo)
	if err != nil {
		// Note: In a production system, we'd want a "Saga" here to delete the physical folder
		// if the database insert fails. We will keep it simple for now.
		return nil, err
	}
	return repo, nil
}

func (s *RepoService) GetIntoRefs(repoName string, service string) ([]byte, error) {
	// Security/Validation: Only allow valid git services
	if service != "git-upload-pack" && service != "git-receive-pack" {
		return nil, errors.New("unsupported git service")
	}
	return s.gitManager.AdvertiseRefs(repoName, service)
}

func (s *RepoService) UploadPack(repoName string, in io.Reader, out io.Writer) error {
	return s.gitManager.UploadPack(repoName, in, out)
}

func (s *RepoService) ReceivePack(repoName string, in io.Reader, out io.Writer) error {
	return s.gitManager.ReceivePack(repoName, in, out)
}

func (s *RepoService) GetAllRepositories() ([]*domain.Repository, error) {
	return s.repoStore.FindAll()
}

func (s *RepoService) GetRepoTree(repoName string, path string) ([]domain.RepoFile, error) {
	return s.gitManager.GetTree(repoName, path)
}
