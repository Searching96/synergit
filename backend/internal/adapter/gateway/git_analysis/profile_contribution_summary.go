package git_analysis

import (
	"context"
	"sort"
	"synergit/internal/core/domain"
	"time"

	"github.com/google/uuid"
)

func (c *RepoInsightsMetricComputer) ComputeProfileContributionSummary(
	ctx context.Context,
	commitDays []domain.ProfileContributionDay,
	issues []domain.Issue,
	pullRequests []domain.PullRequest,
	requesterID uuid.UUID,
	selectedYear int,
	now time.Time,
) ([]domain.ProfileContributionDay, int, int, int, error) {
	nowUTC := now.UTC()
	if nowUTC.IsZero() {
		nowUTC = time.Now().UTC()
	}

	since := nowUTC.AddDate(0, 0, -(profileActivityLookbackDays - 1))

	countByDate := make(map[string]int, len(commitDays))
	for _, day := range commitDays {
		select {
		case <-ctx.Done():
			return nil, 0, 0, 0, ctx.Err()
		default:
		}

		if day.CommitCount <= 0 {
			continue
		}
		countByDate[day.Date] += day.CommitCount
	}

	issuesCount := 0
	for _, issue := range issues {
		select {
		case <-ctx.Done():
			return nil, 0, 0, 0, ctx.Err()
		default:
		}

		if issue.CreatorID != requesterID {
			continue
		}

		if isProfileTimeInRange(issue.CreatedAt, since, nowUTC) {
			issuesCount++
		}

		if shouldCountProfileContributionDay(issue.CreatedAt, selectedYear, since, nowUTC) {
			dateKey := issue.CreatedAt.UTC().Format("2006-01-02")
			countByDate[dateKey]++
		}
	}

	pullRequestsCount := 0
	for _, pullRequest := range pullRequests {
		select {
		case <-ctx.Done():
			return nil, 0, 0, 0, ctx.Err()
		default:
		}

		if pullRequest.CreatorID != requesterID {
			continue
		}

		if isProfileTimeInRange(pullRequest.CreatedAt, since, nowUTC) {
			pullRequestsCount++
		}

		if shouldCountProfileContributionDay(pullRequest.CreatedAt, selectedYear, since, nowUTC) {
			dateKey := pullRequest.CreatedAt.UTC().Format("2006-01-02")
			countByDate[dateKey]++
		}
	}

	if len(countByDate) == 0 {
		return []domain.ProfileContributionDay{}, 0, issuesCount, pullRequestsCount, nil
	}

	dates := make([]string, 0, len(countByDate))
	for date := range countByDate {
		dates = append(dates, date)
	}
	sort.Strings(dates)

	merged := make([]domain.ProfileContributionDay, 0, len(dates))
	total := 0
	for _, date := range dates {
		count := countByDate[date]
		total += count
		merged = append(merged, domain.ProfileContributionDay{
			Date:        date,
			CommitCount: count,
		})
	}

	return merged, total, issuesCount, pullRequestsCount, nil
}

func shouldCountProfileContributionDay(value time.Time, selectedYear int, since time.Time, until time.Time) bool {
	valueUTC := value.UTC()
	if selectedYear == 0 {
		return isProfileTimeInRange(valueUTC, since, until)
	}

	return valueUTC.Year() == selectedYear
}

func isProfileTimeInRange(value time.Time, since time.Time, until time.Time) bool {
	valueUTC := value.UTC()
	return (valueUTC.After(since) || valueUTC.Equal(since)) &&
		(valueUTC.Before(until) || valueUTC.Equal(until))
}
