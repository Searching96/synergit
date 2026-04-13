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
