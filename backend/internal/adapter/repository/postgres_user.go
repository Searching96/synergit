package repository

import (
	"database/sql"
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"
)

var _ port.UserRepository = (*PostgresUserAdapter)(nil)

type PostgresUserAdapter struct {
	db *sql.DB
}

func NewPostgresUserAdapter(db *sql.DB) *PostgresUserAdapter {
	return &PostgresUserAdapter{db: db}
}

func (p *PostgresUserAdapter) CreateUser(user *domain.User) error {
	query := `
		INSERT INTO users(username, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`

	err := p.db.QueryRow(query, user.Username, user.Email, user.PasswordHash).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	return err
}

func (p *PostgresUserAdapter) GetUserByUserName(username string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, craeted_at, updated_at
		FROM users
		WHERE username = $1`

	user := &domain.User{}
	err := p.db.QueryRow(query, username).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user, user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return user, nil
}

func (p *PostgresUserAdapter) GetUserByEmail(email string) (*domain.User, error) {
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
