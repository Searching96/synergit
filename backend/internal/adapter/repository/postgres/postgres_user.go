package postgres

import (
	"database/sql"
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/boundary/output"

	"github.com/google/uuid"
)

var _ output.UserRepository = (*PostgresUserStore)(nil)

type PostgresUserStore struct {
	db *sql.DB
}

func NewPostgresUserStore(db *sql.DB) *PostgresUserStore {
	return &PostgresUserStore{db: db}
}

func (p *PostgresUserStore) CreateUser(user *domain.User) error {
	query := `
		INSERT INTO users(username, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`

	err := p.db.QueryRow(query, user.Username, user.Email, user.PasswordHash).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	return err
}

func (p *PostgresUserStore) GetUserByUserName(username string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, created_at, updated_at
		FROM users
		WHERE username = $1`

	user := &domain.User{}
	err := p.db.QueryRow(query, username).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return user, nil
}

func (p *PostgresUserStore) GetUserByEmail(email string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1`

	user := &domain.User{}
	err := p.db.QueryRow(query, email).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return user, nil
}

func (p *PostgresUserStore) GetUserByID(id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, created_at, updated_at
		FROM users
		WHERE id = $1`

	user := &domain.User{}
	err := p.db.QueryRow(query, id).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return user, nil
}


func (p *PostgresUserStore) UpdateUsername(id uuid.UUID, newUsername string) error {
	_, err := p.db.Exec(`UPDATE users SET username = $1 WHERE id = $2`, newUsername, id)
	return err
}

func (p *PostgresUserStore) UpdateRepoPathsForUser(oldUsername, newUsername string) error {
	_, err := p.db.Exec(`
		UPDATE repositories 
		SET path = regexp_replace(
			path, 
			'([/\\])' || $2 || '([/\\][^/\\]+)$', 
			'\1' || $1 || '\2'
		) 
		WHERE path ~ ('[/\\]' || $2 || '[/\\][^/\\]+$')
	`, newUsername, oldUsername)
	return err
}

func (p *PostgresUserStore) SearchUsers(query string, limit int) ([]*domain.User, error) {
	sqlQuery := `
		SELECT id, username, email, password_hash, created_at, updated_at
		FROM users
		WHERE username ILIKE '%' || $1 || '%'
		LIMIT $2`

	rows, err := p.db.Query(sqlQuery, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		if err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
