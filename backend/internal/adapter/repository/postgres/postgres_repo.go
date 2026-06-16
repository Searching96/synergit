package postgres

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"

	"github.com/google/uuid"
	// This blank import registers the Postgres driver with the database/sql package
	_ "github.com/lib/pq"
)

var _ output.RepoRepository = (*PostgresRepoStore)(nil)

type PostgresRepoStore struct {
	db *sql.DB
}

func NewPostgresRepoStore(db *sql.DB) *PostgresRepoStore {
	return &PostgresRepoStore{db: db}
}

func (p *PostgresRepoStore) Save(repo *domain.Repo) error {
	query := `
	INSERT INTO repositories (name, path, created_at, description, visibility, primary_language, parent_id)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id`

	description := strings.TrimSpace(repo.Description)
	visibility := repo.Visibility
	if visibility == "" {
		visibility = domain.RepoVisibilityPublic
	}
	primaryLanguage := strings.TrimSpace(repo.PrimaryLanguage)

	err := p.db.QueryRow(
		query,
		repo.Name,
		repo.Path,
		repo.CreatedAt,
		description,
		visibility,
		primaryLanguage,
		repo.ParentID,
	).Scan(&repo.ID)

	repo.Description = description
	repo.Visibility = visibility
	repo.PrimaryLanguage = primaryLanguage

	return err
}

func (p *PostgresRepoStore) FindAll() ([]*domain.Repo, error) {
	query := `
		SELECT id, name, path, created_at, description, website, topics, visibility, primary_language, parent_id
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

func (p *PostgresRepoStore) FindVisibleToUser(userID uuid.UUID) ([]*domain.Repo, error) {
	query := `
		SELECT DISTINCT r.id, r.name, r.path, r.created_at, r.description, r.website, r.topics, r.visibility, r.primary_language, r.parent_id,
		       COALESCE(owner_user.username, ''),
		       (SELECT COUNT(*) FROM issues i WHERE i.repo_id = r.id AND i.status = 'OPEN') AS open_issues,
		       (SELECT COUNT(*) FROM pull_requests pr WHERE pr.repo_id = r.id AND pr.status = 'OPEN') AS open_pulls
		FROM repositories r
		LEFT JOIN repository_collaborators rc
			ON rc.repository_id = r.id AND rc.user_id = $1
		LEFT JOIN repository_collaborators owner_rc
			ON owner_rc.repository_id = r.id AND owner_rc.role = 'OWNER'
		LEFT JOIN users owner_user ON owner_user.id = owner_rc.user_id
		WHERE r.visibility = 'PUBLIC' OR rc.user_id IS NOT NULL
		ORDER BY r.created_at`

	rows, err := p.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	repos := []*domain.Repo{}
	for rows.Next() {
		repo := &domain.Repo{}
		var description, website, visibility, primaryLanguage, owner, parentID sql.NullString
		var topicsJSON []byte
		if err := rows.Scan(&repo.ID, &repo.Name, &repo.Path, &repo.CreatedAt,
			&description, &website, &topicsJSON, &visibility, &primaryLanguage, &parentID, &owner,
			&repo.OpenIssuesCount, &repo.OpenPullsCount); err != nil {
			return nil, err
		}
		repo.Description = strings.TrimSpace(description.String)
		repo.Website = strings.TrimSpace(website.String)
		if len(topicsJSON) > 0 {
			_ = json.Unmarshal(topicsJSON, &repo.Topics)
		}
		repo.Visibility = domain.RepoVisibility(strings.TrimSpace(visibility.String))
		if repo.Visibility == "" {
			repo.Visibility = domain.RepoVisibilityPublic
		}
		repo.PrimaryLanguage = strings.TrimSpace(primaryLanguage.String)
		if parentID.Valid {
			parentIDStr := parentID.String
			repo.ParentID = &parentIDStr
		}
		repo.Owner = strings.TrimSpace(owner.String)
		repos = append(repos, repo)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return repos, nil
}

func (p *PostgresRepoStore) CountOwnedByUser(userID uuid.UUID) (int, error) {
	var count int
	err := p.db.QueryRow(`
		SELECT COUNT(*)
		FROM repositories r
		JOIN repository_collaborators rc ON rc.repository_id = r.id
		WHERE rc.user_id = $1 AND rc.role = 'OWNER'`, userID).Scan(&count)

	return count, err
}

func (p *PostgresRepoStore) FindByID(id uuid.UUID) (*domain.Repo, error) {
	query := `
		SELECT id, name, path, created_at, description, website, topics, visibility, primary_language, parent_id
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
		SELECT id, name, path, created_at, description, website, topics, visibility, primary_language, parent_id
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

func (p *PostgresRepoStore) FindPublicByOwnerAndName(ownerUsername string, repoName string) (*domain.Repo, error) {
	query := `
		SELECT id, name, path, created_at, description, website, topics, visibility, primary_language, parent_id
		FROM repositories
		WHERE visibility = 'PUBLIC'
			AND REPLACE(path, CHR(92), '/') LIKE '%' || $1 || '/' || $2 || '.git'
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

func (p *PostgresRepoStore) UpdateVisibility(id uuid.UUID, visibility domain.RepoVisibility) error {
	_, err := p.db.Exec(
		`UPDATE repositories SET visibility = $2 WHERE id = $1`,
		id,
		visibility,
	)

	return err
}

func (p *PostgresRepoStore) UpdateDetails(id uuid.UUID, description string, website string, topics []string) error {
	topicsJSON, _ := json.Marshal(topics)
	if string(topicsJSON) == "null" {
		topicsJSON = []byte("[]")
	}
	_, err := p.db.Exec(
		`UPDATE repositories SET description = $2, website = $3, topics = $4 WHERE id = $1`,
		id,
		description,
		website,
		topicsJSON,
	)
	return err
}

func (p *PostgresRepoStore) RenameByID(id uuid.UUID, name string, path string) error {
	_, err := p.db.Exec(
		`UPDATE repositories SET name = $2, path = $3 WHERE id = $1`,
		id,
		name,
		path,
	)

	return err
}

func (p *PostgresRepoStore) DeleteByID(id uuid.UUID) error {
	_, err := p.db.Exec(`DELETE FROM repositories WHERE id = $1`, id)
	return err
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanRepo(scanner rowScanner) (*domain.Repo, error) {
	repo := &domain.Repo{}
	var description sql.NullString
	var website sql.NullString
	var topicsJSON []byte
	var visibility sql.NullString
	var primaryLanguage sql.NullString
	var parentID sql.NullString

	err := scanner.Scan(
		&repo.ID,
		&repo.Name,
		&repo.Path,
		&repo.CreatedAt,
		&description,
		&website,
		&topicsJSON,
		&visibility,
		&primaryLanguage,
		&parentID,
	)
	if err != nil {
		return nil, err
	}

	if description.Valid {
		repo.Description = strings.TrimSpace(description.String)
	}
	if website.Valid {
		repo.Website = strings.TrimSpace(website.String)
	}
	if len(topicsJSON) > 0 {
		_ = json.Unmarshal(topicsJSON, &repo.Topics)
	}
	if visibility.Valid {
		repo.Visibility = domain.RepoVisibility(strings.TrimSpace(visibility.String))
	}
	if repo.Visibility == "" {
		repo.Visibility = domain.RepoVisibilityPublic
	}
	if primaryLanguage.Valid {
		repo.PrimaryLanguage = strings.TrimSpace(primaryLanguage.String)
	}
	if parentID.Valid {
		parentIDStr := parentID.String
		repo.ParentID = &parentIDStr
	}

	return repo, nil
}
