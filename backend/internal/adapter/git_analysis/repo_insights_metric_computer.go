package git_analysis

import (
	"context"
	"sort"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
)

var _ port.RepoInsightsMetricComputer = (*RepoInsightsMetricComputer)(nil)

type RepoInsightsMetricComputer struct{}

func NewRepoInsightsMetricComputer() *RepoInsightsMetricComputer {
	return &RepoInsightsMetricComputer{}
}

func (c *RepoInsightsMetricComputer) ComputeCommitTrend(ctx context.Context,
	commitsByHash map[string]domain.Commit) ([]domain.CommitTrendPoint, error) {

	byDay := map[string]int{}
	for _, commit := range commitsByHash {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		day := commit.Date.UTC().Format("2006-01-02")
		byDay[day]++
	}

	days := make([]string, 0, len(byDay))
	for day := range byDay {
		days = append(days, day)
	}
	sort.Strings(days)

	points := make([]domain.CommitTrendPoint, 0, len(days))
	for _, day := range days {
		points = append(points, domain.CommitTrendPoint{
			Date:        day,
			CommitCount: byDay[day],
		})
	}

	return points, nil
}

func (c *RepoInsightsMetricComputer) ComputeTopContributors(ctx context.Context,
	commitsByHash map[string]domain.Commit) ([]domain.ContributorStat, error) {

	byAuthor := map[string]int{}

	for _, commit := range commitsByHash {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		author := strings.TrimSpace(commit.Author)
		if author == "" {
			author = "Unknown"
		}
		byAuthor[author]++
	}

	stats := make([]domain.ContributorStat, 0, len(byAuthor))
	for author, count := range byAuthor {
		stats = append(stats, domain.ContributorStat{
			AuthorName:  author,
			CommitCount: count,
		})
	}

	sort.Slice(stats, func(i int, j int) bool {
		if stats[i].CommitCount == stats[j].CommitCount {
			return stats[i].AuthorName < stats[j].AuthorName
		}
		return stats[i].CommitCount > stats[j].CommitCount
	})

	if len(stats) > 5 {
		stats = stats[:5]
	}

	return stats, nil
}

func (c *RepoInsightsMetricComputer) ComputeBranchActivity(ctx context.Context,
	commitsByBranch map[string][]domain.Commit) ([]domain.BranchActivityStat, error) {

	stats := make([]domain.BranchActivityStat, 0, len(commitsByBranch))

	for branchName, commits := range commitsByBranch {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		stats = append(stats, domain.BranchActivityStat{
			BranchName:  branchName,
			CommitCount: len(commits),
		})
	}

	sort.Slice(stats, func(i int, j int) bool {
		if stats[i].CommitCount == stats[j].CommitCount {
			return stats[i].BranchName < stats[j].BranchName
		}
		return stats[i].CommitCount > stats[j].CommitCount
	})

	return stats, nil
}

func (c *RepoInsightsMetricComputer) ComputeLanguageBreakdown(ctx context.Context,
	repoPath string, preferredBranch string) (string, []domain.LanguageStat, error) {

	select {
	case <-ctx.Done():
		return "", nil, ctx.Err()
	default:
	}

	return AnalyzeLanguageBreakdown(repoPath, preferredBranch)
}
