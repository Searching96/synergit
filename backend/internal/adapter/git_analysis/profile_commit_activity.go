package git_analysis

import (
	"context"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"synergit/internal/core/domain"
	"time"

	git "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
)

const profileActivityLookbackDays = 365

func (c *RepoInsightsMetricComputer) ComputeProfileCommitActivity(ctx context.Context,
	repos []*domain.Repo, authorName string, year int, now time.Time) (*domain.ProfileCommitActivity, error) {

	nowUTC := now.UTC()
	if nowUTC.IsZero() {
		nowUTC = time.Now().UTC()
	}

	author := strings.TrimSpace(authorName)
	since := nowUTC.AddDate(0, 0, -(profileActivityLookbackDays - 1))

	byDate := make(map[string]int)
	availableYearSet := make(map[int]struct{})
	repoCommitCount := make(map[string]int)
	commitsLast365 := 0

	for _, repo := range repos {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		if repo == nil {
			continue
		}

		repoPath := strings.TrimSpace(repo.Path)
		if repoPath == "" {
			continue
		}

		err := collectProfileRepositoryStats(
			ctx,
			repoPath,
			profileRepositoryDisplayName(repo),
			author,
			since,
			nowUTC,
			byDate,
			availableYearSet,
			repoCommitCount,
			&commitsLast365,
		)
		if err != nil {
			if errorsIsContextCancellation(ctx, err) {
				return nil, err
			}
			continue
		}
	}

	availableYears := make([]int, 0, len(availableYearSet))
	for y := range availableYearSet {
		availableYears = append(availableYears, y)
	}
	sort.Ints(availableYears)

	selectedYear := year
	if selectedYear <= 0 {
		if len(availableYears) > 0 {
			selectedYear = availableYears[len(availableYears)-1]
		} else {
			selectedYear = nowUTC.Year()
		}
	}

	contributionDays := make([]domain.ProfileContributionDay, 0)
	totalContributions := 0
	selectedYearPrefix := strconv.Itoa(selectedYear) + "-"

	contributionDates := make([]string, 0)
	for date := range byDate {
		if strings.HasPrefix(date, selectedYearPrefix) {
			contributionDates = append(contributionDates, date)
		}
	}
	sort.Strings(contributionDates)

	for _, date := range contributionDates {
		count := byDate[date]
		totalContributions += count
		contributionDays = append(contributionDays, domain.ProfileContributionDay{
			Date:        date,
			CommitCount: count,
		})
	}

	repoContributions := make([]domain.ProfileRepoContribution, 0, len(repoCommitCount))
	for repository, count := range repoCommitCount {
		repoContributions = append(repoContributions, domain.ProfileRepoContribution{
			Repository:  repository,
			CommitCount: count,
		})
	}

	sort.Slice(repoContributions, func(i, j int) bool {
		if repoContributions[i].CommitCount == repoContributions[j].CommitCount {
			return repoContributions[i].Repository < repoContributions[j].Repository
		}
		return repoContributions[i].CommitCount > repoContributions[j].CommitCount
	})

	topRepositories := repoContributions
	otherRepoCount := 0
	if len(topRepositories) > 3 {
		topRepositories = topRepositories[:3]
		otherRepoCount = len(repoContributions) - len(topRepositories)
	}

	return &domain.ProfileCommitActivity{
		SelectedYear:       selectedYear,
		AvailableYears:     availableYears,
		ContributionDays:   contributionDays,
		TotalContributions: totalContributions,
		TopRepositories:    topRepositories,
		OtherRepoCount:     otherRepoCount,
		CommitsLast365Days: commitsLast365,
	}, nil
}

func collectProfileRepositoryStats(
	ctx context.Context,
	repoPath string,
	repositoryName string,
	author string,
	since time.Time,
	now time.Time,
	byDate map[string]int,
	availableYears map[int]struct{},
	repoCommitCount map[string]int,
	commitsLast365 *int,
) error {
	repository, err := git.PlainOpen(repoPath)
	if err != nil {
		return err
	}

	ref, err := resolvePreferredBranchReference(repository, "")
	if err != nil {
		return err
	}

	iter, err := repository.Log(&git.LogOptions{From: ref.Hash()})
	if err != nil {
		return err
	}
	defer iter.Close()

	return iter.ForEach(func(commit *object.Commit) error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if commit == nil || !profileAuthorMatches(author, commit.Author.Name, commit.Author.Email) {
			return nil
		}

		commitDate := commit.Author.When.UTC()
		dateKey := commitDate.Format("2006-01-02")

		byDate[dateKey]++
		availableYears[commitDate.Year()] = struct{}{}

		if !commitDate.Before(since) && !commitDate.After(now) {
			(*commitsLast365)++
			repoCommitCount[repositoryName]++
		}

		return nil
	})
}

func profileRepositoryDisplayName(repo *domain.Repo) string {
	if repo == nil {
		return "unknown"
	}

	pathValue := filepath.ToSlash(strings.TrimSpace(repo.Path))
	pathValue = strings.TrimSuffix(pathValue, "/")
	if strings.HasSuffix(strings.ToLower(pathValue), ".git") {
		pathValue = pathValue[:len(pathValue)-4]
	}

	pathParts := strings.Split(pathValue, "/")
	cleanParts := make([]string, 0, len(pathParts))
	for _, part := range pathParts {
		part = strings.TrimSpace(part)
		if part != "" {
			cleanParts = append(cleanParts, part)
		}
	}

	if len(cleanParts) >= 2 {
		return cleanParts[len(cleanParts)-2] + "/" + cleanParts[len(cleanParts)-1]
	}

	if name := strings.TrimSpace(repo.Name); name != "" {
		return name
	}

	if pathValue != "" {
		return filepath.Base(pathValue)
	}

	return "unknown"
}

func profileAuthorMatches(authorTarget string, commitAuthor string, commitEmail string) bool {
	trimmedTarget := strings.TrimSpace(authorTarget)
	trimmedAuthor := strings.TrimSpace(commitAuthor)
	trimmedEmail := strings.TrimSpace(commitEmail)

	if trimmedTarget == "" {
		return false
	}

	if strings.EqualFold(trimmedTarget, trimmedAuthor) {
		return true
	}

	if trimmedEmail == "" {
		return false
	}

	emailParts := strings.SplitN(trimmedEmail, "@", 2)
	if len(emailParts) > 0 && strings.EqualFold(trimmedTarget, strings.TrimSpace(emailParts[0])) {
		return true
	}

	return false
}

func errorsIsContextCancellation(ctx context.Context, err error) bool {
	if err == nil {
		return false
	}

	if ctx.Err() != nil {
		return true
	}

	return strings.Contains(strings.ToLower(err.Error()), "context canceled") ||
		strings.Contains(strings.ToLower(err.Error()), "deadline exceeded")
}
