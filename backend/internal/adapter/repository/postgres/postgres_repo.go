package postgres

import (
	"database/sql"
	"errors"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
	// This blank import registers the Postgres driver with the database/sql package
	_ "github.com/lib/pq"
)

var _ port.RepoRepository = (*PostgresRepoStore)(nil)

type PostgresRepoStore struct {
	db *sql.DB
}

func NewPostgresRepoStore(db *sql.DB) *PostgresRepoStore {
	return &PostgresRepoStore{db: db}
}

func (p *PostgresRepoStore) Save(repo *domain.Repo) error {
	query := `
	INSERT INTO repositories (name, path, created_at, description, visibility, primary_language)
	VALUES ($1, $2, $3, $4, $5, $6)
	RETURNING id`

	description := strings.TrimSpace(repo.Description)
	visibility := string(normalizeVisibility(string(repo.Visibility)))
	primaryLanguage := strings.TrimSpace(repo.PrimaryLanguage)

	err := p.db.QueryRow(
		query,
		repo.Name,
		repo.Path,
		repo.CreatedAt,
		description,
		visibility,
		primaryLanguage,
	).Scan(&repo.ID)

	repo.Description = description
	repo.Visibility = normalizeVisibility(visibility)
	repo.PrimaryLanguage = primaryLanguage

	return err
}

func (p *PostgresRepoStore) FindAll() ([]*domain.Repo, error) {
	query := `
		SELECT id, name, path, created_at, description, visibility, primary_language
		FROM repositories
		ORDER BY created_at`

	rows, err := p.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // Always close rows to free up database connections

	var repos []*domain.Repo

	// Iterate over the rows
	for rows.Next() {
		repo, err := scanRepo(rows)
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
	query := `
		SELECT id, name, path, created_at, description, visibility, primary_language
		FROM repositories
		WHERE id = $1`

	repo, err := scanRepo(p.db.QueryRow(query, id))
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
		SELECT id, name, path, created_at, description, visibility, primary_language
		FROM repositories
		WHERE REPLACE(path, CHR(92), '/') LIKE '%' || $1 || '/' || $2 || '.git'
		ORDER BY created_at DESC
		LIMIT 1`

	repo, err := scanRepo(p.db.QueryRow(query, ownerUsername, repoName))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return repo, nil
}

func (p *PostgresRepoStore) UpdatePrimaryLanguage(id uuid.UUID, primaryLanguage string) error {
	_, err := p.db.Exec(
		`UPDATE repositories SET primary_language = $2 WHERE id = $1`,
		id,
		strings.TrimSpace(primaryLanguage),
	)

	return err
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanRepo(scanner rowScanner) (*domain.Repo, error) {
	repo := &domain.Repo{}
	var description sql.NullString
	var visibility sql.NullString
	var primaryLanguage sql.NullString

	err := scanner.Scan(
		&repo.ID,
		&repo.Name,
		&repo.Path,
		&repo.CreatedAt,
		&description,
		&visibility,
		&primaryLanguage,
	)
	if err != nil {
		return nil, err
	}

	if description.Valid {
		repo.Description = strings.TrimSpace(description.String)
	}
	repo.Visibility = normalizeVisibility(visibility.String)
	if primaryLanguage.Valid {
		repo.PrimaryLanguage = strings.TrimSpace(primaryLanguage.String)
	}

	return repo, nil
}

func normalizeVisibility(raw string) domain.RepoVisibility {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	if normalized == string(domain.RepoVisibilityPrivate) {
		return domain.RepoVisibilityPrivate
	}

	return domain.RepoVisibilityPublic
}
