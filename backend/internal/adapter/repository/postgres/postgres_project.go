package postgres

import (
	"database/sql"
	"errors"
	"fmt"
	"synergit/internal/core/boundary/output"
	"synergit/internal/core/domain"

	"github.com/google/uuid"
)

var _ output.ProjectRepository = (*PostgresProjectStore)(nil)

type PostgresProjectStore struct {
	db *sql.DB
}

func NewPostgresProjectStore(db *sql.DB) *PostgresProjectStore {
	store := &PostgresProjectStore{db: db}
	store.ensureProjectSchema()
	return store
}

func (p *PostgresProjectStore) ensureProjectSchema() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS projects (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			number INTEGER NOT NULL,
			title VARCHAR(255) NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (owner_id, number)
		)`,
		`CREATE TABLE IF NOT EXISTS project_views (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			layout VARCHAR(32) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS project_items (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			content_type VARCHAR(32) NOT NULL,
			content_id UUID NOT NULL,
			status VARCHAR(255) NOT NULL DEFAULT '',
			start_date TIMESTAMPTZ,
			target_date TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (project_id, content_type, content_id)
		)`,
	}

	for _, query := range queries {
		_, _ = p.db.Exec(query)
	}
}

// Project Methods

func (p *PostgresProjectStore) CreateProject(project *domain.Project) error {
	tx, err := p.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`LOCK TABLE projects IN EXCLUSIVE MODE`); err != nil {
		return err
	}

	if err := tx.QueryRow(`
		SELECT COALESCE(MAX(number), 0) + 1
		FROM projects
		WHERE owner_id = $1`, project.OwnerID).Scan(&project.Number); err != nil {
		return err
	}

	query := `
		INSERT INTO projects (id, owner_id, number, title, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	if _, err := tx.Exec(query, project.ID, project.OwnerID, project.Number, project.Title,
		project.Description, project.CreatedAt, project.UpdatedAt); err != nil {
		return err
	}

	return tx.Commit()
}

func (p *PostgresProjectStore) GetProjectByID(id uuid.UUID) (*domain.Project, error) {
	query := `
		SELECT id, owner_id, number, title, description, created_at, updated_at
		FROM projects
		WHERE id = $1`

	var project domain.Project
	err := p.db.QueryRow(query, id).Scan(
		&project.ID, &project.OwnerID, &project.Number, &project.Title,
		&project.Description, &project.CreatedAt, &project.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (p *PostgresProjectStore) GetProjectByNumber(ownerID uuid.UUID, number int) (*domain.Project, error) {
	query := `
		SELECT id, owner_id, number, title, description, created_at, updated_at
		FROM projects
		WHERE owner_id = $1 AND number = $2`

	var project domain.Project
	err := p.db.QueryRow(query, ownerID, number).Scan(
		&project.ID, &project.OwnerID, &project.Number, &project.Title,
		&project.Description, &project.CreatedAt, &project.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (p *PostgresProjectStore) ListProjectsByOwner(ownerID uuid.UUID) ([]domain.Project, error) {
	query := `
		SELECT id, owner_id, number, title, description, created_at, updated_at
		FROM projects
		WHERE owner_id = $1
		ORDER BY created_at DESC`

	rows, err := p.db.Query(query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []domain.Project
	for rows.Next() {
		var project domain.Project
		if err := rows.Scan(&project.ID, &project.OwnerID, &project.Number, &project.Title,
			&project.Description, &project.CreatedAt, &project.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return projects, nil
}

func (p *PostgresProjectStore) UpdateProject(project *domain.Project) error {
	query := `
		UPDATE projects
		SET title = $1, description = $2, updated_at = NOW()
		WHERE id = $3`

	_, err := p.db.Exec(query, project.Title, project.Description, project.ID)
	return err
}

func (p *PostgresProjectStore) DeleteProject(id uuid.UUID) error {
	query := `DELETE FROM projects WHERE id = $1`
	_, err := p.db.Exec(query, id)
	return err
}

// Project View Methods

func (p *PostgresProjectStore) CreateView(view *domain.ProjectView) error {
	query := `
		INSERT INTO project_views (id, project_id, name, layout, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := p.db.Exec(query, view.ID, view.ProjectID, view.Name, string(view.Layout),
		view.CreatedAt, view.UpdatedAt)
	return err
}

func (p *PostgresProjectStore) GetViewById(id uuid.UUID) (*domain.ProjectView, error) {
	query := `
		SELECT id, project_id, name, layout, created_at, updated_at
		FROM project_views
		WHERE id = $1`

	var view domain.ProjectView
	err := p.db.QueryRow(query, id).Scan(
		&view.ID, &view.ProjectID, &view.Name, &view.Layout,
		&view.CreatedAt, &view.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &view, nil
}

func (p *PostgresProjectStore) ListViewsByProject(projectID uuid.UUID) ([]domain.ProjectView, error) {
	query := `
		SELECT id, project_id, name, layout, created_at, updated_at
		FROM project_views
		WHERE project_id = $1
		ORDER BY created_at ASC`

	rows, err := p.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var views []domain.ProjectView
	for rows.Next() {
		var view domain.ProjectView
		if err := rows.Scan(&view.ID, &view.ProjectID, &view.Name, &view.Layout,
			&view.CreatedAt, &view.UpdatedAt); err != nil {
			return nil, err
		}
		views = append(views, view)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return views, nil
}

func (p *PostgresProjectStore) UpdateView(view *domain.ProjectView) error {
	query := `
		UPDATE project_views
		SET name = $1, layout = $2, updated_at = NOW()
		WHERE id = $3`
	_, err := p.db.Exec(query, view.Name, string(view.Layout), view.ID)
	return err
}

func (p *PostgresProjectStore) DeleteView(id uuid.UUID) error {
	query := `DELETE FROM project_views WHERE id = $1`
	_, err := p.db.Exec(query, id)
	return err
}

// Project Item Methods

func (p *PostgresProjectStore) AddItem(item *domain.ProjectItem) error {
	query := `
		INSERT INTO project_items (id, project_id, content_type, content_id, status, start_date, target_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := p.db.Exec(query, item.ID, item.ProjectID, string(item.ContentType), item.ContentID,
		item.Status, item.StartDate, item.TargetDate, item.CreatedAt, item.UpdatedAt)
	return err
}

func (p *PostgresProjectStore) GetItemById(id uuid.UUID) (*domain.ProjectItem, error) {
	query := `
		SELECT id, project_id, content_type, content_id, status, start_date, target_date, created_at, updated_at
		FROM project_items
		WHERE id = $1`

	var item domain.ProjectItem
	err := p.db.QueryRow(query, id).Scan(
		&item.ID, &item.ProjectID, &item.ContentType, &item.ContentID,
		&item.Status, &item.StartDate, &item.TargetDate,
		&item.CreatedAt, &item.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (p *PostgresProjectStore) ListItemsByProject(projectID uuid.UUID) ([]domain.ProjectItemDTO, error) {
	// This query joins the project_items with either issues or pull_requests
	// and calculates their repo-local sequence numbers for display.
	query := `
		WITH issue_numbered AS (
			SELECT id, repo_id, title, creator_id,
			ROW_NUMBER() OVER (PARTITION BY repo_id ORDER BY created_at ASC) AS item_number
			FROM issues
		),
		pr_numbered AS (
			SELECT id, repo_id, title, creator_id,
			ROW_NUMBER() OVER (PARTITION BY repo_id ORDER BY created_at ASC) AS item_number
			FROM pull_requests
		)
		SELECT 
			pi.id, pi.project_id, pi.content_type, pi.content_id, pi.status, 
			pi.start_date, pi.target_date, pi.created_at, pi.updated_at,
			COALESCE(i.title, pr.title) as title,
			COALESCE(i.item_number, pr.item_number) as number,
			COALESCE(u_i.username, u_pr.username) as creator_name
		FROM project_items pi
		LEFT JOIN issue_numbered i ON pi.content_type = 'ISSUE' AND pi.content_id = i.id
		LEFT JOIN users u_i ON i.creator_id = u_i.id
		LEFT JOIN pr_numbered pr ON pi.content_type = 'PULL_REQUEST' AND pi.content_id = pr.id
		LEFT JOIN users u_pr ON pr.creator_id = u_pr.id
		WHERE pi.project_id = $1
		ORDER BY pi.created_at ASC`

	rows, err := p.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.ProjectItemDTO
	for rows.Next() {
		var dto domain.ProjectItemDTO
		var title sql.NullString
		var number sql.NullInt64
		var creatorName sql.NullString

		if err := rows.Scan(
			&dto.ID, &dto.ProjectID, &dto.ContentType, &dto.ContentID, &dto.Status,
			&dto.StartDate, &dto.TargetDate, &dto.CreatedAt, &dto.UpdatedAt,
			&title, &number, &creatorName,
		); err != nil {
			return nil, err
		}

		if title.Valid {
			dto.Title = title.String
		}
		if number.Valid {
			dto.Number = fmt.Sprintf("#%d", number.Int64)
		}
		if creatorName.Valid {
			dto.Avatar = creatorName.String
		}

		items = append(items, dto)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (p *PostgresProjectStore) UpdateItem(item *domain.ProjectItem) error {
	query := `
		UPDATE project_items
		SET status = $1, start_date = $2, target_date = $3, updated_at = NOW()
		WHERE id = $4`
	_, err := p.db.Exec(query, item.Status, item.StartDate, item.TargetDate, item.ID)
	return err
}

func (p *PostgresProjectStore) DeleteItem(id uuid.UUID) error {
	query := `DELETE FROM project_items WHERE id = $1`
	_, err := p.db.Exec(query, id)
	return err
}
