package usecase

import (
	"errors"
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
	userStore   port.UserRepository
}

// NewRepoService creates a new usecase instance
func NewRepoService(gm port.GitManager, rs port.RepoRepository, cs port.CollaboratorRepository, us port.UserRepository) *RepoService {
	return &RepoService{
		gitManager:  gm,
		repoStore:   rs,
		collabStore: cs,
		userStore:   us,
	}
}

// CreateRepository is the actual business logic
func (s *RepoService) CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error) {
	if err := domain.ValidateRepoName(name); err != nil {
		return nil, err
	}

	owner, err := s.userStore.GetUserByID(ownerID)
	if err != nil || owner == nil {
		return nil, errors.New("owner user not found")
	}

	repoSlug := owner.Username + "/" + name

	// Call the infrastructure layer via the interface
	fullPath, err := s.gitManager.InitBareRepo(repoSlug)
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

	err = s.collabStore.AddCollaborator(repoUUID, ownerID,
		domain.CollaboratorRoleOwner)
	if err != nil {
		return nil, err
	}

	return repo, nil
}

func (s *RepoService) resolveRepoPath(repoID uuid.UUID) (string, error) {
	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return "", err
	}
	if repo == nil {
		return "", errors.New("repository not found")
	}
	return repo.Path, nil
}

func (s *RepoService) resolveRepoPathByOwnerAndName(ownerUsername string, repoName string) (string, error) {
	repo, err := s.repoStore.FindByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return "", err
	}
	if repo == nil {
		return "", errors.New("repository not found")
	}
	return repo.Path, nil
}

// Deprecated: use GetIntoRefsByOwnerAndName for username/repo clone flow.
func (s *RepoService) GetIntoRefs(repoID uuid.UUID, service string) ([]byte, error) {
	if err := domain.ValidateGitService(service); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.AdvertiseRefs(repoPath, service)
}

func (s *RepoService) GetIntoRefsByOwnerAndName(ownerUsername string, repoName string, service string) ([]byte, error) {
	if err := domain.ValidateGitService(service); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return nil, err
	}

	return s.gitManager.AdvertiseRefs(repoPath, service)
}

// Deprecated: use UploadPackByOwnerAndName for username/repo clone flow.
func (s *RepoService) UploadPack(repoID uuid.UUID, requestPayload port.ByteReader,
	responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	return s.gitManager.UploadPack(repoPath, requestPayload, responseWriter)
}

func (s *RepoService) UploadPackByOwnerAndName(ownerUsername string, repoName string,
	requestPayload port.ByteReader, responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return err
	}

	return s.gitManager.UploadPack(repoPath, requestPayload, responseWriter)
}

// Deprecated: repo_id receive-pack path is legacy and not publicly exposed.
func (s *RepoService) ReceivePack(repoID uuid.UUID, requestPayload port.ByteReader,
	responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	return s.gitManager.ReceivePack(repoPath, requestPayload, responseWriter)
}

func (s *RepoService) ReceivePackByOwnerAndName(ownerUsername string, repoName string,
	requestPayload port.ByteReader, responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return err
	}

	return s.gitManager.ReceivePack(repoPath, requestPayload, responseWriter)
}

func (s *RepoService) GetAllRepositories() ([]*domain.Repo, error) {
	return s.repoStore.FindAll()
}

func (s *RepoService) GetRepoTree(repoID uuid.UUID, path string, branch string) ([]domain.RepoFile, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetTree(repoPath, path, branch)
}

func (s *RepoService) GetRepoBlob(repoID uuid.UUID, path string, branch string) (string, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return "", err
	}

	return s.gitManager.GetBlob(repoPath, path, branch)
}

func (s *RepoService) GetRepoCommits(repoID uuid.UUID, branch string) ([]domain.Commit, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetCommits(repoPath, branch)
}

func (s *RepoService) GetRepoBranches(repoID uuid.UUID) ([]domain.Branch, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetBranches(repoPath)
}

func (s *RepoService) CreateRepoBranch(repoID uuid.UUID, newBranch string, fromBranch string) (*domain.Branch, error) {
	if err := domain.ValidateBranchName(newBranch); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.CreateBranch(repoPath, newBranch, fromBranch)
}

func (s *RepoService) CommitFileChange(repoID uuid.UUID, requesterID uuid.UUID,
	branch string, filePath string, content string, commitMessage string) error {
	if err := domain.ValidateCommitFileChangeInput(branch, filePath,
		commitMessage); err != nil {

		return err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	user, err := s.userStore.GetUserByID(requesterID)
	if err != nil || user == nil {
		return errors.New("requester user not found")
	}

	return s.gitManager.CommitFileChange(repoPath, branch, filePath, content,
		user.Username, commitMessage)
}
