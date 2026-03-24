package usecase

import (
	"errors"
	"io"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	"github.com/google/uuid"
)

// RepoService implements the business logic for repositories
type RepoService struct {
	gitManager  port.GitManager // Dependency injected via interface
	repoStore   port.RepoRepository
	collabStore port.CollaboratorRepository
}

// NewRepoService creates a new usecase instance
func NewRepoService(gm port.GitManager, rs port.RepoRepository, cs port.CollaboratorRepository) *RepoService {
	return &RepoService{
		gitManager:  gm,
		repoStore:   rs,
		collabStore: cs,
	}
}

// CreateRepository is the actual business logic
func (s *RepoService) CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error) {
	if name == "" {
		return nil, errors.New("repository name cannot be empty")
	}

	// Call the infrastructure layer via the interface
	fullPath, err := s.gitManager.InitBareRepo(name)
	if err != nil {
		return nil, err
	}

	repo := &domain.Repo{
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

	repoUUID, err := uuid.Parse(repo.ID)
	if err != nil {
		return nil, errors.New("failed to parse created repository id")
	}

	err = s.collabStore.AddCollaborator(repoUUID, ownerID, "OWNER")
	if err != nil {
		return nil, err
	}

	return repo, nil
}

func (s *RepoService) resolveRepoName(repoID uuid.UUID) (string, error) {
	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return "", err
	}
	if repo == nil {
		return "", errors.New("repository not found")
	}
	return repo.Name, nil
}

func (s *RepoService) GetIntoRefs(repoID uuid.UUID, service string) ([]byte, error) {
	// Security/Validation: Only allow valid git services
	if service != "git-upload-pack" && service != "git-receive-pack" {
		return nil, errors.New("unsupported git service")
	}

	repoName, err := s.resolveRepoName(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.AdvertiseRefs(repoName, service)
}

func (s *RepoService) UploadPack(repoID uuid.UUID, in io.Reader, out io.Writer) error {
	repoName, err := s.resolveRepoName(repoID)
	if err != nil {
		return err
	}

	return s.gitManager.UploadPack(repoName, in, out)
}

func (s *RepoService) ReceivePack(repoID uuid.UUID, in io.Reader, out io.Writer) error {
	repoName, err := s.resolveRepoName(repoID)
	if err != nil {
		return err
	}

	return s.gitManager.ReceivePack(repoName, in, out)
}

func (s *RepoService) GetAllRepositories() ([]*domain.Repo, error) {
	return s.repoStore.FindAll()
}

func (s *RepoService) GetRepoTree(repoID uuid.UUID, path string, branch string) ([]domain.RepoFile, error) {
	repoName, err := s.resolveRepoName(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetTree(repoName, path, branch)
}

func (s *RepoService) GetRepoBlob(repoID uuid.UUID, path string, branch string) (string, error) {
	repoName, err := s.resolveRepoName(repoID)
	if err != nil {
		return "", err
	}

	return s.gitManager.GetBlob(repoName, path, branch)
}

func (s *RepoService) GetRepoCommits(repoID uuid.UUID, branch string) ([]domain.Commit, error) {
	repoName, err := s.resolveRepoName(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetCommits(repoName, branch)
}

func (s *RepoService) GetRepoBranches(repoID uuid.UUID) ([]domain.Branch, error) {
	repoName, err := s.resolveRepoName(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetBranches(repoName)
}
