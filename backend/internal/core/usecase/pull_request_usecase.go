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
	if sourceBranch == targetBranch {
		return nil, errors.New("source and target branches cannot be the same")
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
	if err != nil || (role != "OWNER" && role != "MAINTAINER" && role != "WRITE") {
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

	repoPRs, err := s.prStore.ListByRepo(pr.RepoID)
	if err != nil {
		return errors.New("failed to get pull request list")
	}

	mergerName := merger.Username
	prNumber := len(repoPRs) + 1
	commitMessage := fmt.Sprintf("Merge branch '%s' into '%s' (PR #%d)", pr.SourceBranch, pr.TargetBranch, prNumber)

	// 4. Perform the actual Git merge on the server filesystem
	err = s.gitManager.MergeBranches(repo.Name, pr.SourceBranch,
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
	if err != nil || (role != "OWNER" && role != "MAINTAINER" && role != "WRITE") {
		return errors.New("unauthorized: you do not have permission to close this pull request")
	}

	return s.prStore.UpdateStatus(prID, domain.PullRequestStatusClosed)
}
