package security

import (
	"synergit/internal/core/port"

	"golang.org/x/crypto/bcrypt"
)

var _ port.PasswordHasher = (*BcryptPasswordHasher)(nil)

type BcryptPasswordHasher struct {
	cost int
}

func NewBcryptPasswordHasher(cost int) *BcryptPasswordHasher {
	if cost <= 0 {
		cost = bcrypt.DefaultCost
	}

	return &BcryptPasswordHasher{cost: cost}
}

func (h *BcryptPasswordHasher) Hash(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), h.cost)
	if err != nil {
		return "", err
	}

	return string(hashedPassword), nil
}

func (h *BcryptPasswordHasher) Compare(hash string, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
