package usecase

import (
	"errors"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	usecaseutils "synergit/internal/core/usecase/utils"
	"time"

	"github.com/google/uuid"
)

// RepoService implements the business logic for repositories
type RepoService struct {
	gitManager  port.GitManager // Dependency injected via interface
	repoStore   port.RepoRepository
	collabStore port.CollaboratorRepository
	userStore   port.UserRepository

	repoInsightsScheduler port.RepoInsightsScheduler
}

// NewRepoService creates a new usecase instance
func NewRepoService(
	gm port.GitManager,
	rs port.RepoRepository,
	cs port.CollaboratorRepository,
	us port.UserRepository,
	ris port.RepoInsightsScheduler,
) *RepoService {
	return &RepoService{
		gitManager:            gm,
		repoStore:             rs,
		collabStore:           cs,
		userStore:             us,
		repoInsightsScheduler: ris,
	}
}

// CreateRepository is the actual business logic
func (s *RepoService) CreateRepository(name string, ownerID uuid.UUID) (*domain.Repo, error) {
	return s.CreateRepositoryWithOptions(name, ownerID, domain.CreateRepositoryOptions{})
}

func (s *RepoService) CreateRepositoryWithOptions(name string, ownerID uuid.UUID, options domain.CreateRepositoryOptions) (*domain.Repo, error) {
	if err := domain.ValidateRepoName(name); err != nil {
		return nil, err
	}

	normalizedOptions, err := usecaseutils.NormalizeRepositoryCreateOptions(options)
	if err != nil {
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

	initialFiles := usecaseutils.BuildRepositoryBootstrapFiles(name, owner.Username, normalizedOptions)
	if len(initialFiles) > 0 {
		if err := s.gitManager.BootstrapRepository(fullPath, "master", owner.Username,
			initialFiles, "Initial commit"); err != nil {

			return nil, err
		}
	}

	repo := &domain.Repo{
		Name:        name,
		Path:        fullPath,
		CreatedAt:   time.Now(),
		Description: normalizedOptions.Description,
		Visibility:  normalizedOptions.Visibility,
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

	s.enqueueInsights(repoUUID, "repo_created")

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

	if err := s.gitManager.ReceivePack(repoPath, requestPayload, responseWriter); err != nil {
		return err
	}

	s.enqueueInsights(repoID, "receive_pack_legacy")

	return nil
}

func (s *RepoService) ReceivePackByOwnerAndName(ownerUsername string, repoName string,
	requestPayload port.ByteReader, responseWriter port.ByteWriter) error {

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return err
	}

	if err := s.gitManager.ReceivePack(repoPath, requestPayload, responseWriter); err != nil {
		return err
	}

	repo, err := s.repoStore.FindByOwnerAndName(ownerUsername, repoName)
	if err == nil && repo != nil {
		if repoUUID, parseErr := uuid.Parse(repo.ID); parseErr == nil {
			s.enqueueInsights(repoUUID, "receive_pack_public")
		}
	}

	return nil
}

func (s *RepoService) GetAllRepositories() ([]*domain.Repo, error) {
	repos, err := s.repoStore.FindAll()
	if err != nil {
		return nil, err
	}

	for _, repo := range repos {
		if repo == nil {
			continue
		}

		if strings.TrimSpace(repo.Description) == "" {
			repo.Description = inferDescriptionFromReadme(s.gitManager, repo.Path)
		}

		if strings.TrimSpace(repo.PrimaryLanguage) != "" {
			continue
		}

		repoUUID, parseErr := uuid.Parse(repo.ID)
		if parseErr != nil {
			continue
		}

		s.enqueueInsights(repoUUID, "repo_list_missing_primary_language")
	}

	return repos, nil
}

func inferDescriptionFromReadme(gitManager port.GitManager, repoPath string) string {
	content, err := gitManager.GetBlob(repoPath, "README.md", "")
	if err != nil {
		content, err = gitManager.GetBlob(repoPath, "readme.md", "")
		if err != nil {
			return ""
		}
	}

	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "[!") {
			continue
		}

		if len(trimmed) > 180 {
			return strings.TrimSpace(trimmed[:180]) + "..."
		}

		return trimmed
	}

	return ""
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

func (s *RepoService) GetRepoCommits(repoID uuid.UUID, branch string, path string) ([]domain.Commit, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetCommits(repoPath, branch, path)
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

type repoCommitContext struct {
	RepoPath   string
	AuthorName string
}

func (s *RepoService) resolveRepoCommitContext(repoID uuid.UUID,
	requesterID uuid.UUID) (*repoCommitContext, error) {

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	user, err := s.userStore.GetUserByID(requesterID)
	if err != nil || user == nil {
		return nil, errors.New("requester user not found")
	}

	return &repoCommitContext{
		RepoPath:   repoPath,
		AuthorName: user.Username,
	}, nil
}

func (s *RepoService) CommitFileChange(repoID uuid.UUID, requesterID uuid.UUID,
	branch string, filePath string, content string, commitMessage string) error {
	if err := domain.ValidateCommitFileChangeInput(branch, filePath,
		commitMessage); err != nil {

		return err
	}

	ctx, err := s.resolveRepoCommitContext(repoID, requesterID)
	if err != nil {
		return err
	}

	if err := s.gitManager.CommitFileChange(ctx.RepoPath, branch, filePath, content,
		ctx.AuthorName, commitMessage); err != nil {
		return err
	}

	s.enqueueInsights(repoID, "commit_file_change")

	return nil
}

func (s *RepoService) CommitFilesChange(repoID uuid.UUID, requesterID uuid.UUID,
	branch string, files map[string]string, commitMessage string) error {
	if err := domain.ValidateCommitFilesChangeInput(branch, files,
		commitMessage); err != nil {

		return err
	}

	ctx, err := s.resolveRepoCommitContext(repoID, requesterID)
	if err != nil {
		return err
	}

	if err := s.gitManager.CommitFilesChange(ctx.RepoPath, branch, files,
		ctx.AuthorName, commitMessage); err != nil {
		return err
	}

	s.enqueueInsights(repoID, "commit_files_change")

	return nil
}

func (s *RepoService) enqueueInsights(repoID uuid.UUID, trigger string) {
	if s.repoInsightsScheduler == nil {
		return
	}
	if err := s.repoInsightsScheduler.EnqueueRecompute(repoID, trigger); err != nil {
		// Do not fail push path because of analytics queue pressure
	}
}
