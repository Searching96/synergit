package domain

import (
	"time"

	"github.com/google/uuid"
)

// RepoInsightsSnapshot stores the latest computed analytics for a repository.
type RepoInsightsSnapshot struct {
	RepoID            uuid.UUID            `json:"repo_id"`
	ComputedAt        time.Time            `json:"computed_at"`
	CommitsLast30d    int                  `json:"commits_last_30d"`
	CommitTrend       []CommitTrendPoint   `json:"commit_trend"`
	TopContributors   []ContributorStat    `json:"top_contributors"`
	BranchActivity    []BranchActivityStat `json:"branch_activity"`
	PrimaryLanguage   string               `json:"primary_language,omitempty"`
	LanguageBreakdown []LanguageStat       `json:"language_breakdown"`
	LastError         string               `json:"last_error,omitempty"`
}

// RepoPulseSnapshot summarizes repository activity for a short period.
type RepoPulseSnapshot struct {
	RepoID        uuid.UUID         `json:"repo_id"`
	Period        string            `json:"period"`
	PeriodLabel   string            `json:"period_label"`
	PeriodStart   time.Time         `json:"period_start"`
	PeriodEnd     time.Time         `json:"period_end"`
	DefaultBranch string            `json:"default_branch"`
	Overview      RepoPulseOverview `json:"overview"`
	Summary       RepoPulseSummary  `json:"summary"`
	TopCommitters []ContributorStat `json:"top_committers"`
}

type RepoPulseOverview struct {
	ActivePullRequests int `json:"active_pull_requests"`
	ActiveIssues       int `json:"active_issues"`
	MergedPullRequests int `json:"merged_pull_requests"`
	OpenPullRequests   int `json:"open_pull_requests"`
	ClosedIssues       int `json:"closed_issues"`
	NewIssues          int `json:"new_issues"`
}

type RepoPulseSummary struct {
	AuthorCount              int `json:"author_count"`
	DefaultBranchCommitCount int `json:"default_branch_commit_count"`
	AllBranchCommitCount     int `json:"all_branch_commit_count"`
	FilesChanged             int `json:"files_changed"`
	Additions                int `json:"additions"`
	Deletions                int `json:"deletions"`
}

// RepoContributorsSnapshot summarizes default-branch contributors over time.
type RepoContributorsSnapshot struct {
	RepoID        uuid.UUID                 `json:"repo_id"`
	Period        string                    `json:"period"`
	PeriodLabel   string                    `json:"period_label"`
	PeriodStart   time.Time                 `json:"period_start"`
	PeriodEnd     time.Time                 `json:"period_end"`
	DefaultBranch string                    `json:"default_branch"`
	WeeklyTotals  []ContributionWeek        `json:"weekly_totals"`
	DailyTotals   []ContributionDay         `json:"daily_totals"`
	Contributors  []ContributorContribution `json:"contributors"`
}

type ContributionWeek struct {
	WeekStart   string `json:"week_start"`
	CommitCount int    `json:"commit_count"`
}

type ContributionDay struct {
	Date        string `json:"date"`
	CommitCount int    `json:"commit_count"`
}

type ContributorContribution struct {
	AuthorName  string             `json:"author_name"`
	CommitCount int                `json:"commit_count"`
	Additions   int                `json:"additions"`
	Deletions   int                `json:"deletions"`
	Weeks       []ContributionWeek `json:"weeks"`
}

// RepoCommitActivitySnapshot summarizes weekly commits over the last year.
type RepoCommitActivitySnapshot struct {
	RepoID        uuid.UUID          `json:"repo_id"`
	PeriodStart   time.Time          `json:"period_start"`
	PeriodEnd     time.Time          `json:"period_end"`
	DefaultBranch string             `json:"default_branch"`
	WeeklyTotals  []ContributionWeek `json:"weekly_totals"`
}

// RepoCodeFrequencySnapshot summarizes weekly code churn over repository history.
type RepoCodeFrequencySnapshot struct {
	RepoID        uuid.UUID               `json:"repo_id"`
	PeriodStart   time.Time               `json:"period_start"`
	PeriodEnd     time.Time               `json:"period_end"`
	DefaultBranch string                  `json:"default_branch"`
	WeeklyTotals  []CodeFrequencyWeekStat `json:"weekly_totals"`
}

type CodeFrequencyWeekStat struct {
	WeekStart string `json:"week_start"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
}

// CommitTrendPoint represents commit count grouped by day.
type CommitTrendPoint struct {
	Date        string `json:"date"`
	CommitCount int    `json:"commit_count"`
}

// ContributorStat represents commit contribution for one author.
type ContributorStat struct {
	AuthorName  string `json:"author_name"`
	CommitCount int    `json:"commit_count"`
}

// BranchActivityStat represents commit activity per branch.
type BranchActivityStat struct {
	BranchName  string `json:"branch_name"`
	CommitCount int    `json:"commit_count"`
}

// LanguageStat represents byte share for one programming language.
type LanguageStat struct {
	Language   string  `json:"language"`
	Bytes      int64   `json:"bytes"`
	Percentage float64 `json:"percentage"`
}

type ProfileContributionDay struct {
	Date        string `json:"date"`
	CommitCount int    `json:"commit_count"`
}

type ProfileActivityChart struct {
	Commits      int `json:"commits"`
	CodeReviews  int `json:"code_reviews"`
	Issues       int `json:"issues"`
	PullRequests int `json:"pull_requests"`
}

type ProfileRepoContribution struct {
	Repository  string `json:"repository"`
	CommitCount int    `json:"commit_count"`
}

type ProfileActivityOverview struct {
	TopRepositories    []ProfileRepoContribution `json:"top_repositories"`
	OtherRepoCount     int                       `json:"other_repo_count"`
	CommitsLast365Days int                       `json:"commits_last_365_days"`
}

type ProfileCommitActivity struct {
	SelectedYear       int                       `json:"selected_year"`
	AvailableYears     []int                     `json:"available_years"`
	ContributionDays   []ProfileContributionDay  `json:"contribution_days"`
	TotalContributions int                       `json:"total_contributions"`
	TopRepositories    []ProfileRepoContribution `json:"top_repositories"`
	OtherRepoCount     int                       `json:"other_repo_count"`
	CommitsLast365Days int                       `json:"commits_last_365_days"`
}

type ProfileActivitySnapshot struct {
	Username           string                   `json:"username"`
	ComputedAt         time.Time                `json:"computed_at"`
	SelectedYear       int                      `json:"selected_year"`
	AvailableYears     []int                    `json:"available_years"`
	ContributionDays   []ProfileContributionDay `json:"contribution_days"`
	TotalContributions int                      `json:"total_contributions"`
	ActivityChart      ProfileActivityChart     `json:"activity_chart"`
	ActivityOverview   ProfileActivityOverview  `json:"activity_overview"`
}
