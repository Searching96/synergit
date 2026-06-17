package postgres

import (
	"database/sql"
	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

var _ output.RepoEventRepository = (*PostgresRepoEventStore)(nil)

type PostgresRepoEventStore struct {
	db *sql.DB
}

func NewPostgresRepoEventStore(db *sql.DB) *PostgresRepoEventStore {
	return &PostgresRepoEventStore{db: db}
}

func (p *PostgresRepoEventStore) Create(event *domain.RepoEvent) error {
	_, err := p.db.Exec(`
		INSERT INTO repo_events (id, repo_id, actor_id, event_type, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		event.ID, event.RepoID, event.ActorID, event.EventType, event.Payload, event.CreatedAt)
	return err
}

func (p *PostgresRepoEventStore) ListByRepoID(repoID uuid.UUID, limit, offset int) ([]domain.RepoEvent, error) {
	rows, err := p.db.Query(`
		SELECT e.id, e.repo_id, e.actor_id, e.event_type, e.payload, e.created_at,
		       u.username, u.email
		FROM repo_events e
		JOIN users u ON e.actor_id = u.id
		WHERE e.repo_id = $1
		ORDER BY e.created_at DESC
		LIMIT $2 OFFSET $3`, repoID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.RepoEvent
	for rows.Next() {
		var e domain.RepoEvent
		var u domain.User
		if err := rows.Scan(&e.ID, &e.RepoID, &e.ActorID, &e.EventType, &e.Payload, &e.CreatedAt,
			&u.Username, &u.Email); err != nil {
			return nil, err
		}
		u.ID = e.ActorID.String()
		e.Actor = &u
		events = append(events, e)
	}
	return events, nil
}

func (p *PostgresRepoEventStore) ListFilteredByRepoID(repoID uuid.UUID, eventType domain.EventType, limit, offset int) ([]domain.RepoEvent, error) {
	rows, err := p.db.Query(`
		SELECT e.id, e.repo_id, e.actor_id, e.event_type, e.payload, e.created_at,
		       u.username, u.email
		FROM repo_events e
		JOIN users u ON e.actor_id = u.id
		WHERE e.repo_id = $1 AND e.event_type = $2
		ORDER BY e.created_at DESC
		LIMIT $3 OFFSET $4`, repoID, eventType, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.RepoEvent
	for rows.Next() {
		var e domain.RepoEvent
		var u domain.User
		if err := rows.Scan(&e.ID, &e.RepoID, &e.ActorID, &e.EventType, &e.Payload, &e.CreatedAt,
			&u.Username, &u.Email); err != nil {
			return nil, err
		}
		u.ID = e.ActorID.String()
		e.Actor = &u
		events = append(events, e)
	}
	return events, nil
}
