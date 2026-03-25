package postgres

import (
	"database/sql"
	"errors"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
	// This blank import registers the Postgres driver with the database/sql package
	_ "github.com/lib/pq"
)

type PostgresRepoStore struct {
	db *sql.DB
}

func NewPostgresRepoStore(db *sql.DB) *PostgresRepoStore {
	return &PostgresRepoStore{db: db}
}

func (p *PostgresRepoStore) Save(repo *domain.Repo) error {
	query := `
	INSERT INTO repositories (name, path, created_at)
	VALUES ($1, $2, $3)
	RETURNING id`

	err := p.db.QueryRow(query, repo.Name, repo.Path, repo.CreatedAt).Scan(&repo.ID)
	return err
}

func (p *PostgresRepoStore) FindAll() ([]*domain.Repo, error) {
	query := `SELECT id, name, path, created_at FROM repositories ORDER BY created_at`

	rows, err := p.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // Always close rows to free up database connections

	var repos []*domain.Repo

	// Iterate over the rows
	for rows.Next() {
		repo := &domain.Repo{}

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
		repos = []*domain.Repo{}
	}

	return repos, nil
}

func (p *PostgresRepoStore) FindByID(id uuid.UUID) (*domain.Repo, error) {
	query := `SELECT id, name, path, created_at FROM repositories WHERE id = $1`

	repo := &domain.Repo{}
	err := p.db.QueryRow(query, id).Scan(&repo.ID, &repo.Name, &repo.Path, &repo.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return repo, nil
}

func (p *PostgresRepoStore) FindByOwnerAndName(ownerUsername string, repoName string) (*domain.Repo, error) {
	query := `
		SELECT id, name, path, created_at
		FROM repositories
		WHERE REPLACE(path, CHR(92), '/') LIKE '%' || $1 || '/' || $2 || '.git'
		ORDER BY created_at DESC
		LIMIT 1`

	repo := &domain.Repo{}
	err := p.db.QueryRow(query, ownerUsername, repoName).Scan(&repo.ID, &repo.Name, &repo.Path, &repo.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return repo, nil
}
