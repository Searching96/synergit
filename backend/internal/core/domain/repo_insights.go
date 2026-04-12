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
