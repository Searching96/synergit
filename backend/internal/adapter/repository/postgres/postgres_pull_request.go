package postgres

import (
	"database/sql"
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.PullRequestRepository = (*PostgresPullRequestStore)(nil)

type PostgresPullRequestStore struct {
	db *sql.DB
}

func NewPostgresPullRequestStore(db *sql.DB) *PostgresPullRequestStore {
	return &PostgresPullRequestStore{db: db}
}

func (p *PostgresPullRequestStore) Create(pr *domain.PullRequest) error {
	query := `
		INSERT INTO pull_requests (id, repo_id, creator_id, title, description, source_branch, target_branch, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err := p.db.Exec(query, pr.ID, pr.RepoID, pr.CreatorID, pr.Title, pr.Description,
		pr.SourceBranch, pr.TargetBranch, pr.Status, pr.CreatedAt, pr.UpdatedAt)
	return err
}

func (p *PostgresPullRequestStore) GetByID(id uuid.UUID) (*domain.PullRequest, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, source_branch, target_branch, status, created_at, updated_at 
		FROM pull_requests 
		WHERE id = $1`

	var pr domain.PullRequest
	err := p.db.QueryRow(query, id).Scan(&pr.ID, &pr.RepoID, &pr.CreatorID, &pr.Title,
		&pr.Description, &pr.SourceBranch, &pr.TargetBranch, &pr.Status, &pr.CreatedAt,
		&pr.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil // Or a custom not-found error
	}
	if err != nil {
		return nil, err
	}
	return &pr, nil
}

func (p *PostgresPullRequestStore) ListByRepo(repoID uuid.UUID) ([]domain.PullRequest, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, source_branch, target_branch, status, created_at, updated_at 
		FROM pull_requests 
		WHERE repo_id = $1
		ORDER BY created_at DESC`

	rows, err := p.db.Query(query, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pullRequests []domain.PullRequest
	for rows.Next() {
		var pr domain.PullRequest
		err := rows.Scan(&pr.ID, &pr.RepoID, &pr.CreatorID, &pr.Title, &pr.Description,
			&pr.SourceBranch, &pr.TargetBranch, &pr.Status, &pr.CreatedAt, &pr.UpdatedAt)
		if err != nil {
			return nil, err
		}
		pullRequests = append(pullRequests, pr)
	}
	return pullRequests, nil
}

func (p *PostgresPullRequestStore) GetSequenceNumber(repoID uuid.UUID,
	prID uuid.UUID) (int, error) {

	query := `
		WITH numbered AS (
			SELECT id,
			ROW_NUMBER() OVER (PARTITION BY repo_id ORDER BY created_at ASC) AS pr_number
			FROM pull_requests
			WHERE repo_id = $1
		)
		SELECT pr_number
		FROM numbered
		WHERE id = $2`

	var sequenceNumber int
	err := p.db.QueryRow(query, repoID, prID).Scan(&sequenceNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, errors.New("pull request not found")
		}
		return 0, err
	}

	return sequenceNumber, nil
}

func (p *PostgresPullRequestStore) UpdateStatus(id uuid.UUID, status domain.PullRequestStatus) error {
	query := `
		UPDATE pull_requests 
		SET status = $1, updated_at = NOW() 
		WHERE id = $2`
	_, err := p.db.Exec(query, status, id)
	return err
}
