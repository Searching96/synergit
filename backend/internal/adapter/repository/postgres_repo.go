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

func (p *PostgresRepoStore) FindAll() ([]*domain.Repository, error) {
	query := `SELECT id, name, path, created_at FROM repositories ORDER BY created_at`

	rows, err := p.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // Always close rows to free up database connections

	var repos []*domain.Repository

	// Iterate over the rows
	for rows.Next() {
		repo := &domain.Repository{}

		// Scan copies the the columns in the current row into the values pointed at by dest
		err := rows.Scan(&repo.ID, &repo.Name, &repo.Path, &repo.CreatedAt)
		if err != nil {
			return nil, err
		}
		repos = append(repos, repo)
	}

	// Check for the errors that might have happened during the iteration
	if err = rows.Err(); err != nil {
		return nil, err
	}

	// If the table is empty, repos will be nil, which Gin will serialize as "null"
	// It's usually better API design to return an empty array instead
	if repos == nil {
		repos = []*domain.Repository{}
	}

	return repos, nil
}
