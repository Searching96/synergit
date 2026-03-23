package postgres

import (
	"database/sql"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

type PostgresCollaboratorStore struct {
	db *sql.DB
}

func NewPostgresCollaboratorAdapter(db *sql.DB) domain.CollaboratorRepository {
	return &PostgresCollaboratorStore{db: db}
}

func (p *PostgresCollaboratorStore) AddCollaborator(repoID uuid.UUID, userID uuid.UUID, role string) error {
	query := `
		INSERT INTO repository_collaborators (repositori_id, user_id, role)
		VALUES ($1, $2, $3)`
	_, err := p.db.Exec(query, repoID, userID, role)
	return err
}

func (p *PostgresCollaboratorStore) RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID) error {
	query := `
		DELETE FROM repository_collaborators 
		WHERE repository_id = $1 AND user_id = $2`
	_, err := p.db.Exec(query, repoID, userID)
	return err
}

func (p *PostgresCollaboratorStore) GetRole(repoID uuid.UUID, userID uuid.UUID) (string, error) {
	query := `
		SELECT role FROM repository_collaborators
		WHERE repository_id = $1 AND user_id = $2`
	var role string
	err := p.db.QueryRow(query, repoID, userID).Scan(&role)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return role, err
}

func (p *PostgresCollaboratorStore) GetCollaborators(repoID uuid.UUID) ([]domain.RepoCollaborator, error) {
	query := `
		SELECT repository_id, user_id, role, created_at 
		FROM repository_collaborators
		WHERE repository_id = $1`
	rows, err := p.db.Query(query, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collabs []domain.RepoCollaborator
	for rows.Next() {
		var c domain.RepoCollaborator
		if err := rows.Scan(&c.RepositoryID, &c.UserID, &c.Role, &c.CreatedAt); err != nil {
			return nil, err
		}
		collabs = append(collabs, c)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return collabs, nil
}
