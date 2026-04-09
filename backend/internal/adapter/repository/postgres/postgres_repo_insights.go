package postgres

import (
	"database/sql"
	"encoding/json"
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.RepoInsightsRepository = (*PostgresRepoInsightsStore)(nil)

type PostgresRepoInsightsStore struct {
	db *sql.DB
}

func NewPostgresRepoInsightsStore(db *sql.DB) *PostgresRepoInsightsStore {
	return &PostgresRepoInsightsStore{db: db}
}

func (p *PostgresRepoInsightsStore) SaveLatest(snapshot *domain.RepoInsightsSnapshot) error {
	commitTrendJSON, err := json.Marshal(snapshot.CommitTrend)
	if err != nil {
		return err
	}

	topContributorsJSON, err := json.Marshal(snapshot.TopContributors)
	if err != nil {
		return err
	}

	branchActivityJSON, err := json.Marshal(snapshot.BranchActivity)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO repo_insights (
			repo_id, computed_at, commits_last_30d, commit_trend, top_contributors, branch_activity, last_error)
		VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
		ON CONFLICT (repo_id) 
		DO UPDATE SET
			computed_at = EXCLUDED.computed_at,
			commits_last_30d = EXCLUDED.commits_last_30d,
			commit_trend = EXCLUDED.commit_trend,
			top_contributors = EXCLUDED.top_contributors,
			branch_activity = EXCLUDED.branch_activity,
			last_error = EXCLUDED.last_error`

	_, err = p.db.Exec(
		query,
		snapshot.RepoID,
		snapshot.ComputedAt,
		snapshot.CommitsLast30d,
		commitTrendJSON,
		topContributorsJSON,
		branchActivityJSON,
		nullableLastError(snapshot.LastError),
	)

	return err
}

func (p *PostgresRepoInsightsStore) GetLatestByRepoID(repoID uuid.UUID) (*domain.RepoInsightsSnapshot, error) {
	query := `
		SELECT repo_id, computed_at, commits_last_30d, commit_trend, top_contributors, branch_activity, last_error
		FROM repo_insights
		WHERE repo_id = $1`

	var snapshot domain.RepoInsightsSnapshot
	var commitTrendRaw []byte
	var topContributorsRaw []byte
	var branchActivityRaw []byte
	var lastError sql.NullString

	err := p.db.QueryRow(query, repoID).Scan(
		&snapshot.RepoID,
		&snapshot.ComputedAt,
		&snapshot.CommitsLast30d,
		&commitTrendRaw,
		&topContributorsRaw,
		&branchActivityRaw,
		&lastError,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // No insights found for this repo
		}
		return nil, err
	}

	if len(commitTrendRaw) > 0 {
		if err := json.Unmarshal(commitTrendRaw, &snapshot.CommitTrend); err != nil {
			return nil, errors.New("failed to parse commit trend data")
		}
	}

	if len(topContributorsRaw) > 0 {
		if err := json.Unmarshal(topContributorsRaw, &snapshot.TopContributors); err != nil {
			return nil, errors.New("failed to parse top contributors data")
		}
	}

	if len(branchActivityRaw) > 0 {
		if err := json.Unmarshal(branchActivityRaw, &snapshot.BranchActivity); err != nil {
			return nil, errors.New("failed to parse branch activity data")
		}
	}

	if snapshot.CommitTrend == nil {
		snapshot.CommitTrend = []domain.CommitTrendPoint{}
	}
	if snapshot.TopContributors == nil {
		snapshot.TopContributors = []domain.ContributorStat{}
	}
	if snapshot.BranchActivity == nil {
		snapshot.BranchActivity = []domain.BranchActivityStat{}
	}

	if lastError.Valid {
		snapshot.LastError = lastError.String
	}

	return &snapshot, nil
}

func nullableLastError(lastError string) any {
	if lastError == "" {
		return nil
	}
	return lastError
}
