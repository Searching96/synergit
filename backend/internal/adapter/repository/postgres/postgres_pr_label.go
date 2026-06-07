package postgres

import (
	"database/sql"
	"synergit/internal/core/domain"
	"time"

	"github.com/google/uuid"
)

type PullRequestLabelStore struct {
	db *sql.DB
}

func NewPullRequestLabelStore(db *sql.DB) *PullRequestLabelStore {
	return &PullRequestLabelStore{db: db}
}

func (s *PullRequestLabelStore) Add(prID uuid.UUID, labelID uuid.UUID) error {
	_, err := s.db.Exec(
		`INSERT INTO pull_request_labels (pull_request_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		prID, labelID,
	)
	return err
}

func (s *PullRequestLabelStore) Remove(prID uuid.UUID, labelID uuid.UUID) error {
	_, err := s.db.Exec(
		`DELETE FROM pull_request_labels WHERE pull_request_id = $1 AND label_id = $2`,
		prID, labelID,
	)
	return err
}

func (s *PullRequestLabelStore) ListForPR(prID uuid.UUID) ([]domain.Label, error) {
	rows, err := s.db.Query(
		`SELECT l.id, l.repo_id, l.name, l.color, COALESCE(l.description, '')
		 FROM labels l JOIN pull_request_labels pl ON l.id = pl.label_id
		 WHERE pl.pull_request_id = $1`, prID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var labels []domain.Label
	for rows.Next() {
		var l domain.Label
		if err := rows.Scan(&l.ID, &l.RepoID, &l.Name, &l.Color, &l.Description); err != nil {
			return nil, err
		}
		labels = append(labels, l)
	}
	return labels, nil
}

type PullRequestAssigneeStore struct {
	db *sql.DB
}

func NewPullRequestAssigneeStore(db *sql.DB) *PullRequestAssigneeStore {
	return &PullRequestAssigneeStore{db: db}
}

func (s *PullRequestAssigneeStore) Assign(prID uuid.UUID, userID uuid.UUID) error {
	_, err := s.db.Exec(
		`INSERT INTO pull_request_assignees (pull_request_id, user_id, assigned_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		prID, userID, time.Now(),
	)
	return err
}

func (s *PullRequestAssigneeStore) Unassign(prID uuid.UUID, userID uuid.UUID) error {
	_, err := s.db.Exec(
		`DELETE FROM pull_request_assignees WHERE pull_request_id = $1 AND user_id = $2`,
		prID, userID,
	)
	return err
}

type PRAssignee struct {
	UserID     uuid.UUID `json:"user_id"`
	AssignedAt time.Time `json:"assigned_at"`
}

func (s *PullRequestAssigneeStore) List(prID uuid.UUID) ([]PRAssignee, error) {
	rows, err := s.db.Query(
		`SELECT user_id, assigned_at FROM pull_request_assignees WHERE pull_request_id = $1 ORDER BY assigned_at`,
		prID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignees []PRAssignee
	for rows.Next() {
		var a PRAssignee
		if err := rows.Scan(&a.UserID, &a.AssignedAt); err != nil {
			return nil, err
		}
		assignees = append(assignees, a)
	}
	return assignees, nil
}
