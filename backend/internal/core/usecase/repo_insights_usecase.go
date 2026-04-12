package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"path/filepath"
	"sort"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
	"time"

	git "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/google/uuid"
)

var _ port.RepoInsightsUsecase = (*RepoInsightsService)(nil)

const (
	defaultInsightsWorkerCount = 4
	defaultInsightsQueueSize   = 128
)

type RepoInsightsService struct {
	insightsStore port.RepoInsightsRepository
	repoStore     port.RepoRepository
	collabStore   port.CollaboratorRepository
	gitManager    port.GitManager

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
	gitManager port.GitManager,
) *RepoInsightsService {
	s := &RepoInsightsService{
		insightsStore: insightsStore,
		repoStore:     repoStore,
		collabStore:   collabStore,
		gitManager:    gitManager,
		jobs:          make(chan insightsJob, defaultInsightsQueueSize),
	}

	s.startWorkers(defaultInsightsWorkerCount)

	return s
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

func (s *RepoInsightsService) GetLastestInsights(
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
				return s.computeCommitTrend(ctx, input)
			},
		},
		{
			Name: "top_contributors",
			Run: func(ctx context.Context, input *analysisInput) (any, error) {
				return s.computeTopContributors(ctx, input)
			},
		},
		{
			Name: "branch_activity",
			Run: func(ctx context.Context, input *analysisInput) (any, error) {
				return s.computeBranchActivity(ctx, input)
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
		commits, err := s.gitManager.GetCommits(repoPath, branch.Name)
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

func (s *RepoInsightsService) computeCommitTrend(ctx context.Context,
	input *analysisInput) ([]domain.CommitTrendPoint, error) {

	byDay := map[string]int{}
	for _, commit := range input.CommitsByHash {
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

func (s *RepoInsightsService) computeTopContributors(ctx context.Context,
	input *analysisInput) ([]domain.ContributorStat, error) {

	byAuthor := map[string]int{}

	for _, commit := range input.CommitsByHash {
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

func (s *RepoInsightsService) computeBranchActivity(ctx context.Context,
	input *analysisInput) ([]domain.BranchActivityStat, error) {

	stats := make([]domain.BranchActivityStat, 0, len(input.CommitsByBranch))

	for branchName, commits := range input.CommitsByBranch {
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

var allowedProgrammingLanguages = map[string]struct{}{
	"Assembly":   {},
	"Batchfile":  {},
	"C":          {},
	"C#":         {},
	"C++":        {},
	"CSS":        {},
	"Dockerfile": {},
	"GDScript":   {},
	"Go":         {},
	"HTML":       {},
	"Haskell":    {},
	"Java":       {},
	"JavaScript": {},
	"Python":     {},
	"Rust":       {},
	"Shell":      {},
	"TypeScript": {},
}

var extensionLanguageMap = map[string]string{
	".asm":   "Assembly",
	".bat":   "Batchfile",
	".bash":  "Shell",
	".c":     "C",
	".cc":    "C++",
	".cmd":   "Batchfile",
	".cpp":   "C++",
	".cs":    "C#",
	".csx":   "C#",
	".css":   "CSS",
	".cts":   "TypeScript",
	".cxx":   "C++",
	".fish":  "Shell",
	".gd":    "GDScript",
	".go":    "Go",
	".h":     "C",
	".hh":    "C++",
	".hpp":   "C++",
	".hs":    "Haskell",
	".htm":   "HTML",
	".html":  "HTML",
	".hxx":   "C++",
	".inl":   "C++",
	".ipp":   "C++",
	".java":  "Java",
	".js":    "JavaScript",
	".jsx":   "JavaScript",
	".ksh":   "Shell",
	".less":  "CSS",
	".lhs":   "Haskell",
	".mjs":   "JavaScript",
	".mts":   "TypeScript",
	".py":    "Python",
	".rs":    "Rust",
	".s":     "Assembly",
	".sass":  "CSS",
	".scss":  "CSS",
	".sh":    "Shell",
	".tpp":   "C++",
	".ts":    "TypeScript",
	".tsx":   "TypeScript",
	".xhtml": "HTML",
	".zsh":   "Shell",
}

var filenameLanguageMap = map[string]string{
	"dockerfile": "Dockerfile",
}

var ignoredLanguageDirs = map[string]struct{}{
	".git":         {},
	".next":        {},
	"bin":          {},
	"build":        {},
	"coverage":     {},
	"dist":         {},
	"node_modules": {},
	"obj":          {},
	"target":       {},
	"vendor":       {},
}

func (s *RepoInsightsService) computeLanguageBreakdown(ctx context.Context,
	input *analysisInput) (languageMetricResult, error) {

	result := languageMetricResult{Breakdown: []domain.LanguageStat{}}

	repoPath := strings.TrimSpace(input.RepoPath)
	if repoPath == "" {
		return result, nil
	}

	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return result, err
	}

	ref, err := resolveBranchReference(repo, input.DefaultBranch)
	if err != nil {
		if errors.Is(err, plumbing.ErrReferenceNotFound) {
			return result, nil
		}
		return result, err
	}

	commit, err := repo.CommitObject(ref.Hash())
	if err != nil {
		return result, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return result, err
	}

	counts := map[string]int64{}
	var totalBytes int64

	err = tree.Files().ForEach(func(file *object.File) error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		language := classifyProgrammingLanguage(file.Name)
		if language == "" {
			return nil
		}

		size := countEffectiveCodeBytes(language, file)
		if size <= 0 {
			return nil
		}

		counts[language] += size
		totalBytes += size

		return nil
	})
	if err != nil {
		return result, err
	}

	if totalBytes == 0 {
		return result, nil
	}

	breakdown := make([]domain.LanguageStat, 0, len(counts))
	for language, bytes := range counts {
		percentage := math.Round((float64(bytes)*10000)/float64(totalBytes)) / 100
		breakdown = append(breakdown, domain.LanguageStat{
			Language:   language,
			Bytes:      bytes,
			Percentage: percentage,
		})
	}

	sort.Slice(breakdown, func(i int, j int) bool {
		if breakdown[i].Bytes == breakdown[j].Bytes {
			return breakdown[i].Language < breakdown[j].Language
		}
		return breakdown[i].Bytes > breakdown[j].Bytes
	})

	result.Breakdown = breakdown
	result.PrimaryLanguage = breakdown[0].Language

	return result, nil
}

func resolveBranchReference(repo *git.Repository, preferredBranch string) (*plumbing.Reference, error) {
	candidates := []string{strings.TrimSpace(preferredBranch), "master", "main"}
	seen := map[string]struct{}{}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}

		ref, err := repo.Reference(plumbing.NewBranchReferenceName(candidate), true)
		if err == nil {
			return ref, nil
		}
		if !errors.Is(err, plumbing.ErrReferenceNotFound) {
			return nil, err
		}
	}

	return repo.Head()
}

func classifyProgrammingLanguage(filePath string) string {
	normalizedPath := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(filePath), "\\", "/"))
	if normalizedPath == "" {
		return ""
	}

	if shouldIgnoreLanguagePath(normalizedPath) {
		return ""
	}

	baseName := filepath.Base(normalizedPath)
	if language, ok := filenameLanguageMap[baseName]; ok {
		if _, allowed := allowedProgrammingLanguages[language]; allowed {
			return language
		}
		return ""
	}

	language, ok := extensionLanguageMap[filepath.Ext(baseName)]
	if !ok {
		return ""
	}

	if _, allowed := allowedProgrammingLanguages[language]; !allowed {
		return ""
	}

	return language
}

func shouldIgnoreLanguagePath(normalizedPath string) bool {
	for _, segment := range strings.Split(normalizedPath, "/") {
		if _, ignored := ignoredLanguageDirs[segment]; ignored {
			return true
		}
	}

	if strings.HasSuffix(normalizedPath, ".min.js") || strings.HasSuffix(normalizedPath, ".min.css") {
		return true
	}

	return false
}

func countEffectiveCodeBytes(language string, file *object.File) int64 {
	if file == nil {
		return 0
	}

	content, err := file.Contents()
	if err != nil {
		if file.Blob.Size < 0 {
			return 0
		}
		return file.Blob.Size
	}

	cleaned := stripCommentsByLanguage(language, content)
	if cleaned == "" {
		return 0
	}

	var total int64
	for _, line := range strings.Split(cleaned, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		total += int64(len(trimmed))
	}

	return total
}

func stripCommentsByLanguage(language string, content string) string {
	switch language {
	case "Go", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Rust", "GDScript", "CSS":
		return stripLineAndBlockComments(content, []string{"//"}, "/*", "*/")
	case "Python", "Shell", "Dockerfile":
		return stripPrefixedLineComments(content, []string{"#"})
	case "Batchfile":
		return stripBatchfileComments(content)
	case "Assembly":
		return stripLineAndBlockComments(content, []string{";"}, "", "")
	case "Haskell":
		return stripLineAndBlockComments(content, []string{"--"}, "{-", "-}")
	case "HTML":
		return stripLineAndBlockComments(content, nil, "<!--", "-->")
	default:
		return content
	}
}

func stripPrefixedLineComments(content string, prefixes []string) string {
	if len(prefixes) == 0 {
		return content
	}

	lines := strings.Split(content, "\n")
	kept := make([]string, 0, len(lines))

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		isComment := false
		for _, prefix := range prefixes {
			if strings.HasPrefix(trimmed, prefix) {
				isComment = true
				break
			}
		}

		if isComment {
			kept = append(kept, "")
			continue
		}

		kept = append(kept, line)
	}

	return strings.Join(kept, "\n")
}

func stripBatchfileComments(content string) string {
	lines := strings.Split(content, "\n")
	kept := make([]string, 0, len(lines))

	for _, line := range lines {
		trimmed := strings.ToLower(strings.TrimSpace(line))
		if strings.HasPrefix(trimmed, "::") ||
			trimmed == "rem" ||
			strings.HasPrefix(trimmed, "rem ") ||
			strings.HasPrefix(trimmed, "rem\t") {

			kept = append(kept, "")
			continue
		}

		kept = append(kept, line)
	}

	return strings.Join(kept, "\n")
}

func stripLineAndBlockComments(content string, lineMarkers []string,
	blockStart string, blockEnd string) string {

	var builder strings.Builder
	builder.Grow(len(content))

	inBlock := false

	for i := 0; i < len(content); {
		if inBlock {
			if blockEnd != "" && strings.HasPrefix(content[i:], blockEnd) {
				inBlock = false
				i += len(blockEnd)
				continue
			}

			if content[i] == '\n' {
				builder.WriteByte('\n')
			}

			i++
			continue
		}

		if blockStart != "" && strings.HasPrefix(content[i:], blockStart) {
			inBlock = true
			i += len(blockStart)
			continue
		}

		lineCommentFound := false
		for _, marker := range lineMarkers {
			if marker == "" {
				continue
			}

			if strings.HasPrefix(content[i:], marker) {
				lineCommentFound = true
				i += len(marker)
				for i < len(content) && content[i] != '\n' {
					i++
				}
				if i < len(content) && content[i] == '\n' {
					builder.WriteByte('\n')
					i++
				}
				break
			}
		}

		if lineCommentFound {
			continue
		}

		builder.WriteByte(content[i])
		i++
	}

	return builder.String()
}
