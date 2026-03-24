package postgres

import (
	"database/sql"
	"errors"
	"synergit/internal/core/domain"
	"synergit/internal/core/port"

	"github.com/google/uuid"
)

var _ port.UserRepository = (*PostgresUserStore)(nil)

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
