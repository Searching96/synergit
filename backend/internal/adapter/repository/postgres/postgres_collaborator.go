package postgres

import (
	"database/sql"
	"fmt"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"

	"github.com/google/uuid"
)

var _ output.CollaboratorRepository = (*PostgresCollaboratorStore)(nil)

type PostgresCollaboratorStore struct {
	db *sql.DB
}

func NewPostgresCollaboratorStore(db *sql.DB) *PostgresCollaboratorStore {
	return &PostgresCollaboratorStore{db: db}
}

func (p *PostgresCollaboratorStore) AddCollaborator(repoID uuid.UUID, userID uuid.UUID,
	role domain.CollaboratorRole) error {

	query := `
		INSERT INTO repository_collaborators (repository_id, user_id, role)
		VALUES ($1, $2, $3)`
	_, err := p.db.Exec(query, repoID, userID, string(role))
	return err
}

func (p *PostgresCollaboratorStore) RemoveCollaborator(repoID uuid.UUID, userID uuid.UUID) error {
	query := `
		DELETE FROM repository_collaborators 
		WHERE repository_id = $1 AND user_id = $2`
	_, err := p.db.Exec(query, repoID, userID)
	return err
}

func (p *PostgresCollaboratorStore) GetRole(repoID uuid.UUID,
	userID uuid.UUID) (domain.CollaboratorRole, error) {

	query := `
		SELECT role FROM repository_collaborators
		WHERE repository_id = $1 AND user_id = $2`
	var roleRaw string
	err := p.db.QueryRow(query, repoID, userID).Scan(&roleRaw)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}

	role, parseErr := domain.ParseCollaboratorRole(roleRaw)
	if parseErr != nil {
		return "", fmt.Errorf("invalid collaborator role in database: %w", parseErr)
	}

	return role, nil
}

func (p *PostgresCollaboratorStore) GetCollaborators(repoID uuid.UUID) ([]domain.RepoCollaborator, error) {
	query := `
		SELECT rc.repository_id, rc.user_id, u.username, rc.role, rc.created_at 
		FROM repository_collaborators rc
		JOIN users u ON u.id = rc.user_id
		WHERE rc.repository_id = $1`
	rows, err := p.db.Query(query, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collabs []domain.RepoCollaborator
	for rows.Next() {
		var c domain.RepoCollaborator
		var roleRaw string
		if err := rows.Scan(&c.RepositoryID, &c.UserID, &c.Username, &roleRaw, &c.CreatedAt); err != nil {
			return nil, err
		}

		role, parseErr := domain.ParseCollaboratorRole(roleRaw)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid collaborator role in database: %w", parseErr)
		}

		c.Role = role
		collabs = append(collabs, c)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return collabs, nil
}
