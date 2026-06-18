package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"
	"time"

	"github.com/google/uuid"
)

var _ output.RepoInsightsUseCase = (*RepoInsightsService)(nil)

const (
	defaultInsightsWorkerCount = 4
	defaultInsightsQueueSize   = 128
)

type RepoInsightsService struct {
	insightsStore  output.RepoInsightsRepository
	repoStore      output.RepoRepository
	collabStore    output.CollaboratorRepository
	issueStore     output.IssueRepository
	pullStore      output.PullRequestRepository
	userStore      output.UserRepository
	gitManager     output.GitManager
	metricComputer output.RepoInsightsMetricComputer

	jobs chan insightsJob
}

type insightsJob struct {
	RepoID   uuid.UUID
	Trigger  string
	QueuedAt time.Time
}

type analysisInput struct {
	RepoPath        string
	DefaultBranch   string
	Since           time.Time
	CommitsByHash   map[string]domain.Commit
	CommitsByBranch map[string][]domain.Commit
}

type languageMetricResult struct {
	PrimaryLanguage string
	Breakdown       []domain.LanguageStat
}

type metricTask struct {
	Name string
	Run  func(context.Context, *analysisInput) (any, error)
}

type metricResult struct {
	Name  string
	Value any
	Err   error
}

func NewRepoInsightsService(
	insightsStore output.RepoInsightsRepository,
	repoStore output.RepoRepository,
	collabStore output.CollaboratorRepository,
	issueStore output.IssueRepository,
	pullStore output.PullRequestRepository,
	userStore output.UserRepository,
	gitManager output.GitManager,
	metricComputer output.RepoInsightsMetricComputer,
) *RepoInsightsService {
	s := &RepoInsightsService{
		insightsStore:  insightsStore,
		repoStore:      repoStore,
		collabStore:    collabStore,
		issueStore:     issueStore,
		pullStore:      pullStore,
		userStore:      userStore,
		gitManager:     gitManager,
		metricComputer: metricComputer,
		jobs:           make(chan insightsJob, defaultInsightsQueueSize),
	}

	s.startWorkers(defaultInsightsWorkerCount)

	return s
}

func (s *RepoInsightsService) GetProfileActivity(
	requesterID uuid.UUID,
	year int,
) (*domain.ProfileActivitySnapshot, error) {
	requester, err := s.userStore.GetUserByID(requesterID)
	if err != nil {
		return nil, err
	}
	if requester == nil {
		return nil, errors.New("user not found")
	}

	accessibleRepos, err := s.listAccessibleRepos(requesterID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	commitActivity, err := s.metricComputer.ComputeProfileCommitActivity(
		ctx,
		accessibleRepos,
		requester.Email,
		year,
		now,
	)
	if err != nil {
		return nil, err
	}

	issues, pullRequests, err := s.listProfileTickets(accessibleRepos)
	if err != nil {
		return nil, err
	}

	contributionDays, totalContributions, issuesCount, pullRequestsCount, err :=
		s.metricComputer.ComputeProfileContributionSummary(
			ctx,
			commitActivity.ContributionDays,
			issues,
			pullRequests,
			requesterID,
			commitActivity.SelectedYear,
			now,
		)
	if err != nil {
		return nil, err
	}

	availableYears := commitActivity.AvailableYears
	if availableYears == nil {
		availableYears = []int{}
	}

	topRepositories := commitActivity.TopRepositories
	if topRepositories == nil {
		topRepositories = []domain.ProfileRepoContribution{}
	}

	return &domain.ProfileActivitySnapshot{
		Username:           requester.Username,
		ComputedAt:         now,
		SelectedYear:       commitActivity.SelectedYear,
		AvailableYears:     availableYears,
		ContributionDays:   contributionDays,
		TotalContributions: totalContributions,
		ActivityChart: domain.ProfileActivityChart{
			Commits:      commitActivity.CommitsLast365Days,
			CodeReviews:  0,
			Issues:       issuesCount,
			PullRequests: pullRequestsCount,
		},
		ActivityOverview: domain.ProfileActivityOverview{
			TopRepositories:    topRepositories,
			OtherRepoCount:     commitActivity.OtherRepoCount,
			CommitsLast365Days: commitActivity.CommitsLast365Days,
		},
	}, nil
}

func (s *RepoInsightsService) startWorkers(workerCount int) {
	for i := 0; i < workerCount; i++ {
		go s.workerLoop(i + 1)
	}
}

func (s *RepoInsightsService) workerLoop(workerID int) {
	for job := range s.jobs {
		if err := s.RecomputeNow(job.RepoID, job.Trigger); err != nil {
			log.Printf("repo insights worker %d failed for repo %s: %v", workerID, job.RepoID, err)
		}
	}
}

func (s *RepoInsightsService) GetLatestInsights(
	repoID uuid.UUID,
	requesterID uuid.UUID,
) (*domain.RepoInsightsSnapshot, error) {
	if err := s.authorizeRepoAccess(repoID, requesterID); err != nil {
		return nil, err
	}

	snapshot, err := s.insightsStore.GetLatestByRepoID(repoID)
	if err != nil {
		return nil, err
	}

	if snapshot == nil {
		return &domain.RepoInsightsSnapshot{
			RepoID:            repoID,
			CommitsLast30d:    0,
			CommitTrend:       []domain.CommitTrendPoint{},
			TopContributors:   []domain.ContributorStat{},
			BranchActivity:    []domain.BranchActivityStat{},
			LanguageBreakdown: []domain.LanguageStat{},
		}, nil
	}

	return snapshot, nil
}

func (s *RepoInsightsService) GetPulse(
	repoID uuid.UUID,
	requesterID uuid.UUID,
	period string,
) (*domain.RepoPulseSnapshot, error) {
	if err := s.authorizeRepoAccess(repoID, requesterID); err != nil {
		return nil, err
	}

	normalizedPeriod := strings.TrimSpace(strings.ToLower(period))
	if normalizedPeriod == "" {
		normalizedPeriod = "1m"
	}
	window, periodLabel, ok := resolvePulsePeriod(normalizedPeriod)
	if !ok {
		return nil, errors.New("unsupported pulse period")
	}

	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return nil, err
	}
	if repo == nil {
		return nil, errors.New("repository not found")
	}

	now := time.Now().UTC()
	since := now.Add(-window)

	branches, err := s.gitManager.GetBranches(repo.Path)
	if err != nil {
		return nil, err
	}

	defaultBranch := resolveDefaultBranchName(branches)
	commitsByHash := map[string]domain.Commit{}
	defaultBranchCommits := []domain.Commit{}

	for _, branch := range branches {
		commitsPage, err := s.gitManager.GetCommits(repo.Path, branch.Name, "", 1000000, 0)
		if err != nil {
			return nil, err
		}

		filtered := filterNonMergeCommitsBetween(commitsPage.Commits, since, now)
		if branch.Name == defaultBranch {
			defaultBranchCommits = filtered
		}
		for _, commit := range filtered {
			commitsByHash[commit.Hash] = commit
		}
	}

	issues, err := s.issueStore.ListByRepo(repoID)
	if err != nil {
		return nil, err
	}
	pullRequests, err := s.pullStore.ListByRepo(repoID)
	if err != nil {
		return nil, err
	}

	filesChanged := map[string]struct{}{}
	additions := 0
	deletions := 0
	for _, commit := range defaultBranchCommits {
		diffFiles, err := s.gitManager.GetCommitDiff(repo.Path, commit.Hash)
		if err != nil {
			return nil, err
		}
		for _, file := range diffFiles {
			if strings.TrimSpace(file.Path) != "" {
				filesChanged[file.Path] = struct{}{}
			}
			additions += file.Additions
			deletions += file.Deletions
		}
	}

	topCommitters := buildPulseTopCommitters(commitsByHash)
	authorNames := map[string]struct{}{}
	for _, commit := range commitsByHash {
		author := strings.TrimSpace(commit.Author)
		if author == "" {
			author = "Unknown"
		}
		authorNames[author] = struct{}{}
	}

	return &domain.RepoPulseSnapshot{
		RepoID:        repoID,
		Period:        normalizedPeriod,
		PeriodLabel:   periodLabel,
		PeriodStart:   since,
		PeriodEnd:     now,
		DefaultBranch: defaultBranch,
		Overview:      buildPulseOverview(issues, pullRequests, since, now),
		Summary: domain.RepoPulseSummary{
			AuthorCount:              len(authorNames),
			DefaultBranchCommitCount: len(defaultBranchCommits),
			AllBranchCommitCount:     len(commitsByHash),
			FilesChanged:             len(filesChanged),
			Additions:                additions,
			Deletions:                deletions,
		},
		TopCommitters: topCommitters,
	}, nil
}

func resolvePulsePeriod(period string) (time.Duration, string, bool) {
	switch strings.TrimSpace(strings.ToLower(period)) {
	case "24h":
		return 24 * time.Hour, "24 hours", true
	case "3d":
		return 72 * time.Hour, "3 days", true
	case "1w":
		return 7 * 24 * time.Hour, "1 week", true
	case "1m":
		return 30 * 24 * time.Hour, "1 month", true
	default:
		return 0, "", false
	}
}

func (s *RepoInsightsService) GetContributors(
	repoID uuid.UUID,
	requesterID uuid.UUID,
	period string,
) (*domain.RepoContributorsSnapshot, error) {
	if err := s.authorizeRepoAccess(repoID, requesterID); err != nil {
		return nil, err
	}

	normalizedPeriod := strings.TrimSpace(strings.ToLower(period))
	if normalizedPeriod == "" {
		normalizedPeriod = "3m"
	}
	window, periodLabel, allTime, ok := resolveContributorsPeriod(normalizedPeriod)
	if !ok {
		return nil, errors.New("unsupported contributors period")
	}

	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return nil, err
	}
	if repo == nil {
		return nil, errors.New("repository not found")
	}

	branches, err := s.gitManager.GetBranches(repo.Path)
	if err != nil {
		return nil, err
	}
	defaultBranch := resolveDefaultBranchName(branches)
	if defaultBranch == "" {
		return &domain.RepoContributorsSnapshot{
			RepoID:        repoID,
			Period:        normalizedPeriod,
			PeriodLabel:   periodLabel,
			PeriodStart:   time.Now().UTC(),
			PeriodEnd:     time.Now().UTC(),
			DefaultBranch: defaultBranch,
			WeeklyTotals:  []domain.ContributionWeek{},
			DailyTotals:   []domain.ContributionDay{},
			Contributors:  []domain.ContributorContribution{},
		}, nil
	}

	now := time.Now().UTC()
	since := now.Add(-window)
	commitsPage, err := s.gitManager.GetCommits(repo.Path, defaultBranch, "", 1000000, 0)
	if err != nil {
		return nil, err
	}

	allContributionCommits := filterNonMergeCommits(commitsPage.Commits)
	navigatorSince := earliestCommitDate(allContributionCommits, now)

	commits := allContributionCommits
	if !allTime {
		commits = filterCommitsBetween(commits, since, now)
	}

	if allTime && len(commits) > 0 {
		since = earliestCommitDate(commits, now)
	}

	diffStats, err := s.buildContributorDiffStats(repo.Path, commits)
	if err != nil {
		return nil, err
	}

	weeklyTotals, contributors := buildContributorWeeklyStats(commits, since, now, diffStats)
	dailyTotals := buildContributorDailyStats(allContributionCommits, navigatorSince, now)
	return &domain.RepoContributorsSnapshot{
		RepoID:        repoID,
		Period:        normalizedPeriod,
		PeriodLabel:   periodLabel,
		PeriodStart:   since,
		PeriodEnd:     now,
		DefaultBranch: defaultBranch,
		WeeklyTotals:  weeklyTotals,
		DailyTotals:   dailyTotals,
		Contributors:  contributors,
	}, nil
}

func (s *RepoInsightsService) GetCommitActivity(
	repoID uuid.UUID,
	requesterID uuid.UUID,
) (*domain.RepoCommitActivitySnapshot, error) {
	if err := s.authorizeRepoAccess(repoID, requesterID); err != nil {
		return nil, err
	}

	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return nil, err
	}
	if repo == nil {
		return nil, errors.New("repository not found")
	}

	branches, err := s.gitManager.GetBranches(repo.Path)
	if err != nil {
		return nil, err
	}
	defaultBranch := resolveDefaultBranchName(branches)
	now := time.Now().UTC()
	since := now.AddDate(-1, 0, 0)
	if defaultBranch == "" {
		return &domain.RepoCommitActivitySnapshot{
			RepoID:        repoID,
			PeriodStart:   since,
			PeriodEnd:     now,
			DefaultBranch: defaultBranch,
			WeeklyTotals:  buildCommitActivityWeeklyStats(nil, since, now),
		}, nil
	}

	commitsPage, err := s.gitManager.GetCommits(repo.Path, defaultBranch, "", 1000000, 0)
	if err != nil {
		return nil, err
	}
	commits := filterNonMergeCommitsBetween(commitsPage.Commits, since, now)

	return &domain.RepoCommitActivitySnapshot{
		RepoID:        repoID,
		PeriodStart:   since,
		PeriodEnd:     now,
		DefaultBranch: defaultBranch,
		WeeklyTotals:  buildCommitActivityWeeklyStats(commits, since, now),
	}, nil
}

func resolveContributorsPeriod(period string) (time.Duration, string, bool, bool) {
	switch strings.TrimSpace(strings.ToLower(period)) {
	case "all":
		return 0, "All", true, true
	case "1m":
		return 30 * 24 * time.Hour, "Last month", false, true
	case "3m":
		return 90 * 24 * time.Hour, "Last 3 months", false, true
	default:
		return 0, "", false, false
	}
}

func (s *RepoInsightsService) TriggerRecompute(
	repoID uuid.UUID,
	requesterID uuid.UUID,
	trigger string,
) error {
	if err := s.authorizeRepoAccess(repoID, requesterID); err != nil {
		return err
	}

	return s.EnqueueRecompute(repoID, trigger)
}

func (s *RepoInsightsService) authorizeRepoAccess(repoID uuid.UUID, requesterID uuid.UUID) error {
	role, err := s.collabStore.GetRole(repoID, requesterID)
	if err != nil || !role.IsValid() {
		return errors.New("unauthorized: you do not have access to this repo")
	}

	return nil
}

func (s *RepoInsightsService) EnqueueRecompute(repoID uuid.UUID, trigger string) error {
	job := insightsJob{
		RepoID:   repoID,
		Trigger:  strings.TrimSpace(trigger),
		QueuedAt: time.Now().UTC(),
	}
	if job.Trigger == "" {
		job.Trigger = "unspecified"
	}

	select {
	case s.jobs <- job:
		return nil
	default:
		return errors.New("insights queue is full, please try again later")
	}
}

func (s *RepoInsightsService) RecomputeNow(repoID uuid.UUID, trigger string) error {
	repo, err := s.repoStore.FindByID(repoID)
	if err != nil {
		return err
	}
	if repo == nil {
		return errors.New("repository not found")
	}

	now := time.Now().UTC()
	input, err := s.buildAnalysisInput(repo.Path, now)
	if err != nil {
		saveErr := s.insightsStore.SaveLatest(&domain.RepoInsightsSnapshot{
			RepoID:            repoID,
			ComputedAt:        now,
			CommitsLast30d:    0,
			CommitTrend:       []domain.CommitTrendPoint{},
			TopContributors:   []domain.ContributorStat{},
			BranchActivity:    []domain.BranchActivityStat{},
			LanguageBreakdown: []domain.LanguageStat{},
			LastError:         err.Error(),
		})
		if saveErr != nil {
			return fmt.Errorf("analysis failed (%v) and failed to persist error snapshot (%v)", err, saveErr)
		}
		return err
	}

	tasks := s.metricTasks()
	results := make(chan metricResult, len(tasks))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	for _, task := range tasks {
		t := task
		go func() {
			value, runErr := t.Run(ctx, input)
			results <- metricResult{Name: t.Name, Value: value, Err: runErr}
		}()
	}

	snapshot := &domain.RepoInsightsSnapshot{
		RepoID:            repoID,
		ComputedAt:        now,
		CommitsLast30d:    len(input.CommitsByHash),
		CommitTrend:       []domain.CommitTrendPoint{},
		TopContributors:   []domain.ContributorStat{},
		BranchActivity:    []domain.BranchActivityStat{},
		LanguageBreakdown: []domain.LanguageStat{},
	}

	var metricErrors []string

	for i := 0; i < len(tasks); i++ {
		res := <-results
		if res.Err != nil {
			metricErrors = append(metricErrors, fmt.Sprintf("%s: %v", res.Name, res.Err))
			continue
		}

		switch res.Name {
		case "commit_trend":
			value, ok := res.Value.([]domain.CommitTrendPoint)
			if !ok {
				metricErrors = append(metricErrors, "commit_trend: invalid metric output type")
				continue
			}
			snapshot.CommitTrend = value
		case "top_contributors":
			value, ok := res.Value.([]domain.ContributorStat)
			if !ok {
				metricErrors = append(metricErrors, "top_contributors: invalid metric output type")
				continue
			}
			snapshot.TopContributors = value
		case "branch_activity":
			value, ok := res.Value.([]domain.BranchActivityStat)
			if !ok {
				metricErrors = append(metricErrors, "branch_activity: invalid metric output type")
				continue
			}
			snapshot.BranchActivity = value
		case "language_breakdown":
			value, ok := res.Value.(languageMetricResult)
			if !ok {
				metricErrors = append(metricErrors, "language_breakdown: invalid metric output type")
				continue
			}
			snapshot.PrimaryLanguage = value.PrimaryLanguage
			snapshot.LanguageBreakdown = value.Breakdown
		default:
			log.Printf("unknown metric result name: %s", res.Name)
		}
	}

	if len(metricErrors) > 0 {
		snapshot.LastError = "some metrics failed: " + strings.Join(metricErrors, "; ")
	}

	if err := s.insightsStore.SaveLatest(snapshot); err != nil {
		return fmt.Errorf("failed to save insights snapshot: %v", err)
	}

	if err := s.repoStore.UpdatePrimaryLanguage(repoID, snapshot.PrimaryLanguage); err != nil {
		return fmt.Errorf("failed to update repository primary language: %v", err)
	}

	if snapshot.LastError != "" {
		return errors.New(snapshot.LastError)
	}

	return nil
}

func (s *RepoInsightsService) metricTasks() []metricTask {
	return []metricTask{
		{
			Name: "commit_trend",
			Run: func(ctx context.Context, input *analysisInput) (any, error) {
				return s.metricComputer.ComputeCommitTrend(ctx, input.CommitsByHash)
			},
		},
		{
			Name: "top_contributors",
			Run: func(ctx context.Context, input *analysisInput) (any, error) {
				return s.metricComputer.ComputeTopContributors(ctx, input.CommitsByHash)
			},
		},
		{
			Name: "branch_activity",
			Run: func(ctx context.Context, input *analysisInput) (any, error) {
				return s.metricComputer.ComputeBranchActivity(ctx, input.CommitsByBranch)
			},
		},
		{
			Name: "language_breakdown",
			Run: func(ctx context.Context, input *analysisInput) (any, error) {
				return s.computeLanguageBreakdown(ctx, input)
			},
		},
	}
}

func (s *RepoInsightsService) buildAnalysisInput(repoPath string, now time.Time) (*analysisInput, error) {
	branches, err := s.gitManager.GetBranches(repoPath)
	if err != nil {
		return nil, err
	}

	since := now.AddDate(0, 0, -30)
	defaultBranch := ""
	if len(branches) > 0 {
		defaultBranch = branches[0].Name
		for _, branch := range branches {
			if branch.IsDefault {
				defaultBranch = branch.Name
				break
			}
		}
	}

	input := &analysisInput{
		RepoPath:        repoPath,
		DefaultBranch:   defaultBranch,
		Since:           since,
		CommitsByHash:   map[string]domain.Commit{},
		CommitsByBranch: map[string][]domain.Commit{},
	}

	for _, branch := range branches {
		commitsPage, err := s.gitManager.GetCommits(repoPath, branch.Name, "", 1000000, 0)
		if err != nil {
			return nil, err
		}

		filtered := filterCommitsSince(commitsPage.Commits, since)
		input.CommitsByBranch[branch.Name] = filtered

		for _, commit := range filtered {
			input.CommitsByHash[commit.Hash] = commit
		}
	}

	return input, nil
}

func filterCommitsSince(commits []domain.Commit, since time.Time) []domain.Commit {
	result := make([]domain.Commit, 0, len(commits))
	for _, commit := range commits {
		commitTime := commit.Date.UTC()
		if commitTime.After(since) || commitTime.Equal(since) {
			result = append(result, commit)
		}
	}
	return result

}

func filterNonMergeCommitsBetween(commits []domain.Commit, since time.Time, until time.Time) []domain.Commit {
	result := make([]domain.Commit, 0, len(commits))
	for _, commit := range commits {
		if len(commit.Parents) > 1 {
			continue
		}
		if !timeInRange(commit.Date, since, until) {
			continue
		}
		result = append(result, commit)
	}
	return result
}

func filterNonMergeCommits(commits []domain.Commit) []domain.Commit {
	result := make([]domain.Commit, 0, len(commits))
	for _, commit := range commits {
		if len(commit.Parents) > 1 {
			continue
		}
		result = append(result, commit)
	}
	return result
}

func earliestCommitDate(commits []domain.Commit, fallback time.Time) time.Time {
	if len(commits) == 0 {
		return fallback.UTC()
	}
	earliest := commits[0].Date.UTC()
	for _, commit := range commits[1:] {
		if commit.Date.UTC().Before(earliest) {
			earliest = commit.Date.UTC()
		}
	}
	return earliest
}

func filterCommitsBetween(commits []domain.Commit, since time.Time, until time.Time) []domain.Commit {
	result := make([]domain.Commit, 0, len(commits))
	for _, commit := range commits {
		if !timeInRange(commit.Date, since, until) {
			continue
		}
		result = append(result, commit)
	}
	return result
}

type contributorDiffStat struct {
	Additions int
	Deletions int
}

func (s *RepoInsightsService) buildContributorDiffStats(
	repoPath string,
	commits []domain.Commit,
) (map[string]contributorDiffStat, error) {
	stats := map[string]contributorDiffStat{}
	for _, commit := range commits {
		author := normalizedCommitAuthor(commit.Author)
		diffFiles, err := s.gitManager.GetCommitDiff(repoPath, commit.Hash)
		if err != nil {
			return nil, err
		}
		stat := stats[author]
		for _, file := range diffFiles {
			stat.Additions += file.Additions
			stat.Deletions += file.Deletions
		}
		stats[author] = stat
	}
	return stats, nil
}

func timeInRange(value time.Time, since time.Time, until time.Time) bool {
	at := value.UTC()
	return (at.Equal(since) || at.After(since)) && (at.Equal(until) || at.Before(until))
}

func weekStart(value time.Time) time.Time {
	at := value.UTC()
	year, month, day := at.Date()
	dayStart := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	offset := (int(dayStart.Weekday()) + 6) % 7
	return dayStart.AddDate(0, 0, -offset)
}

func buildContributorDailyStats(
	commits []domain.Commit,
	since time.Time,
	until time.Time,
) []domain.ContributionDay {
	startDay := dayStartUTC(since)
	endDay := dayStartUTC(until)
	totalByDay := map[string]int{}
	for _, commit := range commits {
		key := dayStartUTC(commit.Date).Format("2006-01-02")
		totalByDay[key]++
	}

	days := []domain.ContributionDay{}
	for current := startDay; !current.After(endDay); current = current.AddDate(0, 0, 1) {
		key := current.Format("2006-01-02")
		days = append(days, domain.ContributionDay{
			Date:        key,
			CommitCount: totalByDay[key],
		})
	}
	return days
}

func buildCommitActivityWeeklyStats(
	commits []domain.Commit,
	since time.Time,
	until time.Time,
) []domain.ContributionWeek {
	startWeek := weekStart(since)
	endWeek := weekStart(until)
	totalByWeek := map[string]int{}
	for _, commit := range commits {
		key := weekStart(commit.Date).Format("2006-01-02")
		totalByWeek[key]++
	}

	weeks := []domain.ContributionWeek{}
	for current := startWeek; !current.After(endWeek); current = current.AddDate(0, 0, 7) {
		key := current.Format("2006-01-02")
		weeks = append(weeks, domain.ContributionWeek{
			WeekStart:   key,
			CommitCount: totalByWeek[key],
		})
	}
	return weeks
}

func dayStartUTC(value time.Time) time.Time {
	at := value.UTC()
	year, month, day := at.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func buildContributorWeeklyStats(
	commits []domain.Commit,
	since time.Time,
	until time.Time,
	diffStats map[string]contributorDiffStat,
) ([]domain.ContributionWeek, []domain.ContributorContribution) {
	startWeek := weekStart(since)
	endWeek := weekStart(until)
	weekKeys := []string{}
	for current := startWeek; !current.After(endWeek); current = current.AddDate(0, 0, 7) {
		weekKeys = append(weekKeys, current.Format("2006-01-02"))
	}

	totalByWeek := map[string]int{}
	byAuthorWeek := map[string]map[string]int{}
	totalByAuthor := map[string]int{}
	for _, commit := range commits {
		author := normalizedCommitAuthor(commit.Author)
		key := weekStart(commit.Date).Format("2006-01-02")
		totalByWeek[key]++
		totalByAuthor[author]++
		if byAuthorWeek[author] == nil {
			byAuthorWeek[author] = map[string]int{}
		}
		byAuthorWeek[author][key]++
	}

	weeklyTotals := make([]domain.ContributionWeek, 0, len(weekKeys))
	for _, key := range weekKeys {
		weeklyTotals = append(weeklyTotals, domain.ContributionWeek{
			WeekStart:   key,
			CommitCount: totalByWeek[key],
		})
	}

	authors := make([]string, 0, len(totalByAuthor))
	for author := range totalByAuthor {
		authors = append(authors, author)
	}
	sort.Slice(authors, func(i int, j int) bool {
		if totalByAuthor[authors[i]] == totalByAuthor[authors[j]] {
			return authors[i] < authors[j]
		}
		return totalByAuthor[authors[i]] > totalByAuthor[authors[j]]
	})

	contributors := make([]domain.ContributorContribution, 0, len(authors))
	for _, author := range authors {
		diffStat := diffStats[author]
		weeks := make([]domain.ContributionWeek, 0, len(weekKeys))
		for _, key := range weekKeys {
			weeks = append(weeks, domain.ContributionWeek{
				WeekStart:   key,
				CommitCount: byAuthorWeek[author][key],
			})
		}
		contributors = append(contributors, domain.ContributorContribution{
			AuthorName:  author,
			CommitCount: totalByAuthor[author],
			Additions:   diffStat.Additions,
			Deletions:   diffStat.Deletions,
			Weeks:       weeks,
		})
	}

	return weeklyTotals, contributors
}

func normalizedCommitAuthor(author string) string {
	normalized := strings.TrimSpace(author)
	if normalized == "" {
		return "Unknown"
	}
	return normalized
}

func resolveDefaultBranchName(branches []domain.Branch) string {
	if len(branches) == 0 {
		return ""
	}
	for _, branch := range branches {
		if branch.IsDefault {
			return branch.Name
		}
	}
	return branches[0].Name
}

func buildPulseTopCommitters(commitsByHash map[string]domain.Commit) []domain.ContributorStat {
	byAuthor := map[string]int{}
	for _, commit := range commitsByHash {
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

	return stats
}

func buildPulseOverview(
	issues []domain.Issue,
	pullRequests []domain.PullRequest,
	since time.Time,
	until time.Time,
) domain.RepoPulseOverview {
	overview := domain.RepoPulseOverview{}

	for _, issue := range issues {
		if issue.Status == domain.IssueStatusClosed && timeInRange(issue.UpdatedAt, since, until) {
			overview.ClosedIssues++
			continue
		}

		if issue.Status == domain.IssueStatusOpen {
			overview.NewIssues++
		}
	}
	overview.ActiveIssues = overview.ClosedIssues + overview.NewIssues

	for _, pull := range pullRequests {
		if pull.Status == domain.PullRequestStatusMerged && timeInRange(pull.UpdatedAt, since, until) {
			overview.MergedPullRequests++
			continue
		}

		if pull.Status == domain.PullRequestStatusOpen {
			overview.OpenPullRequests++
		}
	}
	overview.ActivePullRequests = overview.MergedPullRequests + overview.OpenPullRequests

	return overview
}

func (s *RepoInsightsService) listAccessibleRepos(requesterID uuid.UUID) ([]*domain.Repo, error) {
	repos, err := s.repoStore.FindAll()
	if err != nil {
		return nil, err
	}

	accessible := make([]*domain.Repo, 0, len(repos))
	for _, repo := range repos {
		if repo == nil {
			continue
		}

		repoID, parseErr := uuid.Parse(repo.ID)
		if parseErr != nil {
			continue
		}

		role, roleErr := s.collabStore.GetRole(repoID, requesterID)
		if roleErr != nil || !role.IsValid() {
			continue
		}

		accessible = append(accessible, repo)
	}

	return accessible, nil
}

func (s *RepoInsightsService) listProfileTickets(repos []*domain.Repo) ([]domain.Issue, []domain.PullRequest, error) {
	issues := make([]domain.Issue, 0)
	pullRequests := make([]domain.PullRequest, 0)

	for _, repo := range repos {
		if repo == nil {
			continue
		}

		repoID, err := uuid.Parse(repo.ID)
		if err != nil {
			continue
		}

		repoIssues, err := s.issueStore.ListByRepo(repoID)
		if err != nil {
			return nil, nil, err
		}
		issues = append(issues, repoIssues...)

		repoPullRequests, err := s.pullStore.ListByRepo(repoID)
		if err != nil {
			return nil, nil, err
		}
		pullRequests = append(pullRequests, repoPullRequests...)
	}

	return issues, pullRequests, nil
}

func (s *RepoInsightsService) computeLanguageBreakdown(ctx context.Context,
	input *analysisInput) (languageMetricResult, error) {

	result := languageMetricResult{Breakdown: []domain.LanguageStat{}}
	select {
	case <-ctx.Done():
		return result, ctx.Err()
	default:
	}

	repoPath := strings.TrimSpace(input.RepoPath)
	if repoPath == "" {
		return result, nil
	}

	primaryLanguage, breakdown, err := s.metricComputer.ComputeLanguageBreakdown(ctx, repoPath, input.DefaultBranch)
	if err != nil {
		return result, err
	}

	if breakdown != nil {
		result.Breakdown = breakdown
	}
	result.PrimaryLanguage = strings.TrimSpace(primaryLanguage)

	return result, nil
}
