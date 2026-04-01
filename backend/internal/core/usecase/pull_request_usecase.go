package usecase

import (
	"errors"
	"fmt"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	"github.com/google/uuid"
)

type PullRequestService struct {
	prStore     port.PullRequestRepository
	collabStore port.CollaboratorRepository
	gitManager  port.GitManager
	userStore   port.UserRepository

	// We need this to get the repository's string name for the GitManager
	repoStore port.RepoRepository
}

func (s *PullRequestService) resolvePRNumber(repoID uuid.UUID, prID uuid.UUID) (int, error) {
	sequenceNumber, err := s.prStore.GetSequenceNumber(repoID, prID)
	if err != nil {
		return 0, errors.New("failed to get pull request number")
	}

	return sequenceNumber, nil
}

func NewPullRequestService(prStore port.PullRequestRepository,
	collabStore port.CollaboratorRepository,
	gitManager port.GitManager,
	repoStore port.RepoRepository,
	userStore port.UserRepository,
) *PullRequestService {
	return &PullRequestService{
		prStore:     prStore,
		collabStore: collabStore,
		gitManager:  gitManager,
		repoStore:   repoStore,
		userStore:   userStore,
	}
}

func (s *PullRequestService) CreatePullRequest(
	repoID uuid.UUID, creatorID uuid.UUID, title string,
	description string, sourceBranch string, targetBranch string,
) (*domain.PullRequest, error) {
	if err := domain.ValidateCreatePullRequestInput(title, sourceBranch,
		targetBranch); err != nil {

		return nil, err
	}

	pr := &domain.PullRequest{
		ID:           uuid.New(),
		RepoID:       repoID,
		CreatorID:    creatorID,
		Title:        title,
		Description:  description,
		SourceBranch: sourceBranch,
		TargetBranch: targetBranch,
		Status:       domain.PullRequestStatusOpen,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	err := s.prStore.Create(pr)
	if err != nil {
		return nil, err
	}

	return pr, nil
}

func (s *PullRequestService) GetPullRequest(id uuid.UUID) (*domain.PullRequest, error) {
	return s.prStore.GetByID(id)
}

func (s *PullRequestService) ListPullRequestsForRepo(repoID uuid.UUID) ([]domain.PullRequest, error) {
	return s.prStore.ListByRepo(repoID)
}

func (s *PullRequestService) MergePullRequest(prID uuid.UUID, mergerID uuid.UUID) error {
	// 1. Fetch the PR
	pr, err := s.prStore.GetByID(prID)
	if err != nil || pr == nil {
		return errors.New("pull request not found")
	}

	if pr.Status != domain.PullRequestStatusOpen {
		return errors.New("only open pull requests can be merged")
	}

	// 2. Check permissions (Must be OWNER, MAINTAINER, or WRITE)
	role, err := s.collabStore.GetRole(pr.RepoID, mergerID)
	if err != nil || !role.CanWrite() {
		return errors.New("unauthorized: you do not have permission to merge in this repo")
	}

	// 3. Fetch the repository name for the GitManager
	repo, err := s.repoStore.FindByID(pr.RepoID)
	if err != nil || repo == nil {
		return errors.New("repository not found")
	}

	merger, err := s.userStore.GetUserByID(mergerID)
	if err != nil || merger == nil {
		return errors.New("merger user not found")
	}

	mergerName := merger.Username
	prNumber, err := s.resolvePRNumber(pr.RepoID, pr.ID)
	if err != nil {
		return err
	}
	commitMessage := fmt.Sprintf("Merge branch '%s' into '%s' (PR #%d)", pr.SourceBranch, pr.TargetBranch, prNumber)

	// 4. Perform the actual Git merge on the server filesystem
	err = s.gitManager.MergeBranches(repo.Path, pr.SourceBranch,
		pr.TargetBranch, mergerName, commitMessage)
	if err != nil {
		return errors.New("failed to merge branches")
	}

	// 5. Update the database status
	return s.prStore.UpdateStatus(prID, domain.PullRequestStatusMerged)
}

func (s *PullRequestService) ClosePullRequest(prID uuid.UUID, closerID uuid.UUID) error {
	// 1. Fetch the PR
	pr, err := s.prStore.GetByID(prID)
	if err != nil || pr == nil {
		return errors.New("pull request not found")
	}

	if pr.Status != domain.PullRequestStatusOpen {
		return errors.New("only open pull requests can be closed")
	}

	// 2. Check permissions
	// Only the creator, OWNER, or MAINTAINER can close a PR without merging
	role, err := s.collabStore.GetRole(pr.RepoID, closerID)
	if err != nil || !role.CanWrite() {
		return errors.New("unauthorized: you do not have permission to close this pull request")
	}

	return s.prStore.UpdateStatus(prID, domain.PullRequestStatusClosed)
}

func (s *PullRequestService) GetMergeConflicts(prID uuid.UUID,
	requesterID uuid.UUID) ([]domain.ConflictFile, error) {

	// 1. Fetch the PR
	pr, err := s.prStore.GetByID(prID)
	if err != nil || pr == nil {
		return nil, errors.New("pull request not found")
	}

	// 2. Optional: Verify they are at least a collaborator on the repo
	role, err := s.collabStore.GetRole(pr.RepoID, requesterID)
	if err != nil || !role.IsValid() {
		return nil, errors.New("unauthorized: you do not have access to this repo")
	}

	// 3. Get repo name
	repo, err := s.repoStore.FindByID(pr.RepoID)
	if err != nil || repo == nil {
		return nil, errors.New("repository not found")
	}

	// 4. Fetch the list of conflicting files from Git
	files, err := s.gitManager.GetConflictingFiles(repo.Path, pr.SourceBranch,
		pr.TargetBranch)
	if err != nil {
		return nil, fmt.Errorf("failed to get conflicting files: %w", err)
	}

	// 5. Fetch the raw content with conflict markers for each file
	conflicts := []domain.ConflictFile{}
	for _, file := range files {
		content, err := s.gitManager.GetConflictContent(repo.Path, pr.SourceBranch,
			pr.TargetBranch, file)
		if err != nil {
			return nil, fmt.Errorf("failed to get conflict content for file %s: %w",
				file, err)
		}

		conflicts = append(conflicts, domain.ConflictFile{
			Path:    file,
			Content: content,
		})
	}

	return conflicts, nil
}

func (s *PullRequestService) ResolveConflicts(prID uuid.UUID, requesterID uuid.UUID,
	commitMessage string, resolutions []domain.ConflictResolution) error {
	if err := domain.ValidateConflictResolutions(resolutions); err != nil {
		return err
	}

	// 1. Fetch the PR
	pr, err := s.prStore.GetByID(prID)
	if err != nil || pr == nil {
		return errors.New("pull request not found")
	}

	if pr.Status != domain.PullRequestStatusOpen {
		return errors.New("only open pull requests can have conflicts resolved")
	}

	// 2. Verify Permissions (Must be PR Creator, or have WRITE/MAINTAINER/OWNER)
	role, err := s.collabStore.GetRole(pr.RepoID, requesterID)
	if pr.CreatorID != requesterID && !role.CanWrite() {

		return errors.New(
			"unauthorized: you do not have permission to resolve conflicts for this repo",
		)
	}

	// 3. Get repo name
	repo, err := s.repoStore.FindByID(pr.RepoID)
	if err != nil || repo == nil {
		return errors.New("repository not found")
	}

	// 4. Get user details for the Git commit
	resolverName := ""
	user, err := s.userStore.GetUserByID(requesterID)
	if err == nil && user != nil {
		resolverName = user.Username
	}
	if resolverName == "" {
		return errors.New("resolver user not found")
	}

	// Default commit message if none provided
	if commitMessage == "" {
		prNumber, err := s.resolvePRNumber(pr.RepoID, pr.ID)
		if err != nil {
			return err
		}
		commitMessage = fmt.Sprintf("Resolve merge conflicts for PR #%d", prNumber)
	}

	// 5. Execute the Git operation
	err = s.gitManager.ResolveConflictsAndCommit(repo.Path, pr.SourceBranch,
		pr.TargetBranch, resolverName, commitMessage, resolutions)
	if err != nil {
		return fmt.Errorf("failed to resolve conflicts: %w", err)
	}

	return nil
}
