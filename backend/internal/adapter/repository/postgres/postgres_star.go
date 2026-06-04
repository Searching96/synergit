package postgres

import (
	"database/sql"
	"strings"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.StarRepository = (*PostgresStarStore)(nil)

type PostgresStarStore struct {
	db *sql.DB
}

func NewPostgresStarStore(db *sql.DB) *PostgresStarStore {
	return &PostgresStarStore{db: db}
}

func (p *PostgresStarStore) Star(userID uuid.UUID, repoID uuid.UUID) error {
	_, err := p.db.Exec(`
		INSERT INTO repo_stars (user_id, repo_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id, repo_id) DO NOTHING`, userID, repoID)
	return err
}

func (p *PostgresStarStore) Unstar(userID uuid.UUID, repoID uuid.UUID) error {
	_, err := p.db.Exec(`
		DELETE FROM repo_stars WHERE user_id = $1 AND repo_id = $2`, userID, repoID)
	return err
}

func (p *PostgresStarStore) IsStarred(userID uuid.UUID, repoID uuid.UUID) (bool, error) {
	var exists bool
	err := p.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM repo_stars WHERE user_id = $1 AND repo_id = $2)`,
		userID, repoID).Scan(&exists)
	return exists, err
}

func (p *PostgresStarStore) CountForRepo(repoID uuid.UUID) (int, error) {
	var count int
	err := p.db.QueryRow(`SELECT COUNT(*) FROM repo_stars WHERE repo_id = $1`, repoID).Scan(&count)
	return count, err
}

func (p *PostgresStarStore) ListStarredByUser(userID uuid.UUID) ([]*domain.Repo, error) {
	rows, err := p.db.Query(`
		SELECT r.id, r.name, r.path, r.created_at, r.description, r.visibility, r.primary_language,
		       COALESCE(u.username, '')
		FROM repositories r
		JOIN repo_stars s ON s.repo_id = r.id
		LEFT JOIN repository_collaborators rc ON rc.repository_id = r.id AND rc.role = 'OWNER'
		LEFT JOIN users u ON u.id = rc.user_id
		WHERE s.user_id = $1
		ORDER BY s.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	repos := []*domain.Repo{}
	for rows.Next() {
		repo := &domain.Repo{}
		var description, visibility, primaryLanguage, owner sql.NullString
		if err := rows.Scan(&repo.ID, &repo.Name, &repo.Path, &repo.CreatedAt,
			&description, &visibility, &primaryLanguage, &owner); err != nil {
			return nil, err
		}
		repo.Description = strings.TrimSpace(description.String)
		repo.Visibility = domain.RepoVisibility(strings.TrimSpace(visibility.String))
		if repo.Visibility == "" {
			repo.Visibility = domain.RepoVisibilityPublic
		}
		repo.PrimaryLanguage = strings.TrimSpace(primaryLanguage.String)
		repo.Owner = strings.TrimSpace(owner.String)
		repos = append(repos, repo)
	}

	return repos, rows.Err()
}

func (p *PostgresStarStore) CountStarredByUser(userID uuid.UUID) (int, error) {
	var count int
	err := p.db.QueryRow(`SELECT COUNT(*) FROM repo_stars WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}
