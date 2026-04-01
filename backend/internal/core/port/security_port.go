package port

import "time"

// PasswordHasher abstracts password hashing algorithms away from usecases.
type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash string, password string) error
}

// TokenManager abstracts token generation details (for example JWT).
type TokenManager interface {
	GenerateToken(userID string, username string, expiresAt time.Time) (string, error)
}
