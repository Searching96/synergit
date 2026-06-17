package usecase

import (
	"testing"
	"time"

	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

func TestFilterNonMergeCommitsBetween(t *testing.T) {
	since := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
	until := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)

	commits := []domain.Commit{
		{Hash: "before", Date: since.Add(-time.Second)},
		{Hash: "start", Date: since},
		{Hash: "merge", Date: since.Add(24 * time.Hour), Parents: []string{"a", "b"}},
		{Hash: "middle", Date: since.Add(48 * time.Hour), Parents: []string{"a"}},
		{Hash: "end", Date: until},
		{Hash: "after", Date: until.Add(time.Second)},
	}

	filtered := filterNonMergeCommitsBetween(commits, since, until)
	got := make([]string, 0, len(filtered))
	for _, commit := range filtered {
		got = append(got, commit.Hash)
	}

	want := []string{"start", "middle", "end"}
	if len(got) != len(want) {
		t.Fatalf("expected %d commits, got %d: %v", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected commit %q at index %d, got %q", want[i], i, got[i])
		}
	}
}

func TestBuildPulseOverview(t *testing.T) {
	since := time.Date(2026, 6, 10, 0, 0, 0, 0, time.UTC)
	until := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)

	issues := []domain.Issue{
		{Status: domain.IssueStatusOpen, CreatedAt: since.Add(24 * time.Hour)},
		{Status: domain.IssueStatusOpen, CreatedAt: since.Add(-24 * time.Hour)},
		{Status: domain.IssueStatusClosed, CreatedAt: since.Add(-48 * time.Hour), UpdatedAt: since.Add(48 * time.Hour)},
		{Status: domain.IssueStatusClosed, CreatedAt: since.Add(24 * time.Hour), UpdatedAt: until.Add(time.Hour)},
	}
	pulls := []domain.PullRequest{
		{Status: domain.PullRequestStatusOpen, CreatedAt: since.Add(24 * time.Hour)},
		{Status: domain.PullRequestStatusOpen, CreatedAt: since.Add(-24 * time.Hour)},
		{Status: domain.PullRequestStatusMerged, UpdatedAt: since.Add(48 * time.Hour)},
		{Status: domain.PullRequestStatusMerged, UpdatedAt: until.Add(time.Hour)},
	}

	overview := buildPulseOverview(issues, pulls, since, until)

	if overview.ActiveIssues != 3 {
		t.Fatalf("expected 3 active issues, got %d", overview.ActiveIssues)
	}
	if overview.NewIssues != 2 {
		t.Fatalf("expected 2 open issues, got %d", overview.NewIssues)
	}
	if overview.ClosedIssues != 1 {
		t.Fatalf("expected 1 closed issue, got %d", overview.ClosedIssues)
	}
	if overview.ActivePullRequests != 3 {
		t.Fatalf("expected 3 active pull requests, got %d", overview.ActivePullRequests)
	}
	if overview.OpenPullRequests != 2 {
		t.Fatalf("expected 2 open pull requests, got %d", overview.OpenPullRequests)
	}
	if overview.MergedPullRequests != 1 {
		t.Fatalf("expected 1 merged pull request, got %d", overview.MergedPullRequests)
	}
}

func TestBuildPulseTopCommitters(t *testing.T) {
	commits := map[string]domain.Commit{
		uuid.NewString(): {Author: "Zoe"},
		uuid.NewString(): {Author: "Amy"},
		uuid.NewString(): {Author: "Amy"},
		uuid.NewString(): {Author: "Ben"},
		uuid.NewString(): {Author: "Ben"},
		uuid.NewString(): {Author: "Cal"},
		uuid.NewString(): {Author: "Dee"},
		uuid.NewString(): {Author: "Eli"},
		uuid.NewString(): {Author: "Fay"},
	}

	stats := buildPulseTopCommitters(commits)
	if len(stats) != 5 {
		t.Fatalf("expected top 5 committers, got %d", len(stats))
	}
	if stats[0].AuthorName != "Amy" || stats[0].CommitCount != 2 {
		t.Fatalf("expected Amy first with 2 commits, got %+v", stats[0])
	}
	if stats[1].AuthorName != "Ben" || stats[1].CommitCount != 2 {
		t.Fatalf("expected Ben second with 2 commits, got %+v", stats[1])
	}
}

func TestResolveContributorsPeriod(t *testing.T) {
	cases := []struct {
		period string
		label  string
		all    bool
		ok     bool
	}{
		{period: "all", label: "All", all: true, ok: true},
		{period: "1m", label: "Last month", ok: true},
		{period: "3m", label: "Last 3 months", ok: true},
		{period: "bad", ok: false},
	}

	for _, tc := range cases {
		_, label, all, ok := resolveContributorsPeriod(tc.period)
		if ok != tc.ok {
			t.Fatalf("period %q expected ok=%v, got %v", tc.period, tc.ok, ok)
		}
		if label != tc.label {
			t.Fatalf("period %q expected label %q, got %q", tc.period, tc.label, label)
		}
		if all != tc.all {
			t.Fatalf("period %q expected all=%v, got %v", tc.period, tc.all, all)
		}
	}
}

func TestBuildContributorWeeklyStats(t *testing.T) {
	since := time.Date(2026, 5, 16, 12, 0, 0, 0, time.UTC)
	until := time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
	commits := []domain.Commit{
		{Hash: "a1", Author: "Dana", Date: time.Date(2026, 5, 18, 8, 0, 0, 0, time.UTC)},
		{Hash: "a2", Author: "Dana", Date: time.Date(2026, 5, 19, 8, 0, 0, 0, time.UTC)},
		{Hash: "b1", Author: "Chris", Date: time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)},
		{Hash: "merge", Author: "Dana", Date: time.Date(2026, 6, 2, 8, 0, 0, 0, time.UTC), Parents: []string{"x", "y"}},
	}

	filtered := filterNonMergeCommits(commits)
	weeklyTotals, contributors := buildContributorWeeklyStats(filtered, since, until)

	if len(filtered) != 3 {
		t.Fatalf("expected 3 non-merge commits, got %d", len(filtered))
	}
	if len(weeklyTotals) == 0 {
		t.Fatal("expected weekly totals")
	}
	if weeklyTotals[0].WeekStart != "2026-05-11" {
		t.Fatalf("expected first bucket 2026-05-11, got %s", weeklyTotals[0].WeekStart)
	}
	if len(contributors) != 2 {
		t.Fatalf("expected 2 contributors, got %d", len(contributors))
	}
	if contributors[0].AuthorName != "Dana" || contributors[0].CommitCount != 2 {
		t.Fatalf("expected Dana first with 2 commits, got %+v", contributors[0])
	}
	if contributors[1].AuthorName != "Chris" || contributors[1].CommitCount != 1 {
		t.Fatalf("expected Chris second with 1 commit, got %+v", contributors[1])
	}
}
