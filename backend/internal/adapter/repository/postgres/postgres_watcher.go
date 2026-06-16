package postgres

import (
	"database/sql"
	"synergit/internal/core/boundary/output"

	"github.com/google/uuid"
)

var _ output.WatcherRepository = (*PostgresWatcherStore)(nil)

type PostgresWatcherStore struct {
	db *sql.DB
}

func NewPostgresWatcherStore(db *sql.DB) *PostgresWatcherStore {
	return &PostgresWatcherStore{db: db}
}

func (p *PostgresWatcherStore) Watch(userID uuid.UUID, repoID uuid.UUID) error {
	_, err := p.db.Exec(`
		INSERT INTO repo_watchers (user_id, repo_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (repo_id, user_id) DO NOTHING`, userID, repoID)
	return err
}

func (p *PostgresWatcherStore) Unwatch(userID uuid.UUID, repoID uuid.UUID) error {
	_, err := p.db.Exec(`
		DELETE FROM repo_watchers WHERE user_id = $1 AND repo_id = $2`, userID, repoID)
	return err
}

func (p *PostgresWatcherStore) IsWatched(userID uuid.UUID, repoID uuid.UUID) (bool, error) {
	var exists bool
	err := p.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM repo_watchers WHERE user_id = $1 AND repo_id = $2)`,
		userID, repoID).Scan(&exists)
	return exists, err
}

func (p *PostgresWatcherStore) CountForRepo(repoID uuid.UUID) (int, error) {
	var count int
	err := p.db.QueryRow(`SELECT COUNT(*) FROM repo_watchers WHERE repo_id = $1`, repoID).Scan(&count)
	return count, err
}
