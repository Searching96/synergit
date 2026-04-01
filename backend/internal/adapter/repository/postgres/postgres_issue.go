package postgres

import (
	"database/sql"
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.IssueRepository = (*PostgresIssueStore)(nil)

type PostgresIssueStore struct {
	db *sql.DB
}

func NewPostgresIssueStore(db *sql.DB) *PostgresIssueStore {
	return &PostgresIssueStore{db: db}
}

func (p *PostgresIssueStore) Create(issue *domain.Issue) error {
	query := `
		INSERT INTO issues (id, repo_id, creator_id, title, description, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := p.db.Exec(query, issue.ID, issue.RepoID, issue.CreatorID,
		issue.Title, issue.Description, issue.Status, issue.CreatedAt, issue.UpdatedAt)

	return err
}

func (p *PostgresIssueStore) GetByID(issueID uuid.UUID) (*domain.Issue, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, status, created_at, updated_at
		FROM issues
		WHERE id = $1`

	var issue domain.Issue
	err := p.db.QueryRow(query, issueID).Scan(
		&issue.ID,
		&issue.RepoID,
		&issue.CreatorID,
		&issue.Title,
		&issue.Description,
		&issue.Status,
		&issue.CreatedAt,
		&issue.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return &issue, nil
}

func (p *PostgresIssueStore) ListByRepo(repoID uuid.UUID) ([]domain.Issue, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, status, created_at, updated_at
		FROM issues
		WHERE repo_id = $1
		ORDER BY created_at DESC`

	rows, err := p.db.Query(query, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	issues := []domain.Issue{}
	for rows.Next() {
		var issue domain.Issue
		if err := rows.Scan(
			&issue.ID,
			&issue.RepoID,
			&issue.CreatorID,
			&issue.Title,
			&issue.Description,
			&issue.Status,
			&issue.CreatedAt,
			&issue.UpdatedAt,
		); err != nil {
			return nil, err
		}

		issues = append(issues, issue)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return issues, nil
}

func (p *PostgresIssueStore) UpdateStatus(issueID uuid.UUID,
	status domain.IssueStatus) error {

	query := `
		UPDATE issues
		SET status = $1, updated_at = NOW()
		WHERE id = $2`

	_, err := p.db.Exec(query, status, issueID)
	return err
}

func (p *PostgresIssueStore) AddAssignee(issueID uuid.UUID,
	userID uuid.UUID) error {

	query := `
		INSERT INTO issue_assignees (issue_id, user_id, assigned_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (issue_id, user_id) DO NOTHING`

	result, err := p.db.Exec(query, issueID, userID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if affected == 0 {
		return errors.New("assignee already exists on issue")
	}

	return nil
}

func (p *PostgresIssueStore) RemoveAssignee(issueID uuid.UUID,
	userID uuid.UUID) error {

	query := `
		DELETE FROM issue_assignees
		WHERE issue_id = $1 AND user_id = $2`

	result, err := p.db.Exec(query, issueID, userID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if affected == 0 {
		return errors.New("assignee not found on issue")
	}

	return nil
}

func (p *PostgresIssueStore) ListAssignees(issueID uuid.UUID) ([]domain.IssueAssignee,
	error) {

	query := `
		SELECT issue_id, user_id, assigned_at
		FROM issue_assignees
		WHERE issue_id = $1
		ORDER BY assigned_at ASC`

	rows, err := p.db.Query(query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	assignees := []domain.IssueAssignee{}
	for rows.Next() {
		var assignee domain.IssueAssignee
		if err := rows.Scan(&assignee.IssueID, &assignee.UserID,
			&assignee.AssignedAt); err != nil {

			return nil, err
		}

		assignees = append(assignees, assignee)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return assignees, nil
}
