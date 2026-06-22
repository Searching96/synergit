package postgres

import (
	"database/sql"
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"

	"github.com/google/uuid"
)

var _ output.IssueRepository = (*PostgresIssueStore)(nil)

type PostgresIssueStore struct {
	db *sql.DB
}

func NewPostgresIssueStore(db *sql.DB) *PostgresIssueStore {
	store := &PostgresIssueStore{db: db}
	store.ensureRelationshipSchema()
	return store
}

func (p *PostgresIssueStore) ensureRelationshipSchema() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS issue_relationships (
			blocking_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
			blocked_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
			linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (blocking_issue_id, blocked_issue_id),
			CHECK (blocking_issue_id <> blocked_issue_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_issue_relationships_blocked
			ON issue_relationships (blocked_issue_id, linked_at)`,
		`CREATE INDEX IF NOT EXISTS idx_issue_relationships_blocking
			ON issue_relationships (blocking_issue_id, linked_at)`,
	}

	for _, query := range queries {
		_, _ = p.db.Exec(query)
	}
}

func (p *PostgresIssueStore) Create(issue *domain.Issue) error {
	query := `
		INSERT INTO issues (id, repo_id, creator_id, title, description, status, close_reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	closeReason := sql.NullString{}
	if issue.CloseReason != "" {
		closeReason = sql.NullString{String: string(issue.CloseReason), Valid: true}
	}

	_, err := p.db.Exec(query, issue.ID, issue.RepoID, issue.CreatorID,
		issue.Title, issue.Description, issue.Status, closeReason, issue.CreatedAt, issue.UpdatedAt)

	return err
}

func (p *PostgresIssueStore) GetByID(issueID uuid.UUID) (*domain.Issue, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, status, close_reason, created_at, updated_at
		FROM issues
		WHERE id = $1`

	var issue domain.Issue
	var closeReason sql.NullString
	err := p.db.QueryRow(query, issueID).Scan(
		&issue.ID,
		&issue.RepoID,
		&issue.CreatorID,
		&issue.Title,
		&issue.Description,
		&issue.Status,
		&closeReason,
		&issue.CreatedAt,
		&issue.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	if closeReason.Valid {
		issue.CloseReason = domain.IssueCloseReason(closeReason.String)
	}

	return &issue, nil
}

func (p *PostgresIssueStore) ListByRepo(repoID uuid.UUID) ([]domain.Issue, error) {
	query := `
		SELECT id, repo_id, creator_id, title, description, status, close_reason, created_at, updated_at
		FROM issues
		WHERE repo_id = $1
		ORDER BY created_at DESC`

	rows, err := p.db.Query(query, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	issues := []domain.Issue{}
	for rows.Next() {
		var issue domain.Issue
		var closeReason sql.NullString
		if err := rows.Scan(
			&issue.ID,
			&issue.RepoID,
			&issue.CreatorID,
			&issue.Title,
			&issue.Description,
			&issue.Status,
			&closeReason,
			&issue.CreatedAt,
			&issue.UpdatedAt,
		); err != nil {
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

func (p *PostgresIssueStore) UpdateStatus(issueID uuid.UUID,
	status domain.IssueStatus, closeReason domain.IssueCloseReason) error {

	closeReasonValue := sql.NullString{}
	if status == domain.IssueStatusClosed && closeReason != "" {
		closeReasonValue = sql.NullString{String: string(closeReason), Valid: true}
	}

	query := `
		UPDATE issues
		SET status = $1, close_reason = $2, updated_at = NOW()
		WHERE id = $3`

	_, err := p.db.Exec(query, status, closeReasonValue, issueID)
	return err
}

func (p *PostgresIssueStore) AddAssignee(issueID uuid.UUID,
	userID uuid.UUID) error {

	query := `
		INSERT INTO issue_assignees (issue_id, user_id, assigned_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (issue_id, user_id) DO NOTHING`

	result, err := p.db.Exec(query, issueID, userID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if affected == 0 {
		return errors.New("assignee already exists on issue")
	}

	return nil
}

func (p *PostgresIssueStore) RemoveAssignee(issueID uuid.UUID,
	userID uuid.UUID) error {

	query := `
		DELETE FROM issue_assignees
		WHERE issue_id = $1 AND user_id = $2`

	result, err := p.db.Exec(query, issueID, userID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if affected == 0 {
		return errors.New("assignee not found on issue")
	}

	return nil
}

func (p *PostgresIssueStore) ListAssignees(issueID uuid.UUID) ([]domain.IssueAssignee,
	error) {

	query := `
		SELECT issue_id, user_id, assigned_at
		FROM issue_assignees
		WHERE issue_id = $1
		ORDER BY assigned_at ASC`

	rows, err := p.db.Query(query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	assignees := []domain.IssueAssignee{}
	for rows.Next() {
		var assignee domain.IssueAssignee
		if err := rows.Scan(&assignee.IssueID, &assignee.UserID,
			&assignee.AssignedAt); err != nil {

			return nil, err
		}

		assignees = append(assignees, assignee)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return assignees, nil
}

func (p *PostgresIssueStore) AddEvent(issueID uuid.UUID, actorID uuid.UUID,
	eventType string) error {

	query := `
		INSERT INTO issue_events (id, issue_id, actor_id, event_type, created_at)
		VALUES ($1, $2, $3, $4, NOW())`

	_, err := p.db.Exec(query, uuid.New(), issueID, actorID, eventType)
	return err
}

func (p *PostgresIssueStore) AddEventWithPayload(issueID uuid.UUID, actorID uuid.UUID,
	eventType string, payload []byte) error {

	query := `
		INSERT INTO issue_events (id, issue_id, actor_id, event_type, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`

	_, err := p.db.Exec(query, uuid.New(), issueID, actorID, eventType, payload)
	return err
}

func (p *PostgresIssueStore) ListEvents(issueID uuid.UUID) ([]domain.IssueEvent, error) {
	query := `
		SELECT e.id, e.issue_id, e.actor_id, u.username, e.event_type, e.payload, e.created_at
		FROM issue_events e
		JOIN users u ON u.id = e.actor_id
		WHERE e.issue_id = $1
		ORDER BY e.created_at ASC`

	rows, err := p.db.Query(query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []domain.IssueEvent{}
	for rows.Next() {
		var event domain.IssueEvent
		if err := rows.Scan(&event.ID, &event.IssueID, &event.ActorID,
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

func (p *PostgresIssueStore) AddComment(comment *domain.IssueComment) error {
	query := `
		INSERT INTO issue_comments (id, issue_id, author_id, body, created_at)
		VALUES ($1, $2, $3, $4, NOW())`

	_, err := p.db.Exec(query, comment.ID, comment.IssueID, comment.AuthorID, comment.Body)
	return err
}

func (p *PostgresIssueStore) ListComments(issueID uuid.UUID) ([]domain.IssueComment, error) {
	query := `
		SELECT c.id, c.issue_id, c.author_id, u.username, c.body, c.created_at
		FROM issue_comments c
		JOIN users u ON u.id = c.author_id
		WHERE c.issue_id = $1
		ORDER BY c.created_at ASC`

	rows, err := p.db.Query(query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []domain.IssueComment{}
	for rows.Next() {
		var comment domain.IssueComment
		if err := rows.Scan(&comment.ID, &comment.IssueID, &comment.AuthorID,
			&comment.Author, &comment.Body, &comment.CreatedAt); err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

func (p *PostgresIssueStore) LinkBranch(issueID uuid.UUID, branchName string) error {
	query := `
		INSERT INTO issue_linked_branches (issue_id, branch_name, linked_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (issue_id, branch_name) DO NOTHING`

	_, err := p.db.Exec(query, issueID, branchName)
	return err
}

func (p *PostgresIssueStore) UnlinkBranch(issueID uuid.UUID, branchName string) error {
	query := `
		DELETE FROM issue_linked_branches
		WHERE issue_id = $1 AND branch_name = $2`

	_, err := p.db.Exec(query, issueID, branchName)
	return err
}

func (p *PostgresIssueStore) ListLinkedBranches(issueID uuid.UUID) ([]string, error) {
	query := `
		SELECT branch_name
		FROM issue_linked_branches
		WHERE issue_id = $1
		ORDER BY linked_at ASC`

	rows, err := p.db.Query(query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var branches []string
	for rows.Next() {
		var branch string
		if err := rows.Scan(&branch); err != nil {
			return nil, err
		}
		branches = append(branches, branch)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return branches, nil
}

func (p *PostgresIssueStore) LinkRelationship(blockingIssueID uuid.UUID, blockedIssueID uuid.UUID) error {
	query := `
		INSERT INTO issue_relationships (blocking_issue_id, blocked_issue_id, linked_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (blocking_issue_id, blocked_issue_id) DO NOTHING`

	result, err := p.db.Exec(query, blockingIssueID, blockedIssueID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return errors.New("issue relationship already exists")
	}

	return nil
}

func (p *PostgresIssueStore) UnlinkRelationship(blockingIssueID uuid.UUID, blockedIssueID uuid.UUID) error {
	query := `
		DELETE FROM issue_relationships
		WHERE blocking_issue_id = $1 AND blocked_issue_id = $2`

	result, err := p.db.Exec(query, blockingIssueID, blockedIssueID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return errors.New("issue relationship not found")
	}

	return nil
}

func (p *PostgresIssueStore) ListBlockedBy(issueID uuid.UUID) ([]domain.Issue, error) {
	query := `
		SELECT i.id, i.repo_id, i.creator_id, i.title, i.description, i.status, i.close_reason, i.created_at, i.updated_at
		FROM issues i
		JOIN issue_relationships ir ON ir.blocking_issue_id = i.id
		WHERE ir.blocked_issue_id = $1
		ORDER BY ir.linked_at ASC`

	return p.listRelationshipIssues(query, issueID)
}

func (p *PostgresIssueStore) ListBlocking(issueID uuid.UUID) ([]domain.Issue, error) {
	query := `
		SELECT i.id, i.repo_id, i.creator_id, i.title, i.description, i.status, i.close_reason, i.created_at, i.updated_at
		FROM issues i
		JOIN issue_relationships ir ON ir.blocked_issue_id = i.id
		WHERE ir.blocking_issue_id = $1
		ORDER BY ir.linked_at ASC`

	return p.listRelationshipIssues(query, issueID)
}

func (p *PostgresIssueStore) listRelationshipIssues(query string, issueID uuid.UUID) ([]domain.Issue, error) {
	rows, err := p.db.Query(query, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	issues := []domain.Issue{}
	for rows.Next() {
		var issue domain.Issue
		var closeReason sql.NullString
		if err := rows.Scan(
			&issue.ID,
			&issue.RepoID,
			&issue.CreatorID,
			&issue.Title,
			&issue.Description,
			&issue.Status,
			&closeReason,
			&issue.CreatedAt,
			&issue.UpdatedAt,
		); err != nil {
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

func (p *PostgresIssueStore) ListRelationshipEdgesByRepo(repoID uuid.UUID) ([]domain.IssueRelationshipEdge, error) {
	query := `
		SELECT ir.blocking_issue_id, ir.blocked_issue_id
		FROM issue_relationships ir
		JOIN issues blocking ON blocking.id = ir.blocking_issue_id
		JOIN issues blocked ON blocked.id = ir.blocked_issue_id
		WHERE blocking.repo_id = $1 AND blocked.repo_id = $1`

	rows, err := p.db.Query(query, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	edges := []domain.IssueRelationshipEdge{}
	for rows.Next() {
		var edge domain.IssueRelationshipEdge
		if err := rows.Scan(&edge.BlockingIssueID, &edge.BlockedIssueID); err != nil {
			return nil, err
		}
		edges = append(edges, edge)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return edges, nil
}

func (p *PostgresIssueStore) CountOpenBlockers(issueID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM issue_relationships ir
		JOIN issues blocker ON blocker.id = ir.blocking_issue_id
		WHERE ir.blocked_issue_id = $1 AND blocker.status = $2`

	var count int
	if err := p.db.QueryRow(query, issueID, domain.IssueStatusOpen).Scan(&count); err != nil {
		return 0, err
	}

	return count, nil
}
