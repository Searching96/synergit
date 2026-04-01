package usecase

import (
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.RepoInsightsUsecase = (*RepoInsightsService)(nil)

type RepoInsightsService struct {
	insightsStore port.RepoInsightsRepository
	repoStore     port.RepoRepository
	collabStore   port.CollaboratorRepository
	gitManager    port.GitManager
}

func NewRepoInsightsService(
	insightsStore port.RepoInsightsRepository,
	repoStore port.RepoRepository,
	collabStore port.CollaboratorRepository,
	gitManager port.GitManager,
) *RepoInsightsService {
	return &RepoInsightsService{
		insightsStore: insightsStore,
		repoStore:     repoStore,
		collabStore:   collabStore,
		gitManager:    gitManager,
	}
}

func (s *RepoInsightsService) GetLastestInsights(
	repoID uuid.UUID,
	requesterID uuid.UUID,
) (*domain.RepoInsightsSnapshot, error) {
	role, err := s.collabStore.GetRole(repoID, requesterID)
	if err != nil || !role.IsValid() {
		return nil, errors.New("unauthorized: you do not have access to this repo")
	}

	snapshot, err := s.insightsStore.GetLatestByRepoID(repoID)
	if err != nil {
		return nil, err
	}

	if snapshot == nil {
		return &domain.RepoInsightsSnapshot{
			RepoID:          repoID,
			CommitsLast30d:  0,
			CommitTrend:     []domain.CommitTrendPoint{},
			TopContributors: []domain.ContributorStat{},
			BranchActivity:  []domain.BranchActivityStat{},
		}, nil
	}

	return snapshot, nil
}

func (s *RepoInsightsService) EnqueueRecompute(repoID uuid.UUID, trigger string) error {
	return errors.New("not implemented")
}

func (s *RepoInsightsService) RecomputeNow(repoID uuid.UUID, trigger string) error {
	return errors.New("not implemented")
}
