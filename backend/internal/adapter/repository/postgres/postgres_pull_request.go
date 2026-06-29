package postgres

import (
	"database/sql"
	"errors"
	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

var _ output.PullRequestRepository = (*PostgresPullRequestStore)(nil)

type PostgresPullRequestStore struct {
	db *sql.DB
}

func NewPostgresPullRequestStore(db *sql.DB) *PostgresPullRequestStore {
	return &PostgresPullRequestStore{db: db}
}

func (p *PostgresPullRequestStore) Create(pr *domain.PullRequest) error {
	query := `
		INSERT INTO pull_requests (id, repo_id, creator_id, title, description, source_branch, target_branch, source_commit_hash, target_commit_hash, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := p.db.Exec(query, pr.ID, pr.RepoID, pr.CreatorID, pr.Title, pr.Description,
		pr.SourceBranch, pr.TargetBranch, pr.SourceCommitHash, pr.TargetCommitHash,
		pr.Status, pr.CreatedAt, pr.UpdatedAt)
	return err
}

func (p *PostgresPullRequestStore) GetByID(id uuid.UUID) (*domain.PullRequest, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, source_branch, target_branch, source_commit_hash, target_commit_hash, status, created_at, updated_at 
		FROM pull_requests 
		WHERE id = $1`

	var pr domain.PullRequest
	err := p.db.QueryRow(query, id).Scan(&pr.ID, &pr.RepoID, &pr.CreatorID, &pr.Title,
		&pr.Description, &pr.SourceBranch, &pr.TargetBranch, &pr.SourceCommitHash,
		&pr.TargetCommitHash, &pr.Status, &pr.CreatedAt, &pr.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil // Or a custom not-found error
	}
	if err != nil {
		return nil, err
	}
	return &pr, nil
}

func (p *PostgresPullRequestStore) ListByRepo(repoID uuid.UUID) ([]domain.PullRequest, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, source_branch, target_branch, source_commit_hash, target_commit_hash, status, created_at, updated_at 
		FROM pull_requests 
		WHERE repo_id = $1
		ORDER BY created_at DESC`

	rows, err := p.db.Query(query, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pullRequests []domain.PullRequest
	for rows.Next() {
		var pr domain.PullRequest
		err := rows.Scan(&pr.ID, &pr.RepoID, &pr.CreatorID, &pr.Title, &pr.Description,
			&pr.SourceBranch, &pr.TargetBranch, &pr.SourceCommitHash, &pr.TargetCommitHash,
			&pr.Status, &pr.CreatedAt, &pr.UpdatedAt)
		if err != nil {
			return nil, err
		}
		pullRequests = append(pullRequests, pr)
	}
	return pullRequests, nil
}

func (p *PostgresPullRequestStore) GetSequenceNumber(repoID uuid.UUID,
	prID uuid.UUID) (int, error) {

	query := `
		WITH numbered AS (
			SELECT id,
			ROW_NUMBER() OVER (PARTITION BY repo_id ORDER BY created_at ASC) AS pr_number
			FROM pull_requests
			WHERE repo_id = $1
		)
		SELECT pr_number
		FROM numbered
		WHERE id = $2`

	var sequenceNumber int
	err := p.db.QueryRow(query, repoID, prID).Scan(&sequenceNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, errors.New("pull request not found")
		}
		return 0, err
	}

	return sequenceNumber, nil
}

func (p *PostgresPullRequestStore) UpdateStatus(id uuid.UUID, status domain.PullRequestStatus) error {
	query := `
		UPDATE pull_requests 
		SET status = $1, updated_at = NOW() 
		WHERE id = $2`
	_, err := p.db.Exec(query, status, id)
	return err
}

func (p *PostgresPullRequestStore) UpdateCommitHashes(id uuid.UUID, sourceCommitHash string,
	targetCommitHash string) error {

	query := `
		UPDATE pull_requests
		SET source_commit_hash = $1, target_commit_hash = $2, updated_at = NOW()
		WHERE id = $3`
	_, err := p.db.Exec(query, sourceCommitHash, targetCommitHash, id)
	return err
}

func (p *PostgresPullRequestStore) AddEvent(prID uuid.UUID, actorID uuid.UUID,
	eventType string) error {

	query := `
		INSERT INTO pull_request_events (id, pull_request_id, actor_id, event_type, created_at)
		VALUES ($1, $2, $3, $4, NOW())`

	_, err := p.db.Exec(query, uuid.New(), prID, actorID, eventType)
	return err
}

func (p *PostgresPullRequestStore) AddEventWithPayload(prID uuid.UUID, actorID uuid.UUID,
	eventType string, payload []byte) error {

	query := `
		INSERT INTO pull_request_events (id, pull_request_id, actor_id, event_type, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`

	_, err := p.db.Exec(query, uuid.New(), prID, actorID, eventType, payload)
	return err
}

func (p *PostgresPullRequestStore) ListEvents(prID uuid.UUID) ([]domain.PullRequestEvent, error) {
	query := `
		SELECT e.id, e.pull_request_id, e.actor_id, u.username, e.event_type, e.payload, e.created_at
		FROM pull_request_events e
		JOIN users u ON u.id = e.actor_id
		WHERE e.pull_request_id = $1
		ORDER BY e.created_at ASC`

	rows, err := p.db.Query(query, prID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []domain.PullRequestEvent{}
	for rows.Next() {
		var event domain.PullRequestEvent
		if err := rows.Scan(&event.ID, &event.PullRequestID, &event.ActorID,
			&event.Actor, &event.EventType, &event.Payload, &event.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return events, nil
}

func (p *PostgresPullRequestStore) LinkIssue(prID uuid.UUID, issueID uuid.UUID) error {
	query := `
		INSERT INTO pull_request_linked_issues (pull_request_id, issue_id, linked_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT DO NOTHING`

	_, err := p.db.Exec(query, prID, issueID)
	return err
}

func (p *PostgresPullRequestStore) UnlinkIssue(prID uuid.UUID, issueID uuid.UUID) error {
	query := `
		DELETE FROM pull_request_linked_issues
		WHERE pull_request_id = $1 AND issue_id = $2`

	_, err := p.db.Exec(query, prID, issueID)
	return err
}

func (p *PostgresPullRequestStore) ListLinkedIssues(prID uuid.UUID) ([]domain.Issue, error) {
	query := `
		SELECT i.id, i.repo_id, i.creator_id, i.title, i.description, i.status, i.close_reason, i.created_at, i.updated_at
		FROM issues i
		JOIN pull_request_linked_issues prli ON i.id = prli.issue_id
		WHERE prli.pull_request_id = $1
		ORDER BY prli.linked_at ASC`

	rows, err := p.db.Query(query, prID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []domain.Issue
	for rows.Next() {
		var issue domain.Issue
		var closeReason sql.NullString
		err := rows.Scan(&issue.ID, &issue.RepoID, &issue.CreatorID, &issue.Title,
			&issue.Description, &issue.Status, &closeReason, &issue.CreatedAt, &issue.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if closeReason.Valid {
			issue.CloseReason = domain.IssueCloseReason(closeReason.String)
		}
		issues = append(issues, issue)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return issues, nil
}

func (p *PostgresPullRequestStore) ListLinkedPRsForIssue(issueID uuid.UUID) ([]domain.PullRequest, error) {
	query := `
		SELECT pr.id, pr.repo_id, pr.creator_id, pr.title, pr.description, pr.source_branch, pr.target_branch, pr.source_commit_hash, pr.target_commit_hash, pr.status, pr.created_at, pr.updated_at
		FROM pull_requests pr
		JOIN pull_request_linked_issues prli ON pr.id = prli.pull_request_id
		WHERE prli.issue_id = $1
		ORDER BY prli.linked_at ASC`

	rows, err := p.db.Query(query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pullRequests []domain.PullRequest
	for rows.Next() {
		var pr domain.PullRequest
		err := rows.Scan(&pr.ID, &pr.RepoID, &pr.CreatorID, &pr.Title, &pr.Description,
			&pr.SourceBranch, &pr.TargetBranch, &pr.SourceCommitHash, &pr.TargetCommitHash,
			&pr.Status, &pr.CreatedAt, &pr.UpdatedAt)
		if err != nil {
			return nil, err
		}
		pullRequests = append(pullRequests, pr)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return pullRequests, nil
}
