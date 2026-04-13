package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	"github.com/google/uuid"
)

var _ port.RepoInsightsUseCase = (*RepoInsightsService)(nil)

const (
	defaultInsightsWorkerCount = 4
	defaultInsightsQueueSize   = 128
)

type RepoInsightsService struct {
	insightsStore  port.RepoInsightsRepository
	repoStore      port.RepoRepository
	collabStore    port.CollaboratorRepository
	issueStore     port.IssueRepository
	pullStore      port.PullRequestRepository
	userStore      port.UserRepository
	gitManager     port.GitManager
	metricComputer port.RepoInsightsMetricComputer

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
	insightsStore port.RepoInsightsRepository,
	repoStore port.RepoRepository,
	collabStore port.CollaboratorRepository,
	issueStore port.IssueRepository,
	pullStore port.PullRequestRepository,
	userStore port.UserRepository,
	gitManager port.GitManager,
	metricComputer port.RepoInsightsMetricComputer,
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
		requester.Username,
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
		commits, err := s.gitManager.GetCommits(repoPath, branch.Name, "")
		if err != nil {
			return nil, err
		}

		filtered := filterCommitsSince(commits, since)
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
