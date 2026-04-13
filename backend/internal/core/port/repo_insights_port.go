package port

import (
	"context"
	"synergit/internal/core/domain"
	"time"

	"github.com/google/uuid"
)

type RepoInsightsRepository interface {
	SaveLatest(snapshot *domain.RepoInsightsSnapshot) error
	GetLatestByRepoID(repoID uuid.UUID) (*domain.RepoInsightsSnapshot, error)
}

type RepoInsightsScheduler interface {
	EnqueueRecompute(repoID uuid.UUID, trigger string) error
}

type RepoInsightsMetricComputer interface {
	ComputeCommitTrend(ctx context.Context,
		commitsByHash map[string]domain.Commit) ([]domain.CommitTrendPoint, error)
	ComputeTopContributors(ctx context.Context,
		commitsByHash map[string]domain.Commit) ([]domain.ContributorStat, error)
	ComputeBranchActivity(ctx context.Context,
		commitsByBranch map[string][]domain.Commit) ([]domain.BranchActivityStat, error)
	ComputeLanguageBreakdown(ctx context.Context,
		repoPath string, preferredBranch string) (string, []domain.LanguageStat, error)
	ComputeProfileCommitActivity(ctx context.Context,
		repos []*domain.Repo, authorName string, year int, now time.Time) (*domain.ProfileCommitActivity, error)
}

type RepoInsightsUseCase interface {
	RepoInsightsScheduler
	GetLatestInsights(repoID uuid.UUID, requesterID uuid.UUID) (*domain.RepoInsightsSnapshot, error)
	GetProfileActivity(requesterID uuid.UUID, year int) (*domain.ProfileActivitySnapshot, error)
	TriggerRecompute(repoID uuid.UUID, requesterID uuid.UUID, trigger string) error
	RecomputeNow(repoID uuid.UUID, trigger string) error
}
