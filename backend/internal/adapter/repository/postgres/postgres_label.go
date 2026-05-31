package postgres

import (
	"database/sql"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.LabelRepository = (*PostgresLabelStore)(nil)

type PostgresLabelStore struct {
	db *sql.DB
}

func NewPostgresLabelStore(db *sql.DB) *PostgresLabelStore {
	return &PostgresLabelStore{db: db}
}

func (p *PostgresLabelStore) Create(label *domain.Label) error {
	query := `
		INSERT INTO labels (id, repo_id, name, color, description, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`

	_, err := p.db.Exec(query, label.ID, label.RepoID, label.Name,
		label.Color, label.Description)
	return err
}

func (p *PostgresLabelStore) ListByRepo(repoID uuid.UUID) ([]domain.Label, error) {
	return p.queryLabels(`
		SELECT id, repo_id, name, color, description, created_at
		FROM labels
		WHERE repo_id = $1
		ORDER BY name ASC`, repoID)
}

func (p *PostgresLabelStore) ListForIssue(issueID uuid.UUID) ([]domain.Label, error) {
	return p.queryLabels(`
		SELECT l.id, l.repo_id, l.name, l.color, l.description, l.created_at
		FROM labels l
		JOIN issue_labels il ON il.label_id = l.id
		WHERE il.issue_id = $1
		ORDER BY l.name ASC`, issueID)
}

func (p *PostgresLabelStore) AddToIssue(issueID uuid.UUID, labelID uuid.UUID) error {
	query := `
		INSERT INTO issue_labels (issue_id, label_id)
		VALUES ($1, $2)
		ON CONFLICT (issue_id, label_id) DO NOTHING`

	_, err := p.db.Exec(query, issueID, labelID)
	return err
}

func (p *PostgresLabelStore) RemoveFromIssue(issueID uuid.UUID, labelID uuid.UUID) error {
	query := `
		DELETE FROM issue_labels
		WHERE issue_id = $1 AND label_id = $2`

	_, err := p.db.Exec(query, issueID, labelID)
	return err
}

func (p *PostgresLabelStore) queryLabels(query string, arg uuid.UUID) ([]domain.Label, error) {
	rows, err := p.db.Query(query, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	labels := []domain.Label{}
	for rows.Next() {
		var label domain.Label
		if err := rows.Scan(&label.ID, &label.RepoID, &label.Name,
			&label.Color, &label.Description, &label.CreatedAt); err != nil {
			return nil, err
		}
		labels = append(labels, label)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return labels, nil
}
