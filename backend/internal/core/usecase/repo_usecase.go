package usecase

import (
	"errors"
	"fmt"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"
	usecaseutils "synergit/internal/core/usecase/utils"
	"time"

	"github.com/google/uuid"
)

// RepoService implements the business logic for repositories
type RepoService struct {
	gitManager  output.GitManager // Dependency injected via interface
	repoStore   output.RepoRepository
	collabStore output.CollaboratorRepository
	userStore   output.UserRepository

	repoInsightsScheduler output.RepoInsightsScheduler
	repoEventUseCase      output.RepoEventUseCase
}

// NewRepoService creates a new usecase instance
func NewRepoService(
	gm output.GitManager,
	rs output.RepoRepository,
	cs output.CollaboratorRepository,
	us output.UserRepository,
	ris output.RepoInsightsScheduler,
	reu output.RepoEventUseCase,
) *RepoService {
	return &RepoService{
		gitManager:            gm,
		repoStore:             rs,
		collabStore:           cs,
		userStore:             us,
		repoInsightsScheduler: ris,
		repoEventUseCase:      reu,
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
		if err := s.gitManager.BootstrapRepository(fullPath, "master", owner.Username, owner.Email,
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

func (s *RepoService) ForkRepository(ownerID uuid.UUID, upstreamRepoID uuid.UUID, forkName string, description string, defaultBranchOnly bool) (*domain.Repo, error) {
	if err := domain.ValidateRepoName(forkName); err != nil {
		return nil, err
	}

	upstreamRepo, err := s.repoStore.FindByID(upstreamRepoID)
	if err != nil {
		return nil, err
	}
	if upstreamRepo == nil {
		return nil, errors.New("upstream repository not found")
	}

	owner, err := s.userStore.GetUserByID(ownerID)
	if err != nil || owner == nil {
		return nil, errors.New("owner user not found")
	}

	if upstreamRepo.Owner == owner.Username {
		return nil, errors.New("cannot fork your own repository")
	}

	existingRepo, err := s.repoStore.FindByOwnerAndName(owner.Username, forkName)
	if err != nil {
		return nil, err
	}
	if existingRepo != nil {
		return nil, errors.New("a repository with this name already exists in your account")
	}

	repoSlug := owner.Username + "/" + forkName

	var branchToClone string
	if defaultBranchOnly {
		branchToClone = "master" // Default to master since we don't have a default branch column yet
	}

	fullPath, err := s.gitManager.CloneBareRepo(upstreamRepo.Path, repoSlug, branchToClone)
	if err != nil {
		return nil, err
	}

	repo := &domain.Repo{
		Name:        forkName,
		Path:        fullPath,
		CreatedAt:   time.Now(),
		Description: description,
		Visibility:  upstreamRepo.Visibility,
		ParentID:    &upstreamRepo.ID,
	}

	err = s.repoStore.Save(repo)
	if err != nil {
		_ = s.gitManager.DeleteRepository(repoSlug)
		return nil, err
	}

	repoUUID, err := uuid.Parse(repo.ID)
	if err != nil {
		return nil, errors.New("failed to parse created repository id")
	}

	err = s.collabStore.AddCollaborator(repoUUID, ownerID, domain.CollaboratorRoleOwner)
	if err != nil {
		return nil, err
	}

	s.enqueueInsights(repoUUID, "repo_forked")

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
	repo, err := s.repoStore.FindPublicByOwnerAndName(ownerUsername, repoName)
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
func (s *RepoService) UploadPack(repoID uuid.UUID, requestPayload output.ByteReader,
	responseWriter output.ByteWriter) error {

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	return s.gitManager.UploadPack(repoPath, requestPayload, responseWriter)
}

func (s *RepoService) UploadPackByOwnerAndName(ownerUsername string, repoName string,
	requestPayload output.ByteReader, responseWriter output.ByteWriter) error {

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return err
	}

	return s.gitManager.UploadPack(repoPath, requestPayload, responseWriter)
}

// Deprecated: repo_id receive-pack path is legacy and not publicly exposed.
func (s *RepoService) ReceivePack(repoID uuid.UUID, requestPayload output.ByteReader,
	responseWriter output.ByteWriter) error {

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

func (s *RepoService) emitPushEvents(repoID, requesterID uuid.UUID, repoPath string, before, after map[string]string) {
	if s.repoEventUseCase == nil {
		return
	}

	// Deleted branches
	for name := range before {
		if _, exists := after[name]; !exists {
			payload := fmt.Sprintf(`{"ref": "%s"}`, name)
			s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeBranchDeletion, payload)
		}
	}

	// Created or Updated branches
	for name, hashAfter := range after {
		hashBefore, exists := before[name]
		if !exists {
			payload := fmt.Sprintf(`{"ref": "%s", "hash": "%s"}`, name, hashAfter)
			s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeBranchCreation, payload)
		} else if hashBefore != hashAfter {
			payload := fmt.Sprintf(`{"ref": "%s", "old_hash": "%s", "new_hash": "%s"}`, name, hashBefore, hashAfter)
			s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeDirectPush, payload)
		}
	}
}

func (s *RepoService) ReceivePackByOwnerAndName(requesterID uuid.UUID, ownerUsername string, repoName string,
	requestPayload output.ByteReader, responseWriter output.ByteWriter) error {

	repoPath, err := s.resolveRepoPathByOwnerAndName(ownerUsername, repoName)
	if err != nil {
		return err
	}

	branchesBefore, _ := s.gitManager.GetBranches(repoPath)
	beforeMap := make(map[string]string)
	for _, b := range branchesBefore {
		beforeMap[b.Name] = b.CommitHash
	}

	if err := s.gitManager.ReceivePack(repoPath, requestPayload, responseWriter); err != nil {
		return err
	}

	repo, err := s.repoStore.FindByOwnerAndName(ownerUsername, repoName)
	if err == nil && repo != nil {
		if repoUUID, parseErr := uuid.Parse(repo.ID); parseErr == nil {
			branchesAfter, _ := s.gitManager.GetBranches(repoPath)
			afterMap := make(map[string]string)
			for _, b := range branchesAfter {
				afterMap[b.Name] = b.CommitHash
			}
			s.emitPushEvents(repoUUID, requesterID, repoPath, beforeMap, afterMap)
			s.enqueueInsights(repoUUID, "receive_pack_public")
		}
	}

	return nil
}

func (s *RepoService) GetAllRepositories(requesterID uuid.UUID) ([]*domain.Repo, error) {
	repos, err := s.repoStore.FindVisibleToUser(requesterID)
	if err != nil {
		return nil, err
	}

	for _, repo := range repos {
		if repo == nil {
			continue
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

func (s *RepoService) GetRepositoryByID(repoID uuid.UUID) (*domain.Repo, error) {
	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return nil, err
	}
	return repo, nil
}

func (s *RepoService) CountOwnedRepositories(requesterID uuid.UUID) (int, error) {
	return s.repoStore.CountOwnedByUser(requesterID)
}

func (s *RepoService) requireOwner(repoID uuid.UUID, requesterID uuid.UUID) error {
	role, err := s.collabStore.GetRole(repoID, requesterID)
	if err != nil {
		return errors.New("failed to verify requester permissions")
	}
	if role != domain.CollaboratorRoleOwner {
		return errors.New("unauthorized: only repository owners can perform this action")
	}

	return nil
}

func (s *RepoService) UpdateRepositoryVisibility(repoID uuid.UUID, requesterID uuid.UUID,
	visibility domain.RepoVisibility) (*domain.Repo, error) {

	if err := domain.ValidateRepoVisibility(visibility); err != nil {
		return nil, err
	}
	if visibility == "" {
		return nil, errors.New("visibility is required")
	}
	if err := s.requireOwner(repoID, requesterID); err != nil {
		return nil, err
	}

	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return nil, err
	}
	if repo == nil {
		return nil, errors.New("repository not found")
	}

	if err := s.repoStore.UpdateVisibility(repoID, visibility); err != nil {
		return nil, err
	}

	repo.Visibility = visibility
	return repo, nil
}

func (s *RepoService) UpdateRepositoryDetails(repoID uuid.UUID, requesterID uuid.UUID,
	description string, website string, topics []string) (*domain.Repo, error) {

	// For editing repo details, we require owner permissions
	// (or maintainer if that role existed, but currently we only have requireOwner check here)
	if err := s.requireOwner(repoID, requesterID); err != nil {
		return nil, err
	}

	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return nil, err
	}
	if repo == nil {
		return nil, errors.New("repository not found")
	}

	if err := s.repoStore.UpdateDetails(repoID, description, website, topics); err != nil {
		return nil, err
	}

	repo.Description = description
	repo.Website = website
	repo.Topics = topics
	return repo, nil
}

func (s *RepoService) RenameRepository(repoID uuid.UUID, requesterID uuid.UUID,
	newName string) (*domain.Repo, error) {

	if err := domain.ValidateRepoName(newName); err != nil {
		return nil, err
	}
	if err := s.requireOwner(repoID, requesterID); err != nil {
		return nil, err
	}

	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return nil, err
	}
	if repo == nil {
		return nil, errors.New("repository not found")
	}

	newName = strings.TrimSpace(newName)
	if newName == repo.Name {
		return repo, nil
	}

	newPath, err := s.gitManager.RenameRepository(repo.Path, newName)
	if err != nil {
		return nil, err
	}

	if err := s.repoStore.RenameByID(repoID, newName, newPath); err != nil {
		// Best-effort rollback of the on-disk rename so DB and disk stay consistent.
		_, _ = s.gitManager.RenameRepository(newPath, repo.Name)
		return nil, err
	}

	repo.Name = newName
	repo.Path = newPath
	return repo, nil
}

func (s *RepoService) DeleteRepository(repoID uuid.UUID, requesterID uuid.UUID) error {
	if err := s.requireOwner(repoID, requesterID); err != nil {
		return err
	}

	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return err
	}
	if repo == nil {
		return errors.New("repository not found")
	}

	if err := s.repoStore.DeleteByID(repoID); err != nil {
		return err
	}

	return s.gitManager.DeleteRepository(repo.Path)
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

func (s *RepoService) GetRepoCommits(repoID uuid.UUID, branch string, path string, limit int, offset int) (domain.CommitPage, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return domain.CommitPage{}, err
	}

	return s.gitManager.GetCommits(repoPath, branch, path, limit, offset)
}

func (s *RepoService) GetCommitStats(repoID uuid.UUID, branch string, path string) (domain.CommitStats, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return domain.CommitStats{}, err
	}

	return s.gitManager.GetCommitStats(repoPath, branch, path)
}

func (s *RepoService) GetRepoCommitsBatch(repoID uuid.UUID, branch string, paths []string) (map[string]*domain.Commit, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetCommitsBatch(repoPath, branch, paths)
}

func (s *RepoService) GetCommitDetail(repoID uuid.UUID, commitHash string) (*domain.Commit, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}
	return s.gitManager.GetCommitDetail(repoPath, commitHash)
}

func (s *RepoService) GetCommitDiff(repoID uuid.UUID, commitHash string) ([]domain.DiffFile, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}
	return s.gitManager.GetCommitDiff(repoPath, commitHash)
}

func (s *RepoService) GetRepoBranches(repoID uuid.UUID) ([]domain.Branch, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	return s.gitManager.GetBranches(repoPath)
}

func (s *RepoService) CreateRepoBranch(repoID uuid.UUID, requesterID uuid.UUID, newBranch string, fromBranch string) (*domain.Branch, error) {
	if err := domain.ValidateBranchName(newBranch); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	b, err := s.gitManager.CreateBranch(repoPath, newBranch, fromBranch)
	if err == nil && s.repoEventUseCase != nil {
		payload := fmt.Sprintf(`{"ref": "%s", "hash": "%s"}`, newBranch, b.CommitHash)
		s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeBranchCreation, payload)
	}
	return b, err
}

func (s *RepoService) RenameRepoBranch(repoID uuid.UUID, requesterID uuid.UUID, oldBranch string, newBranch string) (*domain.Branch, error) {
	if err := domain.ValidateBranchName(oldBranch); err != nil {
		return nil, err
	}
	if err := domain.ValidateBranchName(newBranch); err != nil {
		return nil, err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	b, err := s.gitManager.RenameBranch(repoPath, oldBranch, newBranch)
	if err == nil && s.repoEventUseCase != nil {
		// Just log creation of new branch and deletion of old branch
		s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeBranchDeletion, fmt.Sprintf(`{"ref": "%s"}`, oldBranch))
		s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeBranchCreation, fmt.Sprintf(`{"ref": "%s", "hash": "%s"}`, newBranch, b.CommitHash))
	}
	return b, err
}

func (s *RepoService) DeleteRepoBranch(repoID uuid.UUID, requesterID uuid.UUID, branchName string) error {
	if err := domain.ValidateBranchName(branchName); err != nil {
		return err
	}

	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return err
	}

	err = s.gitManager.DeleteBranch(repoPath, branchName)
	if err == nil && s.repoEventUseCase != nil {
		s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeBranchDeletion, fmt.Sprintf(`{"ref": "%s"}`, branchName))
	}
	return err
}

type repoCommitContext struct {
	RepoPath    string
	AuthorName  string
	AuthorEmail string
}

func (s *RepoService) resolveRepoCommitContext(repoID uuid.UUID, requesterID uuid.UUID) (*repoCommitContext, error) {
	repoPath, err := s.resolveRepoPath(repoID)
	if err != nil {
		return nil, err
	}

	user, err := s.userStore.GetUserByID(requesterID)
	if err != nil || user == nil {
		return nil, errors.New("requester user not found")
	}

	return &repoCommitContext{
		RepoPath:    repoPath,
		AuthorName:  user.Username,
		AuthorEmail: user.Email,
	}, nil
}

func (s *RepoService) CommitFileChange(repoID uuid.UUID, requesterID uuid.UUID,
	branch string, filePath string, oldFilePath string, content string, commitMessage string) error {
	if err := domain.ValidateCommitFileChangeInput(branch, filePath,
		commitMessage); err != nil {

		return err
	}

	ctx, err := s.resolveRepoCommitContext(repoID, requesterID)
	if err != nil {
		return err
	}

	if err := s.gitManager.CommitFileChange(ctx.RepoPath, branch, filePath, oldFilePath, content,
		ctx.AuthorName, ctx.AuthorEmail, commitMessage); err != nil {
		return err
	}

	if s.repoEventUseCase != nil {
		b, _ := s.gitManager.GetBranches(ctx.RepoPath)
		var hash string
		for _, branchObj := range b {
			if branchObj.Name == branch {
				hash = branchObj.CommitHash
			}
		}
		s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeDirectPush, fmt.Sprintf(`{"ref": "%s", "new_hash": "%s", "commit_message": "%s"}`, branch, hash, commitMessage))
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
		ctx.AuthorName, ctx.AuthorEmail, commitMessage); err != nil {
		return err
	}

	if s.repoEventUseCase != nil {
		b, _ := s.gitManager.GetBranches(ctx.RepoPath)
		var hash string
		for _, branchObj := range b {
			if branchObj.Name == branch {
				hash = branchObj.CommitHash
			}
		}
		s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeDirectPush, fmt.Sprintf(`{"ref": "%s", "new_hash": "%s", "commit_message": "%s"}`, branch, hash, commitMessage))
	}

	s.enqueueInsights(repoID, "commit_files_change")

	return nil
}

func (s *RepoService) DeletePath(repoID uuid.UUID, requesterID uuid.UUID,
	branch string, path string, commitMessage string) error {
	if branch == "" || path == "" || commitMessage == "" {
		return errors.New("branch, path, and commitMessage are required")
	}

	ctx, err := s.resolveRepoCommitContext(repoID, requesterID)
	if err != nil {
		return err
	}

	if err := s.gitManager.DeletePath(ctx.RepoPath, branch, path,
		ctx.AuthorName, ctx.AuthorEmail, commitMessage); err != nil {
		return err
	}

	if s.repoEventUseCase != nil {
		b, _ := s.gitManager.GetBranches(ctx.RepoPath)
		var hash string
		for _, branchObj := range b {
			if branchObj.Name == branch {
				hash = branchObj.CommitHash
			}
		}
		s.repoEventUseCase.LogEvent(repoID, requesterID, domain.EventTypeDirectPush, fmt.Sprintf(`{"ref": "%s", "new_hash": "%s", "commit_message": "%s"}`, branch, hash, commitMessage))
	}

	s.enqueueInsights(repoID, "delete_path")

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
