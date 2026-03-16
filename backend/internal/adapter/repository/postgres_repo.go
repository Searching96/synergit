package repository

import (
	"database/sql"
	"synergit/internal/core/domain"

	// This blank import registers the Postgres driver with the database/sql package
	_ "github.com/lib/pq"
)

type PostgresRepoStore struct {
	db *sql.DB
}

func NewPostgresRepoStore(db *sql.DB) *PostgresRepoStore {
	return &PostgresRepoStore{db: db}
}

func (p *PostgresRepoStore) Save(repo *domain.Repository) error {
	query := `
	INSERT INTO repositories (name, path, created_at)
	VALUES ($1, $2, $3)
	RETURNING id`

	err := p.db.QueryRow(query, repo.Name, repo.Path, repo.CreatedAt).Scan(&repo.ID)
	return err
}
